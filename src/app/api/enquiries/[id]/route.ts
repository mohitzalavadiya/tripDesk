import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { updateEnquirySchema } from "@/lib/validation/enquiry-schema";
import { enquiryService } from "@/lib/services/enquiry-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/enquiries/[id]
 * Get single enquiry with customer, trip, quotation, and follow-ups.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const enquiry = await enquiryService.getEnquiry(context.agencyId, id);
    if (!enquiry) {
      return handleApiError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Enquiry record not found.",
      });
    }

    return apiSuccess(enquiry);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/enquiries/[id]
 * Update enquiry status, requirements, dates, passenger count, or priority.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(updateEnquirySchema, request);

    const updated = await enquiryService.updateEnquiry(context.agencyId, id, body);

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/enquiries/[id]
 * Soft delete / archive enquiry.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;

    await enquiryService.archiveEnquiry(context.agencyId, id);

    return apiSuccess({ success: true, message: "Enquiry archived successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
