import {
  apiCreated,
  apiSuccess,
  enforceStaffPermission,
  ForbiddenError,
  handleApiError,
  requireReadAccess,
  requireWriteAccess,
  validateJson,
  validateQueryParams,
} from "@/lib/api";
import { financeService } from "@/lib/services/finance-service";
import { paymentService } from "@/lib/services/payment-service";
import {
  recordCustomerPaymentSchema,
} from "@/lib/validation/finance-schema";
import { paymentQuerySchema } from "@/lib/validation/payment-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/finance/customer-payments
 * List customer payments with filters.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(
      context.dbUser.role,
      context.agencyId,
      context.dbUser.id,
      "PAYMENTS",
      "VIEW"
    );
    const query = validateQueryParams(paymentQuerySchema, request.nextUrl.searchParams);

    const result = await paymentService.getPayments(context.agencyId, query);

    return apiSuccess(result.data, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/finance/customer-payments
 * Record settled customer payment. Strictly restricted to Agency Owners.
 * Staff must submit pending receipts via POST /api/payments for Owner verification.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    if (!context.isAgencyOwner) {
      throw new ForbiddenError("Recording settled customer payments is restricted to Agency Owners.");
    }
    const body = await validateJson(recordCustomerPaymentSchema, request);

    const payment = await financeService.recordCustomerPayment(
      context.agencyId,
      body,
      context.dbUser.id,
      { role: context.dbUser.role, userId: context.dbUser.id }
    );

    return apiCreated(payment);
  } catch (error) {
    return handleApiError(error);
  }
}
