import {
  apiCreated,
  enforceStaffPermission,
  handleApiError,
  requireWriteAccess,
} from "@/lib/api";
import { invoiceService } from "@/lib/services/invoice-service";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoices/[id]/replacement
 * Create a new replacement draft invoice from a cancelled invoice
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "CREATE");
    const { id } = await params;

    const replacement = await invoiceService.createReplacementInvoice(context.agencyId, id);

    return apiCreated(replacement);
  } catch (error) {
    return handleApiError(error);
  }
}
