/**
 * Croissant acceptance test (Manager Protocol §8)
 * Run: node scripts/test-croissant.mjs
 * Requires: npm run dev OR set BASE_URL
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  console.log("Croissant test @", BASE);

  await api("/api/ingredients", {
    method: "POST",
    body: JSON.stringify({ name: "Butter", unit: "g", stockQty: 5000, costPerUnit: 0.01 }),
  }).catch(() => {});
  await api("/api/ingredients", {
    method: "POST",
    body: JSON.stringify({ name: "Mehl", unit: "g", stockQty: 10000, costPerUnit: 0.002 }),
  }).catch(() => {});

  const products = await api("/api/products?all=true");
  let croissant = products.find((p) => p.name === "Croissant Test");
  if (!croissant) {
    const created = await api("/api/products", {
      method: "POST",
      body: JSON.stringify({
        name: "Croissant Test",
        category: "bakery",
        costPrice: 0.5,
        sellPrice: 2.5,
      }),
    });
    croissant = created;
  }

  const recipes = await api("/api/recipes?all=true").catch(() => []);
  const list = Array.isArray(recipes) ? recipes : recipes.items ?? [];
  let recipe = list.find((r) => r.name === "Croissant Test");
  if (!recipe) {
    recipe = await api("/api/recipes", {
      method: "POST",
      body: JSON.stringify({
        name: "Croissant Test",
        category: "bakery",
        sellPrice: 2.5,
        productId: croissant.id,
        ingredients: [
          { name: "Butter", quantity: 15, unit: "g", costPerUnit: 0.01 },
          { name: "Mehl", quantity: 40, unit: "g", costPerUnit: 0.002 },
        ],
      }),
    });
  } else if (!recipe.productId) {
    await api("/api/recipes", {
      method: "PUT",
      body: JSON.stringify({
        id: recipe.id,
        productId: croissant.id,
        ingredients: [
          { name: "Butter", quantity: 15, unit: "g", costPerUnit: 0.01 },
          { name: "Mehl", quantity: 40, unit: "g", costPerUnit: 0.002 },
        ],
      }),
    });
  }

  const key = `croissant-test-${Date.now()}`;
  const sale = await api("/api/sales/record", {
    method: "POST",
    body: JSON.stringify({ productId: croissant.id, qty: 1, idempotencyKey: key }),
  });
  console.log("Sale:", sale);

  const butter = (await api("/api/ingredients?unit=g")).find((i) => i.name === "Butter");
  const mehl = (await api("/api/ingredients?unit=g")).find((i) => i.name === "Mehl");
  console.log("Butter stock:", butter?.stockQty, "(expect ~4985)");
  console.log("Mehl stock:", mehl?.stockQty, "(expect ~9960)");

  const dup = await api("/api/sales/record", {
    method: "POST",
    body: JSON.stringify({ productId: croissant.id, qty: 1, idempotencyKey: key }),
  });
  if (!dup.idempotent) throw new Error("Idempotency failed");

  const today = await api("/api/manager/today");
  console.log("Today:", today);

  const ok =
    butter &&
    mehl &&
    butter.stockQty <= 4985.1 &&
    butter.stockQty >= 4984.9 &&
    mehl.stockQty <= 9960.1 &&
    mehl.stockQty >= 9959.9 &&
    today.revenue >= 2.5;

  if (!ok) {
    console.error("FAILED acceptance checks");
    process.exit(1);
  }
  console.log("PASSED Croissant test");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
