import {
  apiSuccess,
  handleApiError,
  requireAgencyOwnerContext,
} from "@/lib/api";
import { paymentService } from "@/lib/services/payment-service";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/payments/[id]/verify
 * Verifies a pending customer payment receipt.
 * Agency Owner only. Updates status to COMPLETED, recalculates booking balance, and sends customer receipt.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireAgencyOwnerContext();
    const { id } = await params;

    const verified = await paymentService.verifyPaymentReceipt(
      context.agencyId,
      id,
      context.dbUser.id
    );

    return apiSuccess(verified);
  } catch (error) {
    return handleApiError(error);
  }
}
