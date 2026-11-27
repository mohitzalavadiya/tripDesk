import { requireAgencyOwnerChatAccess,
  enforceStaffPermission,
} from "@/lib/api";
import { handleApiError } from "@/lib/api/errors";
import { platformChatService } from "@/lib/services/platform-chat-service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/conversation
 * Retrieves or lazily creates the single permanent conversation for the authenticated Agency Member.
 */
export async function GET() {
  try {
    const context = await requireAgencyOwnerChatAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "SUPPORT_CHAT", "VIEW");
    const conversation = await platformChatService.getOrCreateConversation(context.agencyId);

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
