import { ForbiddenError, requireReadAccess, staffPermissionService } from "@/lib/api";
import { dashboardService } from "@/lib/services/dashboard-service";
import { NextRequest,NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const context = await requireReadAccess();
    if (context.isAgencyStaff) {
      const [canViewDashboard, canViewOperations] = await Promise.all([
        staffPermissionService.hasStaffPermission(
          context.dbUser.role,
          context.agencyId,
          context.dbUser.id,
          "DASHBOARD",
          "VIEW"
        ),
        staffPermissionService.hasStaffPermission(
          context.dbUser.role,
          context.agencyId,
          context.dbUser.id,
          "OPERATIONS",
          "VIEW"
        ),
      ]);
      if (!canViewDashboard && !canViewOperations) {
        throw new ForbiddenError("You do not have permission to view operations dashboard metrics.");
      }
    }
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
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("GET /api/dashboard/operations error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load operations dashboard metrics." },
      { status: 500 }
    );
  }
}
