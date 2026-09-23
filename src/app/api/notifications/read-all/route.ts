import { NextRequest } from "next/server";
import {
  getRequestContext,
  apiSuccess,
  handleApiError,
  UnauthorizedError,
} from "@/lib/api";
import { internalNotificationService } from "@/lib/services/internal-notification-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/read-all
 * Marks all unread notifications as read for the authenticated user.
 */
export async function POST(_request: NextRequest) {
  try {
    const context = await getRequestContext();
    if (!context || !context.dbUser) {
      throw new UnauthorizedError("Authentication required.");
    }

    const result = await internalNotificationService.markAllAsRead(
      context.dbUser.id
    );

    return apiSuccess({
      success: true,
      count: result.count,
      message: "All notifications marked as read.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
