import { NextRequest } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/auth/customer-auth";
import { customerNotificationService } from "@/lib/services/customer-notification-service";
import { apiSuccess, handleApiError, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/customer/notifications/unread-count
 * Returns unread notification count for the authenticated customer.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer(request);
    if (!auth) {
      throw new ApiError(401, "CUSTOMER_UNAUTHORIZED", "Please sign in to view unread count.");
    }

    const unreadCount = await customerNotificationService.getUnreadCount(
      auth.agencyId,
      auth.customerId
    );

    return apiSuccess({ unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}
