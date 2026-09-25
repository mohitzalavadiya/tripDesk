import { ConversationView, ChatMessageView } from "@/lib/services/platform-chat-service";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

class PlatformChatClient {
  /**
   * For Agency Owner: Get or initialize their support conversation.
   */
  async getAgencyConversation(): Promise<ApiResponse<ConversationView>> {
    const res = await fetch("/api/chat/conversation", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    return res.json();
  }

  /**
   * For Platform Owner: List all agency conversations with search and filter.
   */
  async getAdminConversations(query?: {
    search?: string;
    unreadOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ConversationView[]>> {
    const params = new URLSearchParams();
    if (query?.search) params.set("search", query.search);
    if (query?.unreadOnly) params.set("unreadOnly", "true");
    if (query?.page) params.set("page", String(query.page));
    if (query?.limit) params.set("limit", String(query.limit));

    const res = await fetch(`/api/chat/admin/conversations?${params.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    return res.json();
  }

  /**
   * For Platform Owner: Get or create conversation for a specific agency.
   */
  async getAdminAgencyConversation(agencyId: string): Promise<ApiResponse<ConversationView>> {
    const res = await fetch(`/api/chat/admin/conversations/${agencyId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    return res.json();
  }

  /**
   * Get message history for a conversation.
   */
  async getMessages(
    conversationId: string,
    query?: {
      limit?: number;
      before?: string;
      after?: string;
    }
  ): Promise<ApiResponse<ChatMessageView[]>> {
    const params = new URLSearchParams();
    if (query?.limit) params.set("limit", String(query.limit));
    if (query?.before) params.set("before", query.before);
    if (query?.after) params.set("after", query.after);

    const res = await fetch(
      `/api/chat/conversations/${conversationId}/messages?${params.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );
    return res.json();
  }

  /**
   * Send a message in a conversation.
   */
  async sendMessage(
    conversationId: string,
    messageText: string,
    clientMessageId?: string
  ): Promise<ApiResponse<ChatMessageView>> {
    const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageText, clientMessageId }),
    });
    return res.json();
  }

  /**
   * Mark conversation as read.
   */
  async markAsRead(conversationId: string): Promise<ApiResponse<{ success: boolean; readAt: string }>> {
    const res = await fetch(`/api/chat/conversations/${conversationId}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tripdesk:chat-unread-updated"));
    }
    return data;
  }

  /**
   * Get unread support message count.
   */
  async getUnreadCount(): Promise<ApiResponse<{ unreadCount: number }>> {
    const res = await fetch("/api/chat/unread-count", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    return res.json();
  }
}

export const platformChatClient = new PlatformChatClient();
