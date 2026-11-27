import {
  apiSuccess,
  enforceStaffPermission,
  handleApiError,
  requireReadAccess,
} from "@/lib/api";
import { enquiryService } from "@/lib/services/enquiry-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/enquiries/assignees
 * Lists authorized users and historical assignees strictly for the authenticated agency.
 */
export async function GET() {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(
      context.dbUser.role,
      context.agencyId,
      context.dbUser.id,
      "ENQUIRIES",
      "VIEW"
    );
    const assignees = await enquiryService.getEnquiryAssignees(context.agencyId);

    return apiSuccess(assignees);
  } catch (error) {
    return handleApiError(error);
  }
}
