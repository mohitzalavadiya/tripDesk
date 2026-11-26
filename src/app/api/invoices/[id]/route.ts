import {
apiSuccess,
handleApiError,
NotFoundError,
requireReadAccess,
requireAgencyOwnerContext,
requireWriteAccess,
  enforceStaffPermission,
validateJson,
} from "@/lib/api";
import { invoiceService } from "@/lib/services/invoice-service";
import { updateDraftInvoiceSchema } from "@/lib/validation/invoice-schema";
import { NextRequest } from "next/server";

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
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "VIEW");
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
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "UPDATE");
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
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "DELETE");
    const { id } = await params;

    const result = await invoiceService.deleteDraftInvoice(context.agencyId, id);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
