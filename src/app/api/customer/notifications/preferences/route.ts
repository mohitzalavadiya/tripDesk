import { NextRequest } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/auth/customer-auth";
import { customerNotificationService } from "@/lib/services/customer-notification-service";
import { apiSuccess, handleApiError, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/customer/notifications/preferences
 * Returns notification channel and category preferences for authenticated customer.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer(request);
    if (!auth) {
      throw new ApiError(401, "CUSTOMER_UNAUTHORIZED", "Please sign in to view preferences.");
    }

    const preferences = await customerNotificationService.getPreferences(
      auth.agencyId,
      auth.customerId
    );

    return apiSuccess(preferences);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/customer/notifications/preferences
 * Updates notification preferences for authenticated customer.
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer(request);
    if (!auth) {
      throw new ApiError(401, "CUSTOMER_UNAUTHORIZED", "Please sign in to update preferences.");
    }

    const body = await request.json();

    const updated = await customerNotificationService.updatePreferences(
      auth.agencyId,
      auth.customerId,
      body
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
