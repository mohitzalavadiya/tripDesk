import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  NotFoundError,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { updateDraftInvoiceSchema } from "@/lib/validation/invoice-schema";
import { invoiceService } from "@/lib/services/invoice-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/[id]
 * Fetch single invoice by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const invoice = await invoiceService.getInvoice(context.agencyId, id);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    return apiSuccess(invoice);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/invoices/[id]
 * Update draft invoice details and line items
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(updateDraftInvoiceSchema, request);

    const updated = await invoiceService.updateDraftInvoice(context.agencyId, id, body);

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/invoices/[id]
 * Delete draft invoice
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;

    const result = await invoiceService.deleteDraftInvoice(context.agencyId, id);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
