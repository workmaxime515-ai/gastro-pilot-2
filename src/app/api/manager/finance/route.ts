import { NextRequest, NextResponse } from "next/server";
import {
  getManagerFinance,
  getManagerSalesForPeriod,
  type FinancePeriod,
} from "@/lib/manager/finance";

const PERIODS: FinancePeriod[] = ["day", "month", "year"];

export async function GET(request: NextRequest) {
  try {
    const periodParam = request.nextUrl.searchParams.get("period") ?? "day";
    const period = PERIODS.includes(periodParam as FinancePeriod)
      ? (periodParam as FinancePeriod)
      : "day";
    const includeSales = request.nextUrl.searchParams.get("sales") === "true";

    const summary = await getManagerFinance(period);
    const sales = includeSales ? await getManagerSalesForPeriod(period) : undefined;

    return NextResponse.json({ ...summary, sales });
  } catch (error) {
    console.error("Manager finance GET error:", error);
    return NextResponse.json(
      { error: "Finanzdaten konnten nicht geladen werden" },
      { status: 500 }
    );
  }
}
