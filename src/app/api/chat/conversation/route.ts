import { NextResponse } from "next/server";
import { requireAgencyOwnerChatAccess } from "@/lib/api/context";
import { platformChatService } from "@/lib/services/platform-chat-service";
import { handleApiError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/conversation
 * Retrieves or lazily creates the single permanent conversation for the authenticated Agency Owner.
 */
export async function GET() {
  try {
    const context = await requireAgencyOwnerChatAccess();
    const conversation = await platformChatService.getOrCreateConversation(context.agencyId);

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
