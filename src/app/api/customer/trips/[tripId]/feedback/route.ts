import { NextRequest } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/auth/customer-auth";
import { customerPortalService } from "@/lib/services/customer-portal-service";
import { apiCreated, handleApiError, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * POST /api/customer/trips/[tripId]/feedback
 * Submit traveler post-tour ratings and review.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const auth = await getAuthenticatedCustomer(request);
    if (!auth) {
      throw new ApiError(401, "CUSTOMER_UNAUTHORIZED", "Please sign in or provide a valid portal session.");
    }

    const { tripId } = await params;
    const body = await request.json();

    if (!body || typeof body.rating !== "number" || body.rating < 1 || body.rating > 5) {
      throw new ApiError(400, "INVALID_RATING", "Overall star rating between 1 and 5 is required.");
    }

    const feedback = await customerPortalService.submitCustomerTripFeedback(
      auth.customerId,
      auth.agencyId,
      tripId,
      {
        rating: body.rating,
        serviceRating: body.serviceRating,
        hotelRating: body.hotelRating,
        driverRating: body.driverRating,
        comments: body.comments,
      }
    );

    return apiCreated(feedback);
  } catch (error) {
    return handleApiError(error);
  }
}
