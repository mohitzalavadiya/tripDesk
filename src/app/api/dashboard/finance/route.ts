import { requireReadAccess } from "@/lib/api/context";
import { enforceStaffPermission } from "@/lib/services/staff-permission-service";
import { dashboardService } from "@/lib/services/dashboard-service";
import { DashboardFilterSchema } from "@/lib/validation/dashboard-schema";
import { NextRequest,NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(
      context.dbUser.role,
      context.agencyId,
      context.dbUser.id,
      "FINANCE",
      "VIEW",
      "You do not have permission to view financial dashboard metrics."
    );
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
