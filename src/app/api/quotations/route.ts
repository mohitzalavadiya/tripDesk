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
  createQuotationSchema,
  quotationQuerySchema,
} from "@/lib/validation/quotation-schema";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/quotations
 * List quotations with search, status filters, and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const queryParams = validateQueryParams(quotationQuerySchema, request.nextUrl.searchParams);

    const result = await quotationService.getQuotations(context.agencyId, queryParams);

    return apiSuccess(result.data, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/quotations
 * Create a new quotation record under the authenticated agency.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(createQuotationSchema, request);

    const newQuotation = await quotationService.createQuotation(context.agencyId, body);

    return apiCreated(newQuotation);
  } catch (error) {
    return handleApiError(error);
  }
}
