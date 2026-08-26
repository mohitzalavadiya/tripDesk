import { NextResponse } from "next/server";
import { requireReadAccess } from "@/lib/api/context";
import { dashboardService } from "@/lib/services/dashboard-service";

export async function GET() {
  try {
    const context = await requireReadAccess();
    const agencyId = context.agencyId;

    const [summary, pipeline, revenueTrend, recentEnquiries, upcomingTrips, pendingFollowUps] =
      await Promise.all([
        dashboardService.getDashboardSummary(agencyId),
        dashboardService.getPipelineStages(agencyId),
        dashboardService.getMonthlyRevenueTrend(agencyId),
        dashboardService.getRecentEnquiries(agencyId, 6),
        dashboardService.getUpcomingTrips(agencyId, 6),
        dashboardService.getPendingFollowUps(agencyId, 6),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        pipeline,
        revenueTrend,
        recentEnquiries,
        upcomingTrips,
        pendingFollowUps,
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
