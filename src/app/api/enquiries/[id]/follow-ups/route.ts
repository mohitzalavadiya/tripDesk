import {
apiCreated,
apiSuccess,
handleApiError,
requireReadAccess,
requireWriteAccess,
  enforceStaffPermission,
validateJson,
} from "@/lib/api";
import { enquiryService } from "@/lib/services/enquiry-service";
import { createFollowUpSchema } from "@/lib/validation/enquiry-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/enquiries/[id]/follow-ups
 * List follow-up timeline activities for an enquiry.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FOLLOW_UPS", "VIEW");
    const { id: enquiryId } = await params;

    const followUps = await enquiryService.getFollowUps(context.agencyId, enquiryId);

    return apiSuccess(followUps);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/enquiries/[id]/follow-ups
 * Add a follow-up interaction or scheduled call for an enquiry.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FOLLOW_UPS", "CREATE");
    const { id: enquiryId } = await params;
    const body = await validateJson(createFollowUpSchema, request);

    const newFollowUp = await enquiryService.createFollowUp(context.agencyId, enquiryId, body, {
      userId: context.dbUser.id,
      userName: context.dbUser.name || context.dbUser.email || (context.isAgencyOwner ? "Agency Owner" : "Staff Member"),
      role: context.dbUser.role,
    });

    return apiCreated(newFollowUp);
  } catch (error) {
    return handleApiError(error);
  }
}
