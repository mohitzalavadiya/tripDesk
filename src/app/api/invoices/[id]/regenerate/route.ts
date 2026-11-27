import {
  apiSuccess,
  enforceStaffPermission,
  handleApiError,
  requireWriteAccess,
} from "@/lib/api";
import { invoiceService } from "@/lib/services/invoice-service";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoices/[id]/regenerate
 * Regenerate a draft invoice from the latest booking/quotation financial state.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "UPDATE");
    const { id } = await params;

    const regenerated = await invoiceService.regenerateInvoice(context.agencyId, id);

    return apiSuccess(regenerated);
  } catch (error) {
    return handleApiError(error);
  }
}
