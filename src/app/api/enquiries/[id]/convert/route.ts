import {
  enforceStaffPermission,
apiCreated,
handleApiError,
requireWriteAccess,
validateJson,
} from "@/lib/api";
import { enquiryService } from "@/lib/services/enquiry-service";
import { convertEnquiryToTripSchema } from "@/lib/validation/enquiry-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/enquiries/[id]/convert
 * Converts a qualified enquiry into a Trip workspace.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIPS", "CREATE");
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ENQUIRIES", "UPDATE");
    const { id: enquiryId } = await params;
    const body = await validateJson(convertEnquiryToTripSchema, request).catch(() => ({}));

    const result = await enquiryService.convertEnquiryToTrip(
      context.agencyId,
      enquiryId,
      body,
      {
        userId: context.dbUser.id,
        userName: context.dbUser.name || context.dbUser.email || (context.isAgencyOwner ? "Agency Owner" : "Staff Member"),
        role: context.dbUser.role,
      }
    );

    return apiCreated(result);
  } catch (error) {
    return handleApiError(error);
  }
}
