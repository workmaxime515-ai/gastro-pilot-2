import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsPDF } from "jspdf";

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month");
    const now = new Date();
    const start = month ? new Date(`${month}-01`) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const [checks, cleaningLogs] = await Promise.all([
      prisma.hACCPCheck.findMany({
        where: { date: { gte: start, lt: end } },
        include: { template: true },
        orderBy: { date: "asc" },
      }),
      prisma.cleaningLog.findMany({
        where: { date: { gte: start, lt: end } },
        include: { task: true },
        orderBy: { date: "asc" },
      }),
    ]);

    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("HACCP-Monatsbericht", 20, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Zeitraum: ${start.toLocaleDateString("de-DE")} — ${new Date(end.getTime() - 86400000).toLocaleDateString("de-DE")}`, 20, 28);
    doc.text(`Erstellt: ${new Date().toLocaleDateString("de-DE")} ${new Date().toLocaleTimeString("de-DE")}`, 20, 34);

    let y = 46;

    // Summary
    const totalChecks = checks.length;
    const compliant = checks.filter(c => c.isCompliant).length;
    const nonCompliant = totalChecks - compliant;
    const complianceRate = totalChecks > 0 ? ((compliant / totalChecks) * 100).toFixed(1) : "—";

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Zusammenfassung", 20, y); y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Kontrollen gesamt: ${totalChecks}`, 20, y); y += 6;
    doc.text(`Konform: ${compliant}`, 20, y); y += 6;
    doc.text(`Abweichungen: ${nonCompliant}`, 20, y); y += 6;
    doc.text(`Konformitaetsrate: ${complianceRate}%`, 20, y); y += 6;
    doc.text(`Reinigungsprotokolle: ${cleaningLogs.length}`, 20, y); y += 12;

    // HACCP Checks detail
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("HACCP-Kontrollen", 20, y); y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Datum", 20, y);
    doc.text("Kontrolle", 55, y);
    doc.text("Kategorie", 110, y);
    doc.text("Wert", 140, y);
    doc.text("Konform", 160, y);
    doc.text("Pruefer", 180, y);
    y += 5;
    doc.setFont("helvetica", "normal");

    for (const c of checks) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(c.date.toLocaleDateString("de-DE"), 20, y);
      doc.text(c.template.name.substring(0, 25), 55, y);
      doc.text(c.template.category, 110, y);
      doc.text(c.value.substring(0, 10), 140, y);
      doc.text(c.isCompliant ? "Ja" : "NEIN", 160, y);
      doc.text((c.performedBy || "—").substring(0, 12), 180, y);
      y += 5;
    }

    // Non-compliant details
    const nonCompliantChecks = checks.filter(c => !c.isCompliant);
    if (nonCompliantChecks.length > 0) {
      y += 8;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Abweichungen", 20, y); y += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      for (const c of nonCompliantChecks) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(`${c.date.toLocaleDateString("de-DE")} — ${c.template.name}: ${c.value}`, 20, y); y += 5;
        if (c.notes) { doc.text(`  Notiz: ${c.notes}`, 25, y); y += 5; }
      }
    }

    // Cleaning logs
    y += 8;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Reinigungsprotokolle", 20, y); y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Datum", 20, y);
    doc.text("Aufgabe", 55, y);
    doc.text("Bereich", 120, y);
    doc.text("Durchgefuehrt von", 150, y);
    y += 5;
    doc.setFont("helvetica", "normal");

    for (const l of cleaningLogs) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(l.date.toLocaleDateString("de-DE"), 20, y);
      doc.text(l.task.name.substring(0, 30), 55, y);
      doc.text(l.task.area, 120, y);
      doc.text((l.completedBy || "—").substring(0, 15), 150, y);
      y += 5;
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Seite ${i} von ${pageCount} — CoffeeFlow HACCP-Bericht`, 20, 287);
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="haccp-monatsbericht-${start.toISOString().substring(0, 7)}.pdf"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
