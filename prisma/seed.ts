import { PrismaClient } from "./generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

// ─── Helpers ─────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Day-of-week multiplier (0=Sun, 1=Mon ... 6=Sat)
const DOW_MULTIPLIER = [0.7, 0.6, 0.75, 0.85, 0.9, 1.0, 1.3];
const WEATHER_CONDITIONS = ["sunny", "cloudy", "rainy", "sunny", "cloudy", "sunny", "rainy", "cloudy", "sunny", "sunny"];
const TIME_SLOTS = ["morning", "midday", "afternoon", "evening"];
const SLOT_WEIGHTS = [0.4, 0.3, 0.2, 0.1];

async function main() {
  console.log("🌱 Seeding database...");

  // Clear all data
  await prisma.$transaction([
    prisma.menuPlanItem.deleteMany(),
    prisma.menuPlan.deleteMany(),
    prisma.promotion.deleteMany(),
    prisma.cleaningLog.deleteMany(),
    prisma.cleaningTask.deleteMany(),
    prisma.hACCPCheck.deleteMany(),
    prisma.hACCPTemplate.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.supplierProduct.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.recipeIngredient.deleteMany(),
    prisma.recipe.deleteMany(),
    prisma.laborEntry.deleteMany(),
    prisma.customerCount.deleteMany(),
    prisma.cashCount.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.revenueGoal.deleteMany(),
    prisma.checklistEntry.deleteMany(),
    prisma.checklistTemplate.deleteMany(),
    prisma.actionTracking.deleteMany(),
    prisma.suggestionFeedback.deleteMany(),
    prisma.suggestion.deleteMany(),
    prisma.dailySales.deleteMany(),
    prisma.wasteLog.deleteMany(),
    prisma.dayClose.deleteMany(),
    prisma.inventory.deleteMany(),
    prisma.staffSchedule.deleteMany(),
    prisma.staffMember.deleteMany(),
    prisma.localEvent.deleteMany(),
    prisma.weatherData.deleteMany(),
    prisma.emergencyLog.deleteMany(),
    prisma.tempLog.deleteMany(),
    prisma.competitorNote.deleteMany(),
    prisma.quickNote.deleteMany(),
    prisma.emergencyContact.deleteMany(),
    prisma.product.deleteMany(),
    prisma.tutorialProgress.deleteMany(),
    prisma.onboardingStatus.deleteMany(),
    prisma.shopSettings.deleteMany(),
    prisma.confidenceModifier.deleteMany(),
  ]);

  // ─── Shop Settings ──────────────────────────────────────

  await prisma.shopSettings.create({
    data: {
      shopName: "Café Bohne",
      openTime: "06:30",
      closeTime: "18:00",
      fixedCostsDaily: 420,
      strategyMode: "balanced",
      language: "de",
      darkMode: "auto",
      currentStreak: 12,
      longestStreak: 18,
      lastDataEntry: daysAgo(0),
    },
  });

  // ─── Products ───────────────────────────────────────────

  interface ProductDef {
    name: string;
    cost: number;
    sell: number;
    spoilage: number;
    seasonal?: boolean;
    months?: number[];
    baseDaily: number;
  }

  const productDefs: ProductDef[] = [
    { name: "Espresso", cost: 0.35, sell: 2.80, spoilage: 0, baseDaily: 35 },
    { name: "Cappuccino", cost: 0.55, sell: 3.80, spoilage: 0, baseDaily: 42 },
    { name: "Latte Macchiato", cost: 0.60, sell: 4.20, spoilage: 0, baseDaily: 28 },
    { name: "Filterkaffee", cost: 0.25, sell: 2.50, spoilage: 0, baseDaily: 50 },
    { name: "Americano", cost: 0.30, sell: 3.00, spoilage: 0, baseDaily: 15 },
    { name: "Croissant", cost: 0.45, sell: 2.50, spoilage: 24, baseDaily: 22 },
    { name: "Schoko-Muffin", cost: 0.50, sell: 2.80, spoilage: 48, baseDaily: 14 },
    { name: "Zimtschnecke", cost: 0.55, sell: 3.20, spoilage: 36, baseDaily: 10 },
    { name: "Bananenbrot", cost: 0.60, sell: 3.50, spoilage: 48, baseDaily: 8 },
    { name: "Avocado-Toast", cost: 1.20, sell: 6.50, spoilage: 12, baseDaily: 12 },
    { name: "Schinken-Käse Sandwich", cost: 1.00, sell: 5.50, spoilage: 24, baseDaily: 15 },
    { name: "Veggie Wrap", cost: 0.90, sell: 5.80, spoilage: 18, baseDaily: 10 },
    { name: "Tagessuppe", cost: 0.80, sell: 4.50, spoilage: 8, baseDaily: 8 },
    { name: "Heiße Schokolade", cost: 0.40, sell: 3.50, spoilage: 0, baseDaily: 12 },
    { name: "Frischer Orangensaft", cost: 1.00, sell: 4.50, spoilage: 4, baseDaily: 6 },
  ];

  const categoryMap: Record<string, string> = {
    Espresso: "coffee", Cappuccino: "coffee", "Latte Macchiato": "coffee",
    Filterkaffee: "coffee", Americano: "coffee",
    Croissant: "bakery", "Schoko-Muffin": "bakery", Zimtschnecke: "bakery", Bananenbrot: "bakery",
    "Avocado-Toast": "lunch", "Schinken-Käse Sandwich": "lunch", "Veggie Wrap": "lunch", Tagessuppe: "lunch",
    "Heiße Schokolade": "drinks", "Frischer Orangensaft": "drinks",
  };

  const products = [];
  for (let i = 0; i < productDefs.length; i++) {
    const def = productDefs[i];
    const p = await prisma.product.create({
      data: {
        name: def.name,
        category: categoryMap[def.name] || "other",
        costPrice: def.cost,
        sellPrice: def.sell,
        spoilageHours: def.spoilage || 9999,
        sortOrder: i,
      },
    });
    products.push({ ...p, baseDaily: def.baseDaily });
  }

  // ─── Staff ──────────────────────────────────────────────

  const staffDefs = [
    { name: "Max (Owner)", role: "manager", daysAgo: 365 },
    { name: "Julia", role: "barista", daysAgo: 200 },
    { name: "Thomas", role: "allrounder", daysAgo: 120 },
    { name: "Lisa", role: "barista", daysAgo: 5 }, // New employee!
  ];

  const staffMembers = [];
  for (const s of staffDefs) {
    const member = await prisma.staffMember.create({
      data: {
        name: s.name,
        role: s.role,
        startDate: daysAgo(s.daysAgo),
      },
    });
    staffMembers.push(member);
  }

  // Create weekly schedule template (last 30 days)
  for (let day = 0; day < 30; day++) {
    const date = daysAgo(day);
    const dow = date.getDay();
    if (dow === 0) continue; // Closed Sundays

    // Owner always works
    await prisma.staffSchedule.create({
      data: { staffId: staffMembers[0].id, date, startTime: "06:00", endTime: "14:00", role: "manager" },
    });

    // Julia works Mon-Fri
    if (dow >= 1 && dow <= 5) {
      await prisma.staffSchedule.create({
        data: { staffId: staffMembers[1].id, date, startTime: "06:30", endTime: "14:30", role: "barista" },
      });
    }

    // Thomas works Tue-Sat
    if (dow >= 2 && dow <= 6) {
      await prisma.staffSchedule.create({
        data: { staffId: staffMembers[2].id, date, startTime: "10:00", endTime: "18:00", role: "allrounder" },
      });
    }

    // Lisa works Wed-Sat (new, started 5 days ago)
    if (day <= 5 && dow >= 3 && dow <= 6) {
      await prisma.staffSchedule.create({
        data: { staffId: staffMembers[3].id, date, startTime: "08:00", endTime: "16:00", role: "barista" },
      });
    }
  }

  // ─── Weather Data (30 days) ─────────────────────────────

  for (let day = 0; day < 30; day++) {
    const date = daysAgo(day);
    const baseTemp = 5 + Math.sin((day / 30) * Math.PI) * 4; // Feb temps 1-9°C
    await prisma.weatherData.create({
      data: {
        date,
        tempHigh: Math.round((baseTemp + rand(2, 5)) * 10) / 10,
        tempLow: Math.round((baseTemp - rand(1, 3)) * 10) / 10,
        condition: pick(WEATHER_CONDITIONS),
        humidity: rand(50, 85),
      },
    });
  }

  // ─── Events ─────────────────────────────────────────────

  await prisma.localEvent.create({
    data: { name: "Wochenmarkt", date: daysAgo(3), expectedImpact: "medium", notes: "Jeden Samstag, bringt Laufkundschaft" },
  });
  await prisma.localEvent.create({
    data: { name: "Schulferien Ende", date: daysAgo(7), expectedImpact: "high", notes: "Familien zurück, mehr Kunden" },
  });
  await prisma.localEvent.create({
    data: { name: "Stadtfest", date: daysAgo(14), expectedImpact: "high", notes: "Großes Event, viel Laufkundschaft" },
  });

  // ─── Daily Sales (30 days) ──────────────────────────────

  for (let day = 1; day <= 30; day++) {
    const date = daysAgo(day);
    const dow = date.getDay();
    if (dow === 0) continue; // Closed Sundays

    const dowMult = DOW_MULTIPLIER[dow];
    // Events boost
    const eventBoost = (day === 14) ? 1.4 : (day === 3) ? 1.15 : 1.0;
    // Weather effect
    const weatherEffect = rand(85, 115) / 100;

    let dayRevenue = 0;
    let dayWaste = 0;

    for (const prod of products) {
      const baseQty = prod.baseDaily;
      const actualQty = Math.max(1, Math.round(baseQty * dowMult * eventBoost * weatherEffect * (rand(80, 120) / 100)));

      // Split across time slots
      for (let s = 0; s < TIME_SLOTS.length; s++) {
        const slotQty = Math.max(0, Math.round(actualQty * SLOT_WEIGHTS[s] * (rand(70, 130) / 100)));
        if (slotQty > 0) {
          const revenue = slotQty * prod.sellPrice;
          dayRevenue += revenue;
          await prisma.dailySales.create({
            data: { productId: prod.id, date, quantity: slotQty, revenue, timeSlot: TIME_SLOTS[s] },
          });
        }
      }

      // Waste (bakery and lunch items only)
      if (prod.spoilageHours > 0 && prod.spoilageHours < 9999) {
        const preparedExtra = Math.round(baseQty * dowMult * 1.15); // Always prepare 15% extra
        const sold = Math.round(baseQty * dowMult * eventBoost * weatherEffect);
        const wasted = Math.max(0, preparedExtra - sold + rand(-2, 3));
        if (wasted > 0) {
          dayWaste += wasted * prod.costPrice;
          await prisma.wasteLog.create({
            data: { productId: prod.id, date, quantity: wasted, reason: pick(["overproduction", "expired", "overproduction"]) },
          });
        }
      }
    }

    // Day Close
    await prisma.dayClose.create({
      data: {
        date,
        totalRevenue: Math.round(dayRevenue * 100) / 100,
        totalWaste: Math.round(dayWaste * 100) / 100,
        dayRating: dayRevenue > 550 ? "good" : dayRevenue > 400 ? "normal" : "weak",
        quickNote: day === 14 ? "Stadtfest — extrem viel los" : day === 20 ? "Baustelle vor der Tür" : undefined,
      },
    });
  }

  // ─── Inventory (current) ────────────────────────────────

  for (const prod of products) {
    const baseStock = prod.spoilageHours > 0 && prod.spoilageHours < 9999
      ? rand(3, 15)
      : rand(20, 100);
    await prisma.inventory.create({
      data: {
        productId: prod.id,
        quantity: baseStock,
        unit: prod.category === "drinks" ? "liters" : "pieces",
        expiresAt: prod.spoilageHours > 0 && prod.spoilageHours < 9999
          ? new Date(Date.now() + prod.spoilageHours * 3600 * 1000 * (rand(30, 100) / 100))
          : undefined,
      },
    });
  }

  // ─── Emergency Logs ─────────────────────────────────────

  await prisma.emergencyLog.create({
    data: {
      type: "equipment",
      description: "Kaffeemühle blockiert — 30 Min Ausfall",
      affectedEquipment: "Kaffeemühle",
      severity: "medium",
      status: "resolved",
      resolvedAt: daysAgo(8),
      createdAt: daysAgo(8),
    },
  });
  await prisma.emergencyLog.create({
    data: {
      type: "vendor",
      description: "Milchlieferung 3 Stunden zu spät",
      severity: "low",
      status: "resolved",
      resolvedAt: daysAgo(15),
      createdAt: daysAgo(15),
    },
  });

  // ─── Checklist Templates ────────────────────────────────

  const checklistItems: { text: string; group: string; notes?: string }[] = [
    { text: "Kaffeemaschine aufwärmen", group: "Vor dem Öffnen", notes: "Mind. 20 Min. Aufwärmzeit" },
    { text: "Milch auffüllen", group: "Vor dem Öffnen" },
    { text: "Theke bestücken", group: "Vor dem Öffnen" },
    { text: "Kühltemperatur prüfen", group: "Vor dem Öffnen" },
    { text: "Kasse öffnen", group: "Vor dem Öffnen", notes: "Wechselgeld prüfen" },
    { text: "Boden wischen", group: "Hygiene" },
    { text: "Hände waschen", group: "Hygiene" },
    { text: "Arbeitsoberflächen desinfizieren", group: "Hygiene" },
    { text: "Kaffeemühle einstellen", group: "Maschinen" },
    { text: "Espressomaschine Testbezug", group: "Maschinen" },
    { text: "Milchaufschäumer reinigen", group: "Maschinen" },
    { text: "Backwaren-Bestand prüfen", group: "Bestand" },
    { text: "Frischware-Bestand prüfen", group: "Bestand" },
    { text: "Auslagen-Display aufbauen", group: "Bestand" },
  ];

  for (let i = 0; i < checklistItems.length; i++) {
    await prisma.checklistTemplate.create({
      data: {
        text: checklistItems[i].text,
        group: checklistItems[i].group,
        sortOrder: i,
        notes: checklistItems[i].notes ?? undefined,
      },
    });
  }

  // ─── Temperature Logs ───────────────────────────────────

  for (let day = 0; day < 14; day++) {
    const date = daysAgo(day);
    // Morning reading
    await prisma.tempLog.create({
      data: {
        equipment: "Kühlschrank 1",
        temperature: 3.5 + Math.random() * 2,
        inRange: true,
        recordedAt: new Date(date.getTime() + 6 * 3600000),
      },
    });
    // Evening reading
    await prisma.tempLog.create({
      data: {
        equipment: "Kühlschrank 1",
        temperature: 4.0 + Math.random() * 2,
        inRange: true,
        recordedAt: new Date(date.getTime() + 18 * 3600000),
      },
    });
  }

  // ─── Emergency Contacts ─────────────────────────────────

  await prisma.emergencyContact.createMany({
    data: [
      { name: "Kälte-Müller GmbH", role: "technician", phone: "+49 170 1234567" },
      { name: "Elektro-Schmidt", role: "electrician", phone: "+49 170 2345678" },
      { name: "Bio-Lieferant Meier", role: "supplier", phone: "+49 170 3456789" },
    ],
  });

  // ─── Competitor Note ────────────────────────────────────

  await prisma.competitorNote.create({
    data: {
      competitorName: "Café Sonnenschein",
      event: "promo",
      notes: "Haben diese Woche 2-für-1 auf Cappuccino",
      impactEstimate: "medium",
      date: daysAgo(2),
    },
  });

  // ─── Tutorial & Onboarding ──────────────────────────────

  await prisma.tutorialProgress.create({
    data: { id: "singleton", stepsCompleted: "[]", isCompleted: false },
  });
  await prisma.onboardingStatus.create({
    data: { id: "singleton", currentStep: 0, isCompleted: true, completedAt: daysAgo(30) },
  });

  // ─── Confidence Modifiers ───────────────────────────────

  const types = ["demand", "inventory", "pricing", "timing", "risk", "reverse", "breakeven", "tomorrow", "waste", "special", "social", "reorder", "cost", "rush"];
  for (const t of types) {
    await prisma.confidenceModifier.create({
      data: { suggestionType: t, modifier: rand(-5, 10), consecutiveFails: rand(0, 1) },
    });
  }

  // ─── Quick Notes ────────────────────────────────────────

  await prisma.quickNote.create({
    data: { date: daysAgo(20), text: "Baustelle vor der Tür — weniger Laufkundschaft" },
  });
  await prisma.quickNote.create({
    data: { date: daysAgo(5), text: "Viele Touristen heute im Viertel" },
  });

  // ─── Cash Counts (last 7 days) ────────────────────────
  for (let day = 1; day <= 7; day++) {
    const date = daysAgo(day);
    if (date.getDay() === 0) continue;
    await prisma.cashCount.create({
      data: {
        date,
        openAmount: 200,
        closeAmount: rand(350, 550),
        cardTotal: rand(150, 300),
        tipTotal: rand(10, 35),
        difference: rand(-5, 15),
      },
    });
  }

  // ─── Expenses ────────────────────────────────────────
  const expCategories = ["miete", "strom", "personal", "waren", "versicherung", "werbung"];
  await prisma.expense.create({ data: { date: daysAgo(1), category: "miete", amount: 1800, description: "Monatsmiete", isRecurring: true, frequency: "monthly" } });
  await prisma.expense.create({ data: { date: daysAgo(3), category: "strom", amount: 320, description: "Stromrechnung", isRecurring: true, frequency: "monthly" } });
  await prisma.expense.create({ data: { date: daysAgo(5), category: "personal", amount: 4200, description: "Gehaelter", isRecurring: true, frequency: "monthly" } });
  await prisma.expense.create({ data: { date: daysAgo(2), category: "waren", amount: 890, description: "Bio-Lieferant Meier" } });
  await prisma.expense.create({ data: { date: daysAgo(7), category: "werbung", amount: 150, description: "Instagram Ads" } });
  await prisma.expense.create({ data: { date: daysAgo(10), category: "versicherung", amount: 180, description: "Betriebshaftpflicht", isRecurring: true, frequency: "monthly" } });

  // ─── Revenue Goal ────────────────────────────────────
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  await prisma.revenueGoal.create({
    data: { period: "monthly", targetAmount: 15000, actualAmount: 8750, startDate: monthStart, endDate: monthEnd, isActive: true },
  });

  // ─── Recipes ─────────────────────────────────────────
  const cappRecipe = await prisma.recipe.create({
    data: { name: "Cappuccino", category: "coffee", sellPrice: 3.80 },
  });
  await prisma.recipeIngredient.createMany({
    data: [
      { recipeId: cappRecipe.id, name: "Espresso (Bohnen)", quantity: 18, unit: "g", costPerUnit: 0.012 },
      { recipeId: cappRecipe.id, name: "Milch", quantity: 150, unit: "ml", costPerUnit: 0.0015 },
    ],
  });
  const avoRecipe = await prisma.recipe.create({
    data: { name: "Avocado-Toast", category: "lunch", sellPrice: 6.50 },
  });
  await prisma.recipeIngredient.createMany({
    data: [
      { recipeId: avoRecipe.id, name: "Avocado", quantity: 1, unit: "stk", costPerUnit: 0.50 },
      { recipeId: avoRecipe.id, name: "Sauerteigbrot", quantity: 2, unit: "stk", costPerUnit: 0.15 },
      { recipeId: avoRecipe.id, name: "Tomate", quantity: 0.5, unit: "stk", costPerUnit: 0.20 },
      { recipeId: avoRecipe.id, name: "Gewuerze/Oel", quantity: 1, unit: "stk", costPerUnit: 0.10 },
    ],
  });

  // ─── Suppliers ───────────────────────────────────────
  const supplier1 = await prisma.supplier.create({
    data: { name: "Bio-Lieferant Meier", contactPerson: "Hans Meier", phone: "+49 170 3456789", email: "hans@bio-meier.de", deliveryDays: '["Mo","Mi","Fr"]' },
  });
  await prisma.supplierProduct.createMany({
    data: [
      { supplierId: supplier1.id, productName: "Bio-Milch 10L", unit: "l", pricePerUnit: 1.40 },
      { supplierId: supplier1.id, productName: "Espresso Bohnen 1kg", unit: "kg", pricePerUnit: 18.50 },
    ],
  });
  const supplier2 = await prisma.supplier.create({
    data: { name: "Baeckerei Goldkorn", contactPerson: "Petra Gold", phone: "+49 170 4567890", deliveryDays: '["Di","Do","Sa"]' },
  });
  await prisma.supplierProduct.createMany({
    data: [
      { supplierId: supplier2.id, productName: "Croissants (10er)", unit: "stk", pricePerUnit: 0.42 },
      { supplierId: supplier2.id, productName: "Muffins (12er)", unit: "stk", pricePerUnit: 0.48 },
    ],
  });

  // ─── Purchase Orders ─────────────────────────────────
  const po1 = await prisma.purchaseOrder.create({
    data: { supplierId: supplier1.id, status: "delivered", totalAmount: 55.50, deliveryDate: daysAgo(2) },
  });
  await prisma.purchaseOrderItem.create({
    data: { orderId: po1.id, productName: "Bio-Milch 10L", quantity: 3, unit: "l", pricePerUnit: 1.40, totalPrice: 42 },
  });
  const po2 = await prisma.purchaseOrder.create({
    data: { supplierId: supplier2.id, status: "ordered", totalAmount: 21.60 },
  });
  await prisma.purchaseOrderItem.create({
    data: { orderId: po2.id, productName: "Croissants (10er)", quantity: 3, unit: "stk", pricePerUnit: 4.20, totalPrice: 12.60 },
  });

  // ─── HACCP Templates + Checks ────────────────────────
  const haccpTemplates = [
    { name: "Kuehlschrank 1 Temperatur", category: "temperatur", frequency: "daily" },
    { name: "Kuehlschrank 2 Temperatur", category: "temperatur", frequency: "daily" },
    { name: "Wareneingang Kontrolle", category: "empfang", frequency: "per_delivery" },
    { name: "Arbeitsflaechen Desinfektion", category: "reinigung", frequency: "daily" },
    { name: "Personalhygiene Check", category: "sonstiges", frequency: "daily" },
  ];
  for (const t of haccpTemplates) {
    const template = await prisma.hACCPTemplate.create({ data: t });
    for (let day = 0; day < 14; day++) {
      if (daysAgo(day).getDay() === 0) continue;
      await prisma.hACCPCheck.create({
        data: {
          templateId: template.id,
          date: daysAgo(day),
          value: t.category === "temperatur" ? `${(3 + Math.random() * 3).toFixed(1)}` : "OK",
          isCompliant: Math.random() > 0.05,
          performedBy: pick(["Max", "Julia", "Thomas"]),
        },
      });
    }
  }

  // ─── Cleaning Tasks + Logs ───────────────────────────
  const cleaningTasks = [
    { name: "Boden wischen", area: "gastraum" },
    { name: "Theke reinigen", area: "theke" },
    { name: "Kaffeemaschine reinigen", area: "theke" },
    { name: "Kuehlschrank reinigen", area: "kueche" },
    { name: "WC reinigen", area: "wc" },
    { name: "Lager aufraumen", area: "lager" },
  ];
  for (const ct of cleaningTasks) {
    const task = await prisma.cleaningTask.create({ data: { ...ct, frequency: "daily" } });
    for (let day = 0; day < 7; day++) {
      if (daysAgo(day).getDay() === 0) continue;
      await prisma.cleaningLog.create({
        data: { taskId: task.id, date: daysAgo(day), completedBy: pick(["Max", "Julia", "Thomas"]) },
      });
    }
  }

  // ─── Customer Counts ─────────────────────────────────
  for (let day = 1; day <= 14; day++) {
    const date = daysAgo(day);
    if (date.getDay() === 0) continue;
    const dowMult = DOW_MULTIPLIER[date.getDay()];
    for (let hour = 7; hour <= 17; hour++) {
      const count = Math.max(0, Math.round(12 * dowMult * (hour >= 8 && hour <= 10 ? 1.5 : hour >= 12 && hour <= 13 ? 1.2 : 0.7) * (rand(70, 130) / 100)));
      if (count > 0) {
        await prisma.customerCount.create({ data: { date, hour, count } });
      }
    }
  }

  // ─── Labor Entries ───────────────────────────────────
  for (let day = 1; day <= 14; day++) {
    const date = daysAgo(day);
    if (date.getDay() === 0) continue;
    for (const sm of staffMembers) {
      if (day > 5 && sm.name === "Lisa") continue;
      await prisma.laborEntry.create({
        data: { staffId: sm.id, date, hoursWorked: rand(6, 8), hourlyWage: sm.role === "manager" ? 0 : 13.50, totalCost: sm.role === "manager" ? 0 : 13.50 * rand(6, 8) },
      });
    }
  }

  // ─── Promotions ──────────────────────────────────────
  await prisma.promotion.create({
    data: { name: "Happy Hour Mittwoch", description: "Alle Kaffeespezialitaeten -20%", type: "happy_hour", startDate: daysAgo(14), endDate: daysAgo(7), discount: 20, isActive: false },
  });
  await prisma.promotion.create({
    data: { name: "Valentinstag Special", description: "2-fuer-1 auf Heisse Schokolade", type: "bundle", startDate: daysAgo(1), endDate: new Date(Date.now() + 3 * 86400000), discount: 50, isActive: true },
  });

  // ─── Menu Plans ──────────────────────────────────────
  const winterPlan = await prisma.menuPlan.create({
    data: { name: "Winter 2025/26", season: "winter", startDate: new Date(2025, 11, 1), endDate: new Date(2026, 1, 28), isActive: true },
  });
  await prisma.menuPlanItem.createMany({
    data: [
      { planId: winterPlan.id, productName: "Heisse Schokolade", category: "drinks", sellPrice: 3.50 },
      { planId: winterPlan.id, productName: "Gluehwein", category: "drinks", sellPrice: 4.00, isNew: true },
      { planId: winterPlan.id, productName: "Zimtschnecke", category: "bakery", sellPrice: 3.20 },
    ],
  });

  console.log("✅ Database seeded successfully!");
  console.log(`   ${products.length} products`);
  console.log(`   ${staffMembers.length} staff members`);
  console.log("   30 days of sales, weather, and waste data");
  console.log("   + Recipes, Suppliers, HACCP, Cleaning, Expenses, Cash");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
