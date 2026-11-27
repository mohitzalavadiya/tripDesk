import {
  apiSuccess,
  ForbiddenError,
  handleApiError,
  requireReadAccess,
  staffPermissionService,
} from "@/lib/api";
import { enquiryService } from "@/lib/services/enquiry-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/dashboard
 * Retrieve high-level CRM pipeline, sales conversion, follow-up telemetry, and sources summary.
 */
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
    const stats = await enquiryService.getCrmDashboardStats(context.agencyId);

    return apiSuccess(stats);
  } catch (error) {
    return handleApiError(error);
  }
}
