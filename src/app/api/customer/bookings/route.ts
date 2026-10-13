import { ApiError,apiSuccess,handleApiError } from "@/lib/api";
import { getAuthenticatedCustomer } from "@/lib/auth/customer-auth";
import { customerPortalService } from "@/lib/services/customer-portal-service";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/customer/bookings
 * Returns all bookings for the authenticated customer.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer(request, { requireAccountSession: true });
    if (!auth) {
      throw new ApiError(401, "CUSTOMER_UNAUTHORIZED", "Please sign in or provide a valid portal session.");
    }

    const bookings = await customerPortalService.getCustomerBookings(
      auth.customerId,
      auth.agencyId
    );

    return apiSuccess(bookings);
  } catch (error) {
    return handleApiError(error);
  }
}
