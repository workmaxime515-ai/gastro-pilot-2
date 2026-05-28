import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processSale } from "@/lib/manager/processSale";
import { parseJsonWithLimit } from "@/lib/guardrails";

const recordSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().positive().max(10_000),
  source: z.string().max(64).optional(),
  idempotencyKey: z.string().max(128).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonWithLimit(request, 32_000, recordSchema);
    if (!parsed.ok) return parsed.response;

    const result = await processSale({
      productId: parsed.data.productId,
      qty: parsed.data.qty,
      source: parsed.data.source,
      idempotencyKey: parsed.data.idempotencyKey,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "SALE_FAILED";
    if (msg === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
    }
    if (msg === "PRODUCT_INACTIVE") {
      return NextResponse.json({ error: "Produkt ist deaktiviert" }, { status: 409 });
    }
    console.error("Sales record POST error:", error);
    return NextResponse.json({ error: "Verkauf konnte nicht gebucht werden" }, { status: 500 });
  }
}
