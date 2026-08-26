import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  apiCreated,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { createPackageOptionSchema } from "@/lib/validation/package-option-schema";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/quotations/[id]/package-options
 * Lists all tiered package options (Standard, Deluxe, Luxury) for a quotation.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id: quotationId } = await params;

    const options = await quotationService.getPackageOptions(context.agencyId, quotationId);

    return apiSuccess(options);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/quotations/[id]/package-options
 * Creates a new tiered package option on a quotation.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: quotationId } = await params;
    const body = await validateJson(createPackageOptionSchema, request);

    const option = await quotationService.createPackageOption(context.agencyId, quotationId, body);

    return apiCreated(option);
  } catch (error) {
    return handleApiError(error);
  }
}
