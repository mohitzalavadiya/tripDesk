import { NextRequest } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/auth/customer-auth";
import { customerPortalService } from "@/lib/services/customer-portal-service";
import { apiSuccess, handleApiError, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/customer/trips/[tripId]/documents
 * Returns list of customer travel documents (vouchers, booking confirmation, travel kit).
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
    const docs = await customerPortalService.getCustomerTripDocuments(
      auth.customerId,
      auth.agencyId,
      tripId
    );

    return apiSuccess(docs);
  } catch (error) {
    return handleApiError(error);
  }
}
