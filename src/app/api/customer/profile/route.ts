import { NextRequest } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/auth/customer-auth";
import { customerPortalService } from "@/lib/services/customer-portal-service";
import { apiSuccess, handleApiError, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/customer/profile
 * Returns authenticated customer profile.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer(request);
    if (!auth) {
      throw new ApiError(401, "CUSTOMER_UNAUTHORIZED", "Please sign in or provide a valid portal session.");
    }

    const profile = await customerPortalService.getCustomerProfile(
      auth.customerId,
      auth.agencyId
    );

    if (!profile) {
      throw new ApiError(404, "CUSTOMER_NOT_FOUND", "Customer profile not found.");
    }

    return apiSuccess(profile);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/customer/profile
 * Updates customer contact information safely.
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer(request);
    if (!auth) {
      throw new ApiError(401, "CUSTOMER_UNAUTHORIZED", "Please sign in or provide a valid portal session.");
    }

    const body = await request.json();

    const updated = await customerPortalService.updateCustomerProfile(
      auth.customerId,
      auth.agencyId,
      body
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
