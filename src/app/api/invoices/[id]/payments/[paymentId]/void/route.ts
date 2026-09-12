import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { voidPaymentSchema } from "@/lib/validation/invoice-schema";
import { paymentService } from "@/lib/services/payment-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoices/[id]/payments/[paymentId]/void
 * Void an active payment with mandatory reason
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const context = await requireWriteAccess();
    const { paymentId } = await params;
    const body = await validateJson(voidPaymentSchema, request);

    const voided = await paymentService.voidPayment(
      context.agencyId,
      paymentId,
      context.dbUser.id,
      body.reason
    );

    return apiSuccess(voided);
  } catch (error) {
    return handleApiError(error);
  }
}
