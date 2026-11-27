import { ForbiddenError, requireReadAccess, staffPermissionService } from "@/lib/api";
import { dashboardService } from "@/lib/services/dashboard-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const context = await requireReadAccess();
    if (context.isAgencyStaff) {
      const [canViewDashboard, canViewEnquiries] = await Promise.all([
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
          "ENQUIRIES",
          "VIEW"
        ),
      ]);
      if (!canViewDashboard && !canViewEnquiries) {
        throw new ForbiddenError("You do not have permission to view CRM dashboard metrics.");
      }
    }
    const agencyId = context.agencyId;

    const followUps = await dashboardService.getCRMAndFollowUpAnalytics(agencyId);

    return NextResponse.json({
      success: true,
      data: {
        followUps,
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
    console.error("GET /api/dashboard/crm error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load CRM dashboard metrics." },
      { status: 500 }
    );
  }
}
