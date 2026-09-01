import { NextRequest, NextResponse } from "next/server";
import { requireReadAccess } from "@/lib/api/context";
import { dashboardService } from "@/lib/services/dashboard-service";
import { DashboardFilterSchema } from "@/lib/validation/dashboard-schema";

export async function GET(req: NextRequest) {
  try {
    const context = await requireReadAccess();
    const agencyId = context.agencyId;

    const { searchParams } = new URL(req.url);
    const parsedFilter = DashboardFilterSchema.parse({
      preset: searchParams.get("preset") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      refresh: searchParams.get("refresh") || undefined,
    });

    const [summary, funnel, revenueTrend, topEntities] = await Promise.all([
      dashboardService.getDashboardSummary(agencyId, parsedFilter),
      dashboardService.getSalesFunnelAnalytics(agencyId, parsedFilter),
      dashboardService.getRevenueAndProfitAnalytics(agencyId, parsedFilter),
      dashboardService.getTopDestinationsAndCustomers(agencyId, parsedFilter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        funnel,
        revenueTrend,
        destinations: topEntities.destinations,
        customers: topEntities.customers,
      },
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/dashboard/summary error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load dashboard summary metrics." },
      { status: 500 }
    );
  }
}
