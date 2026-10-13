import {
apiSuccess,
handleApiError,
requireReadAccess,
validateQueryParams,
} from "@/lib/api";
import { enquiryService } from "@/lib/services/enquiry-service";
import { checkDuplicateEnquirySchema } from "@/lib/validation/enquiry-schema";
import { NextRequest } from "next/server";

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
