import {
apiSuccess,
handleApiError,
requireWriteAccess,
} from "@/lib/api";
import { invoiceService } from "@/lib/services/invoice-service";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoices/[id]/regenerate
 * Regenerate an existing invoice from the latest booking/quotation financial state
 * while preserving the same invoice number and invoice record ID (Phase 203).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;

    const regenerated = await invoiceService.regenerateInvoice(context.agencyId, id);

    return apiSuccess(regenerated);
  } catch (error) {
    return handleApiError(error);
  }
}
