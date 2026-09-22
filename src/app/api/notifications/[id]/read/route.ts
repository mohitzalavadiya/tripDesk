import { NextRequest } from "next/server";
import {
  getRequestContext,
  apiSuccess,
  handleApiError,
  UnauthorizedError,
  NotFoundError,
} from "@/lib/api";
import { internalNotificationService } from "@/lib/services/internal-notification-service";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/notifications/[id]/read
 * Marks a single notification as read for the authenticated user.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getRequestContext();
    if (!context || !context.dbUser) {
      throw new UnauthorizedError("Authentication required.");
    }

    const { id } = await params;
    if (!id) {
      throw new NotFoundError("Notification ID is required.");
    }

    const updated = await internalNotificationService.markAsRead(
      context.dbUser.id,
      id
    );

    if (!updated) {
      throw new NotFoundError("Notification not found or access denied.");
    }

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
