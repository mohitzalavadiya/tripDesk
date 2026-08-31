import { NextRequest } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/auth/customer-auth";
import { customerPortalService } from "@/lib/services/customer-portal-service";
import { apiSuccess, handleApiError, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/customer/trips/[tripId]/payments
 * Returns customer payment history and balance ledger.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const auth = await getAuthenticatedCustomer(request);
    if (!auth) {
      throw new ApiError(401, "CUSTOMER_UNAUTHORIZED", "Please sign in or provide a valid portal session.");
    }

    const { tripId } = await params;
    const paymentSummary = await customerPortalService.getCustomerTripPayments(
      auth.customerId,
      auth.agencyId,
      tripId
    );

    if (!paymentSummary) {
      throw new ApiError(404, "PAYMENTS_NOT_FOUND", "Booking payment record not found for this trip.");
    }

    return apiSuccess(paymentSummary);
  } catch (error) {
    return handleApiError(error);
  }
}
