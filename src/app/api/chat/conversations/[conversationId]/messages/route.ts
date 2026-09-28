import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/api/context";
import { platformChatService } from "@/lib/services/platform-chat-service";
import { handleApiError, ForbiddenError, NotFoundError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Helper to verify conversation access for the authenticated user.
 */
async function resolveAndAuthorizeConversation(
  conversationId: string,
  context: any
) {
  const userAgencyId = context.agency?.id || context.dbUser?.agencyId;

  // If conversationId starts with "new_", resolve by agencyId
  let conv = null;
  if (conversationId.startsWith("new_")) {
    const targetAgencyId = conversationId.replace("new_", "");
    if (!context.isPlatformOwner && userAgencyId !== targetAgencyId) {
      throw new ForbiddenError("You do not have permission to access this conversation.");
    }
    const created = await platformChatService.getOrCreateConversation(targetAgencyId);
    return { id: created.id, agencyId: targetAgencyId };
  }

  conv = await prisma.platformChatConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conv) {
    throw new NotFoundError("Conversation not found.");
  }

  if (!context.isPlatformOwner) {
    if (conv.agencyId !== userAgencyId) {
      throw new ForbiddenError("You do not have permission to access this conversation.");
    }
  }

  return conv;
}

/**
 * GET /api/chat/conversations/[conversationId]/messages
 * Fetches message history for authorized participants.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const context = await requireAuthenticatedUser();
    const { conversationId } = await params;

    const conv = await resolveAndAuthorizeConversation(conversationId, context);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const beforeParam = searchParams.get("before");
    const afterParam = searchParams.get("after");

    const messages = await platformChatService.getMessages(conv.id, {
      limit,
      before: beforeParam ? new Date(beforeParam) : undefined,
      after: afterParam ? new Date(afterParam) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/chat/conversations/[conversationId]/messages
 * Sends a message with server-derived sender identity.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const context = await requireAuthenticatedUser();
    const { conversationId } = await params;

    const conv = await resolveAndAuthorizeConversation(conversationId, context);

    const body = await request.json();
    const messageText = body?.messageText || "";
    const clientMessageId = body?.clientMessageId || undefined;

    const message = await platformChatService.sendMessage({
      conversationId: conv.id,
      agencyId: conv.agencyId,
      senderUserId: context.dbUser.id,
      senderRole: context.dbUser.role as UserRole,
      messageText,
      clientMessageId,
    });

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
