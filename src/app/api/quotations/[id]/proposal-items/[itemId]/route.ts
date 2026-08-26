import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { updateProposalItemSchema } from "@/lib/validation/proposal-item-schema";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

/**
 * PATCH /api/quotations/[id]/proposal-items/[itemId]
 * Updates a proposal item.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: quotationId, itemId } = await params;
    const body = await validateJson(updateProposalItemSchema, request);

    const updated = await quotationService.updateProposalItem(
      context.agencyId,
      quotationId,
      itemId,
      body
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/quotations/[id]/proposal-items/[itemId]
 * Deletes a proposal item.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: quotationId, itemId } = await params;

    const deleted = await quotationService.deleteProposalItem(
      context.agencyId,
      quotationId,
      itemId
    );

    return apiSuccess(deleted);
  } catch (error) {
    return handleApiError(error);
  }
}
