import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api/context";
import { platformChatService } from "@/lib/services/platform-chat-service";
import { handleApiError } from "@/lib/api/errors";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/unread-count
 * Returns the unread support chat count for the authenticated user.
 */
export async function GET() {
  try {
    const context = await requireAuthenticatedUser();

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
