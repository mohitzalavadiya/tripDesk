import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { platformChatService } from "@/lib/services/platform-chat-service";
import { handleApiError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/admin/conversations/[agencyId]
 * Platform Owner retrieves or initializes conversation for a specific target agency.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agencyId: string }> }
) {
  try {
    await requirePlatformOwnerContext();
    const { agencyId } = await params;

    const conversation = await platformChatService.getOrCreateConversation(agencyId);

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
