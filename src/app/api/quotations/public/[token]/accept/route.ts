import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, validateJson } from "@/lib/api";
import { acceptQuotationSchema } from "@/lib/validation/quotation-schema";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/quotations/public/[token]/accept
 * Public customer endpoint to accept a quotation proposal.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const body = await validateJson(acceptQuotationSchema, request).catch(() => ({}));

    const result = await quotationService.acceptPublicQuotation(token, body);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
