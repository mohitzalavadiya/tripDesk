import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  apiCreated,
  handleApiError,
  validateJson,
  validateQueryParams,
} from "@/lib/api";
import {
  createEnquirySchema,
  enquiryQuerySchema,
} from "@/lib/validation/enquiry-schema";
import { enquiryService } from "@/lib/services/enquiry-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/enquiries
 * List enquiries with search, status/priority/source filters, and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const queryParams = validateQueryParams(enquiryQuerySchema, request.nextUrl.searchParams);

    const result = await enquiryService.getEnquiries(context.agencyId, queryParams);

    return apiSuccess(result.data, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/enquiries
 * Create a new customer travel enquiry.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(createEnquirySchema, request);

    const newEnquiry = await enquiryService.createEnquiry(context.agencyId, body);

    return apiCreated(newEnquiry);
  } catch (error) {
    return handleApiError(error);
  }
}
