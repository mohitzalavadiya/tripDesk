import { requireAuthenticatedUser } from "@/lib/api/context";
import { ForbiddenError,handleApiError,NotFoundError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { platformChatService } from "@/lib/services/platform-chat-service";
import { UserRole } from "@prisma/client";
import { NextRequest,NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/conversations/[conversationId]/read
 * Updates the read boundary timestamp for the caller's role.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const context = await requireAuthenticatedUser();
    const { conversationId } = await params;
    const userAgencyId = context.agency?.id || context.dbUser?.agencyId;

    // Handle virtual conversation id
    const realId = conversationId;
    if (conversationId.startsWith("new_")) {
      const targetAgencyId = conversationId.replace("new_", "");
      if (!context.isPlatformOwner && userAgencyId !== targetAgencyId) {
        throw new ForbiddenError("You do not have permission to access this conversation.");
      }
      return NextResponse.json({ success: true, readAt: new Date().toISOString() });
    }

    const conv = await prisma.platformChatConversation.findUnique({
      where: { id: realId },
    });

    if (!conv) {
      throw new NotFoundError("Conversation not found.");
    }

    if (!context.isPlatformOwner && conv.agencyId !== userAgencyId) {
      throw new ForbiddenError("You do not have permission to access this conversation.");
    }

    const res = await platformChatService.markAsRead(
      conv.id,
      context.dbUser.role as UserRole
    );

    return NextResponse.json({
      success: true,
      data: res,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
