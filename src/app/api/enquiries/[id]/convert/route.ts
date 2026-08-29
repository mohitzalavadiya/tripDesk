import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiCreated,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { convertEnquiryToTripSchema } from "@/lib/validation/enquiry-schema";
import { enquiryService } from "@/lib/services/enquiry-service";

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
    const { id: enquiryId } = await params;
    const body = await validateJson(convertEnquiryToTripSchema, request).catch(() => ({}));

    const result = await enquiryService.convertEnquiryToTrip(
      context.agencyId,
      enquiryId,
      body
    );

    return apiCreated(result);
  } catch (error) {
    return handleApiError(error);
  }
}
