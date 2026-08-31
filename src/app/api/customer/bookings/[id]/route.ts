import { NextRequest } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/auth/customer-auth";
import { customerPortalService } from "@/lib/services/customer-portal-service";
import { apiSuccess, handleApiError, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/customer/bookings/[id]
 * Returns booking details for the authenticated customer.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedCustomer(request);
    if (!auth) {
      throw new ApiError(401, "CUSTOMER_UNAUTHORIZED", "Please sign in or provide a valid portal session.");
    }

    const { id } = await params;
    const bookings = await customerPortalService.getCustomerBookings(
      auth.customerId,
      auth.agencyId
    );

    const booking = bookings.find((b) => b.id === id || b.bookingNumber === id);
    if (!booking) {
      throw new ApiError(404, "BOOKING_NOT_FOUND", "Booking not found or access denied.");
    }

    return apiSuccess(booking);
  } catch (error) {
    return handleApiError(error);
  }
}
