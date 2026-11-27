import {
apiSuccess,
handleApiError,
requireWriteAccess,
  enforceStaffPermission,
validateJson,
} from "@/lib/api";
import { enquiryService } from "@/lib/services/enquiry-service";
import { updateFollowUpSchema } from "@/lib/validation/enquiry-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; followUpId: string }>;
}

/**
 * PATCH /api/enquiries/[id]/follow-ups/[followUpId]
 * Update follow-up status (e.g. mark completed) or details.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FOLLOW_UPS", "UPDATE");
    const { followUpId } = await params;
    const body = await validateJson(updateFollowUpSchema, request);

    const updated = await enquiryService.updateFollowUp(context.agencyId, followUpId, body, {
      userId: context.dbUser.id,
      userName: context.dbUser.name || context.dbUser.email || (context.isAgencyOwner ? "Agency Owner" : "Staff Member"),
      role: context.dbUser.role,
    });

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/enquiries/[id]/follow-ups/[followUpId]
 * Soft delete / archive follow-up.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FOLLOW_UPS", "DELETE");
    const { followUpId } = await params;

    await enquiryService.deleteFollowUp(context.agencyId, followUpId, {
      userId: context.dbUser.id,
      userName: context.dbUser.name || context.dbUser.email || (context.isAgencyOwner ? "Agency Owner" : "Staff Member"),
      role: context.dbUser.role,
    });

    return apiSuccess({ success: true, message: "Follow-up archived successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
