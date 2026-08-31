import { NextRequest } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/auth/customer-auth";
import { customerPortalService } from "@/lib/services/customer-portal-service";
import { apiSuccess, handleApiError, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/customer/trips/[tripId]
 * Returns customer-safe trip detail view.
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
    const trip = await customerPortalService.getCustomerTripDetail(
      auth.customerId,
      auth.agencyId,
      tripId
    );

    if (!trip) {
      throw new ApiError(404, "TRIP_NOT_FOUND", "Trip workspace not found or access denied.");
    }

    return apiSuccess(trip);
  } catch (error) {
    return handleApiError(error);
  }
}
