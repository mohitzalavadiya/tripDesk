import {
  apiSuccess,
  enforceStaffPermission,
  handleApiError,
  requireReadAccess,
} from "@/lib/api";
import { enquiryService } from "@/lib/services/enquiry-service";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/enquiries/[id]/timeline
 * Retrieve chronological CRM activity timeline for a lead.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(
      context.dbUser.role,
      context.agencyId,
      context.dbUser.id,
      "ENQUIRIES",
      "VIEW"
    );
    const { id } = await params;

    const timeline = await enquiryService.getEnquiryTimeline(context.agencyId, id);

    return apiSuccess(timeline);
  } catch (error) {
    return handleApiError(error);
  }
}
