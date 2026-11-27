import {
  apiSuccess,
  enforceStaffPermission,
  handleApiError,
  requireWriteAccess,
  validateJson,
} from "@/lib/api";
import { paymentService } from "@/lib/services/payment-service";
import { NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const voidPaymentSchema = z.object({
  voidReason: z.string().min(3, "Void reason must be at least 3 characters long.").max(500),
});

/**
 * PATCH /api/payments/[id]/void
 * Rejects or voids a payment receipt.
 * Internal notification only, zero customer-facing notification.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(
      context.dbUser.role,
      context.agencyId,
      context.dbUser.id,
      "PAYMENTS",
      "void",
      "You do not have permission to void payment receipts."
    );
    const { id } = await params;
    const body = await validateJson(voidPaymentSchema, request);

    const voided = await paymentService.voidPaymentReceipt(
      context.agencyId,
      id,
      context.dbUser.id,
      body.voidReason
    );

    return apiSuccess(voided);
  } catch (error) {
    return handleApiError(error);
  }
}
