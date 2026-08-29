import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { reorderProposalItemsSchema } from "@/lib/validation/proposal-item-schema";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/quotations/[id]/proposal-items/reorder
 * Batch updates sort order for proposal items.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: quotationId } = await params;
    const body = await validateJson(reorderProposalItemsSchema, request);

    await quotationService.reorderProposalItems(context.agencyId, quotationId, body);

    return apiSuccess({ success: true, message: "Proposal items reordered successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
