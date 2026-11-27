import { enforceStaffPermission, requireReadAccess } from "@/lib/api";
import { redactStaffFinancials } from "@/lib/auth/permissions";
import { dashboardService } from "@/lib/services/dashboard-service";
import { DashboardFilterSchema } from "@/lib/validation/dashboard-schema";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(
      context.dbUser.role,
      context.agencyId,
      context.dbUser.id,
      "DASHBOARD",
      "VIEW"
    );
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

    const payload = {
      summary,
      funnel,
      revenueTrend,
      destinations: topEntities.destinations,
      customers: topEntities.customers,
    };

    const sanitizedData = redactStaffFinancials(payload, context.dbUser.role);

    return NextResponse.json({
      success: true,
      data: sanitizedData,
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("GET /api/dashboard/summary error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load dashboard summary metrics." },
      { status: 500 }
    );
  }
}
