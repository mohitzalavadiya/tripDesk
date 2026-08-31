import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { refundCustomerPaymentSchema } from "@/lib/validation/finance-schema";
import { financeService } from "@/lib/services/finance-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/finance/customer-payments/[id]/refund
 * Process refund on a customer payment.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(refundCustomerPaymentSchema, request);

    const refundedPayment = await financeService.refundCustomerPayment(
      context.agencyId,
      id,
      body,
      context.dbUser.id
    );

    return apiSuccess(refundedPayment);
  } catch (error) {
    return handleApiError(error);
  }
}
