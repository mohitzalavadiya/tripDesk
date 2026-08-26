import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  apiCreated,
  handleApiError,
  validateJson,
  validateQueryParams,
} from "@/lib/api";
import {
  createPaymentSchema,
  paymentQuerySchema,
} from "@/lib/validation/payment-schema";
import { paymentService } from "@/lib/services/payment-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments
 * List payments with filters and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const queryParams = validateQueryParams(paymentQuerySchema, request.nextUrl.searchParams);

    const result = await paymentService.getPayments(context.agencyId, queryParams);

    return apiSuccess(result.data, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/payments
 * Record a new customer payment against a booking.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(createPaymentSchema, request);

    const newPayment = await paymentService.createPayment(context.agencyId, body);

    return apiCreated(newPayment);
  } catch (error) {
    return handleApiError(error);
  }
}
