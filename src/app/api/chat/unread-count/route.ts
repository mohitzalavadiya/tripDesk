import { enforceStaffPermission, requireAuthenticatedUser } from "@/lib/api";
import { handleApiError } from "@/lib/api/errors";
import { platformChatService } from "@/lib/services/platform-chat-service";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/unread-count
 * Returns the unread support chat count for the authenticated user.
 */
export async function GET() {
  try {
    const context = await requireAuthenticatedUser();
    if (context.isAgencyStaff && context.dbUser?.agencyId) {
      await enforceStaffPermission(
        context.dbUser.role,
        context.dbUser.agencyId,
        context.dbUser.id,
        "SUPPORT_CHAT",
        "VIEW"
      );
    }

    const count = await platformChatService.getUnreadCount({
      role: context.dbUser.role as UserRole,
      agencyId: context.agency?.id || null,
    });

    return NextResponse.json({
      success: true,
      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
