import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { updateQuotationSchema } from "@/lib/validation/quotation-schema";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/quotations/[id]
 * Get single quotation with line items and relations.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const quotation = await quotationService.getQuotation(context.agencyId, id);
    if (!quotation) {
      return handleApiError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Quotation not found.",
      });
    }

    return apiSuccess(quotation);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/quotations/[id]
 * Update quotation fields, rules, or status.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(updateQuotationSchema, request);

    const updated = await quotationService.updateQuotation(context.agencyId, id, body);

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/quotations/[id]
 * Soft delete quotation.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;

    await quotationService.deleteQuotation(context.agencyId, id);

    return apiSuccess({ success: true, message: "Quotation archived successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
