import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const EXPORT_MODELS = [
  "product", "dailySales", "inventory", "staffMember", "staffSchedule",
  "localEvent", "weatherData", "suggestion", "actionTracking", "suggestionFeedback",
  "wasteLog", "dayClose", "emergencyLog", "checklistTemplate", "checklistEntry",
  "tempLog", "competitorNote", "quickNote", "emergencyContact",
  "shopSettings", "cashCount", "expense", "revenueGoal", "confidenceModifier",
  "recipe", "recipeIngredient", "supplier", "supplierProduct", "purchaseOrder",
  "purchaseOrderItem", "hACCPTemplate", "hACCPCheck", "cleaningTask", "cleaningLog",
  "customerCount", "laborEntry", "promotion", "menuPlan", "menuPlanItem",
  "coachMessage", "appLog", "tutorialProgress", "onboardingStatus",
] as const;

export async function GET() {
  try {
    const backup: Record<string, unknown[]> = {};

    for (const model of EXPORT_MODELS) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prismaModel = (prisma as any)[model];
        if (prismaModel?.findMany) {
          backup[model] = await prismaModel.findMany();
        }
      } catch {
        // Model might not exist or have issues, skip
      }
    }

    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      data: backup,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="coffeeflow-backup-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (e) {
    console.error("Backup export error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.version || !body.data) {
      return NextResponse.json({ error: "Ungueltiges Backup-Format" }, { status: 400 });
    }

    const data = body.data as Record<string, unknown[]>;

    const importOrder = [
      "shopSettings", "product", "staffMember", "supplier", "recipe",
      "checklistTemplate", "cleaningTask", "hACCPTemplate", "menuPlan",
    ];

    const allModels = [...importOrder, ...Object.keys(data).filter((m) => !importOrder.includes(m))];

    const results = await prisma.$transaction(async (tx) => {
      const res: Record<string, number> = {};
      for (const model of allModels) {
        if (!data[model] || !Array.isArray(data[model])) continue;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const prismaModel = (tx as any)[model];
          if (prismaModel?.createMany) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cleaned = (data[model] as any[]).map((item) => {
              const copy = { ...item };
              delete copy.createdAt;
              delete copy.updatedAt;
              return copy;
            });
            const result = await prismaModel.createMany({ data: cleaned, skipDuplicates: true });
            res[model] = result.count;
          }
        } catch (e) {
          console.error(`Import ${model} error:`, e);
          res[model] = -1;
        }
      }
      return res;
    }, { timeout: 30000 });

    return NextResponse.json({
      success: true,
      imported: results,
      total: Object.values(results).filter((v) => v > 0).reduce((s, v) => s + v, 0),
    });
  } catch (e) {
    console.error("Backup import error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Fehler" }, { status: 500 });
  }
}
