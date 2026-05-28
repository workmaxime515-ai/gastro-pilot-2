import { prisma } from "@/lib/db";

/** Wipes manager ledger data and daily suggestions — no re-seed. */
export async function blankResetManagerData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.$transaction([
    prisma.inventoryLedger.deleteMany(),
    prisma.financeLedger.deleteMany(),
    prisma.saleEvent.deleteMany(),
    prisma.managerAlert.deleteMany(),
    prisma.ingredient.deleteMany(),
    prisma.dailySales.deleteMany(),
    prisma.suggestion.deleteMany({ where: { date: { gte: today } } }),
  ]);
}

export async function isBlankShop(): Promise<boolean> {
  const [sales, ingredients] = await Promise.all([
    prisma.saleEvent.count(),
    prisma.ingredient.count(),
  ]);
  return sales === 0 && ingredients === 0;
}
