import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, validateJson } from "@/lib/api";
import { requestChangesSchema } from "@/lib/validation/quotation-schema";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/quotations/public/[token]/request-changes
 * Public customer endpoint to submit change requests and feedback on a proposal.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const body = await validateJson(requestChangesSchema, request);

    const result = await quotationService.requestChangesPublicQuotation(token, body);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
