import {
  apiCreated,
  enforceStaffPermission,
  handleApiError,
  requireWriteAccess,
  validateJson,
} from "@/lib/api";
import { paymentService } from "@/lib/services/payment-service";
import { recordInvoicePaymentSchema } from "@/lib/validation/invoice-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoices/[id]/payments
 * Record a customer payment against an invoice.
 * Staff with PAYMENTS:RECORDRECEIPT create PENDING receipts requiring Owner verification.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(
      context.dbUser.role,
      context.agencyId,
      context.dbUser.id,
      "PAYMENTS",
      "RECORDRECEIPT"
    );
    const { id } = await params;
    const body = await validateJson(recordInvoicePaymentSchema, request);

    const payment = await paymentService.recordInvoicePayment(
      context.agencyId,
      id,
      {
        ...body,
        receivedBy: context.dbUser.id,
      },
      { role: context.dbUser.role, userId: context.dbUser.id }
    );

    return apiCreated(payment);
  } catch (error) {
    return handleApiError(error);
  }
}
