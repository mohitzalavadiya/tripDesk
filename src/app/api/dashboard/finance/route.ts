import { ForbiddenError } from "@/lib/api/errors";
import { requireReadAccess } from "@/lib/api/context";
import { canAccessFinancialMargins } from "@/lib/auth/permissions";
import { dashboardService } from "@/lib/services/dashboard-service";
import { DashboardFilterSchema } from "@/lib/validation/dashboard-schema";
import { NextRequest,NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const context = await requireReadAccess();
    if (!canAccessFinancialMargins(context.dbUser.role)) {
      throw new ForbiddenError("You do not have permission to view financial dashboard metrics.");
    }
    const agencyId = context.agencyId;

    const { searchParams } = new URL(req.url);
    const parsedFilter = DashboardFilterSchema.parse({
      preset: searchParams.get("preset") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    });

    const [revenueAndProfit, receivables, payables, summary] = await Promise.all([
      dashboardService.getRevenueAndProfitAnalytics(agencyId, parsedFilter),
      dashboardService.getAccountsReceivableAnalytics(agencyId),
      dashboardService.getSupplierPayableAnalytics(agencyId),
      dashboardService.getDashboardSummary(agencyId, parsedFilter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        financialKPIs: summary.financial,
        revenueTrend: revenueAndProfit.timeSeries,
        profitability: revenueAndProfit.summary,
        receivables,
        payables,
      },
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("GET /api/dashboard/finance error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load financial dashboard metrics." },
      { status: 500 }
    );
  }
}
