import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { updatePaymentSchema } from "@/lib/validation/payment-schema";
import { paymentService } from "@/lib/services/payment-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/payments/[id]
 * Get single payment record with booking and customer info.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const payment = await paymentService.getPayment(context.agencyId, id);
    if (!payment) {
      return handleApiError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Payment record not found.",
      });
    }

    return apiSuccess(payment);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/payments/[id]
 * Update payment status, notes, or refund amount.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(updatePaymentSchema, request);

    const updated = await paymentService.updatePayment(context.agencyId, id, body);

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/payments/[id]
 * Soft delete / archive payment and recalculate booking totals.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;

    await paymentService.archivePayment(context.agencyId, id);

    return apiSuccess({ success: true, message: "Payment archived successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
