import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, ApiError } from "@/lib/api";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/quotations/public/[token]
 * Public endpoint to retrieve sanitized quotation proposal by shareToken.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    const quotation = await quotationService.getPublicQuotationByToken(token);
    if (!quotation) {
      return handleApiError(
        new ApiError(404, "NOT_FOUND", "Quotation proposal not found or link has expired.")
      );
    }

    return apiSuccess(quotation);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/quotations/public/[token]
 * Public endpoint to mark quotation as viewed.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    await quotationService.markQuotationViewed(token);

    return apiSuccess({ success: true, message: "View recorded." });
  } catch (error) {
    return handleApiError(error);
  }
}
