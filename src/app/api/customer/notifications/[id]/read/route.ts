import { NextRequest } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/auth/customer-auth";
import { customerNotificationService } from "@/lib/services/customer-notification-service";
import { apiSuccess, handleApiError, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/customer/notifications/[id]/read
 * Marks a single notification as read with ownership verification.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedCustomer(request);
    if (!auth) {
      throw new ApiError(401, "CUSTOMER_UNAUTHORIZED", "Please sign in to update notification status.");
    }

    const { id } = await params;
    const notification = await customerNotificationService.markAsRead(
      auth.agencyId,
      auth.customerId,
      id
    );

    if (!notification) {
      throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "Notification not found or access denied.");
    }

    return apiSuccess(notification);
  } catch (error) {
    return handleApiError(error);
  }
}
