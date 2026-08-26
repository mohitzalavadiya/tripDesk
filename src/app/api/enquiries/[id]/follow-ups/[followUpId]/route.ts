import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { updateFollowUpSchema } from "@/lib/validation/enquiry-schema";
import { enquiryService } from "@/lib/services/enquiry-service";

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
    const { followUpId } = await params;
    const body = await validateJson(updateFollowUpSchema, request);

    const updated = await enquiryService.updateFollowUp(context.agencyId, followUpId, body);

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
    const { followUpId } = await params;

    await enquiryService.deleteFollowUp(context.agencyId, followUpId);

    return apiSuccess({ success: true, message: "Follow-up archived successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
