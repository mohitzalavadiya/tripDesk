import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiCreated,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { recordInvoicePaymentSchema } from "@/lib/validation/invoice-schema";
import { paymentService } from "@/lib/services/payment-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoices/[id]/payments
 * Record a customer payment directly against an invoice
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(recordInvoicePaymentSchema, request);

    const payment = await paymentService.recordInvoicePayment(context.agencyId, id, {
      ...body,
      receivedBy: context.dbUser.id,
    });

    return apiCreated(payment);
  } catch (error) {
    return handleApiError(error);
  }
}
