import {
  enforceStaffPermission,
apiSuccess,
handleApiError,
requireWriteAccess,
validateJson,
} from "@/lib/api";
import { enquiryService } from "@/lib/services/enquiry-service";
import { markEnquiryLostSchema } from "@/lib/validation/enquiry-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/enquiries/[id]/lost
 * Mark enquiry as LOST with mandatory structured lost reason.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ENQUIRIES", "UPDATE");
    const { id } = await params;
    const body = await validateJson(markEnquiryLostSchema, request);

    const actor = {
      userId: context.dbUser.id,
      userName: context.dbUser.name || context.dbUser.email || (context.isAgencyOwner ? "Agency Owner" : "Staff Member"),
      role: context.dbUser.role,
    };
    const updated = await enquiryService.markEnquiryLost(context.agencyId, id, body, actor);

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
