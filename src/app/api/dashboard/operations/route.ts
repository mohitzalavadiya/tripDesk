import { NextRequest, NextResponse } from "next/server";
import { requireReadAccess } from "@/lib/api/context";
import { dashboardService } from "@/lib/services/dashboard-service";

export async function GET(req: NextRequest) {
  try {
    const context = await requireReadAccess();
    const agencyId = context.agencyId;

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 15);

    const [upcomingDepartures, summary] = await Promise.all([
      dashboardService.getUpcomingDeparturesWorkspace(agencyId, limit),
      dashboardService.getDashboardSummary(agencyId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        operationsKPIs: summary.operations,
        documentKPIs: summary.documents,
        upcomingDepartures,
      },
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/dashboard/operations error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load operations dashboard metrics." },
      { status: 500 }
    );
  }
}
