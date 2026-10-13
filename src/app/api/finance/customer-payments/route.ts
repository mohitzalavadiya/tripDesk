import {
apiCreated,
apiSuccess,
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
    const query = validateQueryParams(paymentQuerySchema, request.nextUrl.searchParams);

    const result = await paymentService.getPayments(context.agencyId, query);

    return apiSuccess(result.data, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/finance/customer-payments
 * Record customer payment.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(recordCustomerPaymentSchema, request);

    const payment = await financeService.recordCustomerPayment(
      context.agencyId,
      body,
      context.dbUser.id
    );

    return apiCreated(payment);
  } catch (error) {
    return handleApiError(error);
  }
}
