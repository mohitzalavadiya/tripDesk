import { NextRequest } from "next/server";
import { apiSuccess, handleApiError, validateJson } from "@/lib/api";
import { selectPackageOptionSchema } from "@/lib/validation/package-option-schema";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/quotations/public/[token]/select-option
 * Public customer endpoint to select a tiered package option (Standard / Deluxe / Luxury).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const body = await validateJson(selectPackageOptionSchema, request);

    const result = await quotationService.selectPublicPackageOption(token, body.optionId);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
