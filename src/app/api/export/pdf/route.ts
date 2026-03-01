import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsPDF } from "jspdf";

function addHeader(doc: jsPDF, title: string) {
  doc.setDrawColor(198, 156, 114);
  doc.setLineWidth(0.5);
  doc.line(20, 15, 190, 15);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(31, 26, 23);
  doc.text("CoffeeFlow", 20, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(122, 110, 99);
  doc.text(`${title} | ${new Date().toLocaleDateString("de-DE")}`, 20, 32);

  doc.line(20, 36, 190, 36);
}

function addFooter(doc: jsPDF, page: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(122, 110, 99);
  doc.text(`Seite ${page} | CoffeeFlow — Dein Entscheidungshelfer`, 105, 290, { align: "center" });
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(31, 26, 23);
  doc.text(title, 20, y);
  return y + 8;
}

function addKPIBox(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFillColor(247, 243, 238);
  doc.roundedRect(x, y, 50, 22, 3, 3, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(122, 110, 99);
  doc.text(label, x + 4, y + 8);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(31, 26, 23);
  doc.text(value, x + 4, y + 18);
}

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") || "weekly";
    const doc = new jsPDF();
    let page = 1;

    if (type === "weekly") {
      addHeader(doc, "Wochenbericht");
      addFooter(doc, page);

      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const [dayCloses, expenses, wasteLogs] = await Promise.all([
        prisma.dayClose.findMany({ where: { date: { gte: weekStart, lt: weekEnd } }, orderBy: { date: "asc" } }),
        prisma.expense.findMany({ where: { date: { gte: weekStart, lt: weekEnd } } }),
        prisma.wasteLog.findMany({ where: { date: { gte: weekStart, lt: weekEnd } }, include: { product: true } }),
      ]);

      const totalRevenue = dayCloses.reduce((s, d) => s + d.totalRevenue, 0);
      const totalWaste = dayCloses.reduce((s, d) => s + d.totalWaste, 0);
      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
      const profit = totalRevenue - totalExpenses - totalWaste;

      let y = 44;
      addKPIBox(doc, "Umsatz", `${totalRevenue.toFixed(0)} EUR`, 20, y);
      addKPIBox(doc, "Ausgaben", `${totalExpenses.toFixed(0)} EUR`, 75, y);
      addKPIBox(doc, "Waste", `${totalWaste.toFixed(0)} EUR`, 130, y);
      y += 30;

      addKPIBox(doc, "Gewinn", `${profit.toFixed(0)} EUR`, 20, y);
      addKPIBox(doc, "Tage erfasst", `${dayCloses.length}`, 75, y);
      if (dayCloses.length > 0) {
        addKPIBox(doc, "Schnitt/Tag", `${(totalRevenue / dayCloses.length).toFixed(0)} EUR`, 130, y);
      }
      y += 36;

      y = addSectionTitle(doc, "Tagesuebersicht", y);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(122, 110, 99);
      doc.text("Datum", 20, y);
      doc.text("Umsatz", 70, y);
      doc.text("Waste", 110, y);
      doc.text("Bewertung", 150, y);
      y += 5;
      doc.setDrawColor(230, 225, 220);
      doc.line(20, y, 190, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(31, 26, 23);
      for (const d of dayCloses) {
        doc.text(d.date.toLocaleDateString("de-DE"), 20, y);
        doc.text(`${d.totalRevenue.toFixed(0)} EUR`, 70, y);
        doc.text(`${d.totalWaste.toFixed(0)} EUR`, 110, y);
        doc.text(d.dayRating ?? "—", 150, y);
        y += 6;
        if (y > 270) { doc.addPage(); page++; addFooter(doc, page); y = 20; }
      }

      if (wasteLogs.length > 0) {
        y += 6;
        y = addSectionTitle(doc, "Waste-Details", y);
        const wasteByProduct = new Map<string, number>();
        for (const w of wasteLogs) {
          wasteByProduct.set(w.product.name, (wasteByProduct.get(w.product.name) ?? 0) + w.quantity);
        }
        const sorted = [...wasteByProduct.entries()].sort((a, b) => b[1] - a[1]);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        for (const [name, qty] of sorted.slice(0, 10)) {
          doc.text(`${name}: ${qty} Stueck`, 20, y);
          y += 5;
        }
      }
    } else if (type === "monthly") {
      addHeader(doc, "Monatsbericht");
      addFooter(doc, page);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const dayCloses = await prisma.dayClose.findMany({
        where: { date: { gte: monthStart, lt: monthEnd } },
        orderBy: { date: "asc" },
      });

      const totalRevenue = dayCloses.reduce((s, d) => s + d.totalRevenue, 0);
      const totalWaste = dayCloses.reduce((s, d) => s + d.totalWaste, 0);

      let y = 44;
      addKPIBox(doc, "Monatsumsatz", `${totalRevenue.toFixed(0)} EUR`, 20, y);
      addKPIBox(doc, "Waste gesamt", `${totalWaste.toFixed(0)} EUR`, 75, y);
      addKPIBox(doc, "Tage erfasst", `${dayCloses.length}`, 130, y);
      y += 36;

      y = addSectionTitle(doc, "Tagesuebersicht", y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      for (const d of dayCloses) {
        const pct = totalRevenue > 0 ? (d.totalRevenue / totalRevenue) * 100 : 0;
        doc.setTextColor(31, 26, 23);
        doc.text(`${d.date.toLocaleDateString("de-DE")}`, 20, y);
        doc.text(`${d.totalRevenue.toFixed(0)} EUR`, 70, y);
        doc.setTextColor(122, 110, 99);
        doc.text(`(${pct.toFixed(1)}%)`, 110, y);

        doc.setFillColor(198, 156, 114);
        doc.roundedRect(140, y - 3, Math.max(1, pct * 0.5), 4, 1, 1, "F");
        y += 6;
        if (y > 270) { doc.addPage(); page++; addFooter(doc, page); y = 20; }
      }
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cafe-coach-${type}-bericht.pdf"`,
      },
    });
  } catch (e) {
    console.error("PDF export error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
