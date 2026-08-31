import { NextRequest } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/auth/customer-auth";
import { customerNotificationService } from "@/lib/services/customer-notification-service";
import { apiSuccess, handleApiError, ApiError } from "@/lib/api";
import { CustomerNotificationType } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/customer/notifications
 * Lists notifications for authenticated customer with filters and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedCustomer(request);
    if (!auth) {
      throw new ApiError(401, "CUSTOMER_UNAUTHORIZED", "Please sign in to view notifications.");
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const typeParam = searchParams.get("type");
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    let type: CustomerNotificationType | undefined;
    if (typeParam && Object.values(CustomerNotificationType).includes(typeParam as CustomerNotificationType)) {
      type = typeParam as CustomerNotificationType;
    }

    const result = await customerNotificationService.listCustomerNotifications(
      auth.agencyId,
      auth.customerId,
      { unreadOnly, type, page, limit }
    );

    return apiSuccess(result.data, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}
