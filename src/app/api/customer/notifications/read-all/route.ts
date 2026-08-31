import { NextRequest } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/auth/customer-auth";
import { customerNotificationService } from "@/lib/services/customer-notification-service";
import { apiSuccess, handleApiError, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * POST /api/customer/notifications/read-all
 * Marks all unread notifications as read for authenticated customer.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer(request);
    if (!auth) {
      throw new ApiError(401, "CUSTOMER_UNAUTHORIZED", "Please sign in to update notifications.");
    }

    const res = await customerNotificationService.markAllAsRead(
      auth.agencyId,
      auth.customerId
    );

    return apiSuccess({ count: res.count, message: "All notifications marked as read." });
  } catch (error) {
    return handleApiError(error);
  }
}
