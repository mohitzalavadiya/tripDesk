import { NextRequest } from "next/server";
import {
  requireReadAccess,
  apiSuccess,
  handleApiError,
  validateQueryParams,
} from "@/lib/api";
import { checkDuplicateEnquirySchema } from "@/lib/validation/enquiry-schema";
import { enquiryService } from "@/lib/services/enquiry-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/enquiries/check-duplicate
 * Non-blocking duplicate enquiry detection for an agency.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const queryParams = validateQueryParams(checkDuplicateEnquirySchema, request.nextUrl.searchParams);

    const result = await enquiryService.checkDuplicateEnquiry(context.agencyId, queryParams);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
