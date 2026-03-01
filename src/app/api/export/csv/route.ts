import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") || "sales";
    const month = req.nextUrl.searchParams.get("month");

    let csvContent = "";

    if (type === "sales") {
      const where = month ? {
        date: {
          gte: new Date(`${month}-01`),
          lt: new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)),
        },
      } : {};
      const sales = await prisma.dailySales.findMany({
        where,
        include: { product: true },
        orderBy: { date: "desc" },
      });
      csvContent = "Datum;Produkt;Menge;Umsatz;Zeitslot\n";
      for (const s of sales) {
        csvContent += `${s.date.toISOString().split("T")[0]};${s.product.name};${s.quantity};${s.revenue.toFixed(2)};${s.timeSlot || ""}\n`;
      }
    } else if (type === "expenses") {
      const where = month ? {
        date: {
          gte: new Date(`${month}-01`),
          lt: new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)),
        },
      } : {};
      const expenses = await prisma.expense.findMany({ where, orderBy: { date: "desc" } });
      csvContent = "Datum;Kategorie;Betrag;Beschreibung;Wiederkehrend\n";
      for (const e of expenses) {
        csvContent += `${e.date.toISOString().split("T")[0]};${e.category};${e.amount.toFixed(2)};${e.description || ""};${e.isRecurring ? "Ja" : "Nein"}\n`;
      }
    } else if (type === "waste") {
      const where = month ? {
        date: {
          gte: new Date(`${month}-01`),
          lt: new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1)),
        },
      } : {};
      const waste = await prisma.wasteLog.findMany({
        where,
        include: { product: true },
        orderBy: { date: "desc" },
      });
      csvContent = "Datum;Produkt;Menge;Grund\n";
      for (const w of waste) {
        csvContent += `${w.date.toISOString().split("T")[0]};${w.product.name};${w.quantity};${w.reason || ""}\n`;
      }
    } else if (type === "haccp") {
      const checks = await prisma.hACCPCheck.findMany({
        include: { template: true },
        orderBy: { date: "desc" },
        take: 500,
      });
      csvContent = "Datum;Kontrolle;Kategorie;Wert;Konform;Notizen;Pruefer\n";
      for (const c of checks) {
        csvContent += `${c.date.toISOString().split("T")[0]};${c.template.name};${c.template.category};${c.value};${c.isCompliant ? "Ja" : "Nein"};${c.notes || ""};${c.performedBy || ""}\n`;
      }
    } else if (type === "dayclose") {
      const closes = await prisma.dayClose.findMany({ orderBy: { date: "desc" }, take: 90 });
      csvContent = "Datum;Umsatz;Waste;Bewertung;Notizen\n";
      for (const d of closes) {
        csvContent += `${d.date.toISOString().split("T")[0]};${d.totalRevenue.toFixed(2)};${d.totalWaste.toFixed(2)};${d.dayRating || ""};${d.notes || ""}\n`;
      }
    }

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="coffeeflow-${type}-export.csv"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
