import {
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
    const { id } = await params;
    const body = await validateJson(markEnquiryLostSchema, request);

    const updated = await enquiryService.markEnquiryLost(context.agencyId, id, body);

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
