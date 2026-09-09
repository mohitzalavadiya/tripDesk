import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiCreated,
  handleApiError,
} from "@/lib/api";
import { invoiceService } from "@/lib/services/invoice-service";

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
    const { id } = await params;

    const replacement = await invoiceService.createReplacementInvoice(context.agencyId, id);

    return apiCreated(replacement);
  } catch (error) {
    return handleApiError(error);
  }
}
