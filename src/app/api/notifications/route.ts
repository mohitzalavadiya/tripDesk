import { NextRequest } from "next/server";
import {
  getRequestContext,
  apiSuccess,
  handleApiError,
  validateQueryParams,
  UnauthorizedError,
} from "@/lib/api";
import { internalNotificationService } from "@/lib/services/internal-notification-service";
import { listUserNotificationsSchema } from "@/lib/validation/user-notification-schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications
 * Lists internal notifications and unread count for the authenticated user (Platform Owner or Agency Owner).
 */
export async function GET(request: NextRequest) {
  try {
    const context = await getRequestContext();
    if (!context || !context.dbUser) {
      throw new UnauthorizedError("Authentication required.");
    }

    const queryParams = validateQueryParams(
      listUserNotificationsSchema,
      request.nextUrl.searchParams
    );

    const result = await internalNotificationService.listNotifications(
      context.dbUser.id,
      queryParams
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
