import { UserNotificationType, UserRole } from "@prisma/client";

export interface UserNotificationItem {
  id: string;
  userId: string;
  agencyId: string | null;
  role: UserRole;
  type: UserNotificationType;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  metadata?: Record<string, any> | null;
}

export interface ListUserNotificationsResponse {
  success: boolean;
  data: {
    data: UserNotificationItem[];
    meta: {
      total: number;
      unreadCount: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface SingleUserNotificationResponse {
  success: boolean;
  data: UserNotificationItem;
  error?: {
    code: string;
    message: string;
  };
}

export interface MarkAllReadResponse {
  success: boolean;
  data: {
    success: boolean;
    count: number;
    message: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

class NotificationClient {
  private baseUrl = "/api/notifications";

  /**
   * Fetch notifications and unread count for the current authenticated user
   */
  async getNotifications(params?: {
    unreadOnly?: boolean;
    limit?: number;
    page?: number;
    type?: UserNotificationType;
  }): Promise<ListUserNotificationsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.unreadOnly !== undefined) {
      searchParams.set("unreadOnly", String(params.unreadOnly));
    }
    if (params?.limit) {
      searchParams.set("limit", String(params.limit));
    }
    if (params?.page) {
      searchParams.set("page", String(params.page));
    }
    if (params?.type) {
      searchParams.set("type", params.type);
    }

    const query = searchParams.toString();
    const url = query ? `${this.baseUrl}?${query}` : this.baseUrl;

    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return res.json();
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(id: string): Promise<SingleUserNotificationResponse> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });

    return res.json();
  }

  /**
   * Mark all unread notifications as read
   */
  async markAllAsRead(): Promise<MarkAllReadResponse> {
    const res = await fetch(`${this.baseUrl}/read-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    return res.json();
  }
}

export const notificationClient = new NotificationClient();
