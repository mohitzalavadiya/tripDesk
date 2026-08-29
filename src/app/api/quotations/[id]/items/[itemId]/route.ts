import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { updateQuotationItemSchema } from "@/lib/validation/quotation-item-schema";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

/**
 * PATCH /api/quotations/[id]/items/[itemId]
 * Update a quotation line item and recalculate totals.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id, itemId } = await params;
    const body = await validateJson(updateQuotationItemSchema, request);

    const updatedItem = await quotationService.updateQuotationItem(context.agencyId, id, itemId, body);

    return apiSuccess(updatedItem);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/quotations/[id]/items/[itemId]
 * Delete a quotation line item and recalculate totals.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id, itemId } = await params;

    await quotationService.deleteQuotationItem(context.agencyId, id, itemId);

    return apiSuccess({ success: true, message: "Line item deleted successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
