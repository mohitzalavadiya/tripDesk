import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { platformChatService } from "@/lib/services/platform-chat-service";
import { handleApiError } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/chat/admin/conversations
 * Platform Owner centralized endpoint to list all agency conversations with search/unread filtering.
 */
export async function GET(request: NextRequest) {
  try {
    await requirePlatformOwnerContext();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const result = await platformChatService.listConversationsForPlatform({
      search,
      unreadOnly,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
