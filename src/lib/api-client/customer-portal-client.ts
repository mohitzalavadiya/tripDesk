import {
  CustomerBookingSummaryView,
  CustomerTripDetailView,
  CustomerDocumentItemView,
  CustomerPaymentSummaryView,
  CustomerProfileView,
  CustomerFeedbackInput,
} from "@/lib/services/customer-portal-service";

export const customerPortalClient = {
  /**
   * List all bookings for customer
   */
  async getBookings(): Promise<CustomerBookingSummaryView[]> {
    const res = await fetch("/api/customer/bookings", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to load customer bookings.");
    }
    return json.data;
  },

  /**
   * Get single booking details
   */
  async getBooking(id: string): Promise<CustomerBookingSummaryView> {
    const res = await fetch(`/api/customer/bookings/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to load booking.");
    }
    return json.data;
  },

  /**
   * Get customer trip details with itinerary, hotels, vehicles, activities
   */
  async getTrip(tripId: string): Promise<CustomerTripDetailView> {
    const res = await fetch(`/api/customer/trips/${encodeURIComponent(tripId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to load trip details.");
    }
    return json.data;
  },

  /**
   * Get customer travel documents for a trip
   */
  async getTripDocuments(tripId: string): Promise<CustomerDocumentItemView[]> {
    const res = await fetch(`/api/customer/trips/${encodeURIComponent(tripId)}/documents`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to load documents.");
    }
    return json.data;
  },

  /**
   * Get customer payments & balance summary for a trip
   */
  async getTripPayments(tripId: string): Promise<CustomerPaymentSummaryView> {
    const res = await fetch(`/api/customer/trips/${encodeURIComponent(tripId)}/payments`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to load payments summary.");
    }
    return json.data;
  },

  /**
   * Submit post-tour review & ratings
   */
  async submitFeedback(tripId: string, data: CustomerFeedbackInput): Promise<any> {
    const res = await fetch(`/api/customer/trips/${encodeURIComponent(tripId)}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to submit feedback.");
    }
    return json.data;
  },

  /**
   * Get customer profile
   */
  async getProfile(): Promise<CustomerProfileView> {
    const res = await fetch("/api/customer/profile", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to load profile.");
    }
    return json.data;
  },

  /**
   * Update customer profile
   */
  async updateProfile(data: Partial<CustomerProfileView>): Promise<CustomerProfileView> {
    const res = await fetch("/api/customer/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to update profile.");
    }
    return json.data;
  },

  /**
   * Sign-in / access lookup
   */
  async access(bookingNumberOrToken: string, phoneOrEmail?: string): Promise<any> {
    const res = await fetch("/api/customer/auth/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingNumber: bookingNumberOrToken,
        phone: phoneOrEmail,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to access portal.");
    }
    return json.data;
  },

  /**
   * List notifications for customer
   */
  async getNotifications(query?: {
    unreadOnly?: boolean;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; meta: { total: number; unreadCount: number; page: number; limit: number } }> {
    const params = new URLSearchParams();
    if (query?.unreadOnly) params.set("unreadOnly", "true");
    if (query?.type) params.set("type", query.type);
    if (query?.page) params.set("page", query.page.toString());
    if (query?.limit) params.set("limit", query.limit.toString());

    const url = `/api/customer/notifications${params.toString() ? `?${params.toString()}` : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to load notifications.");
    }
    return { data: json.data, meta: json.meta };
  },

  /**
   * Get unread notifications count
   */
  async getUnreadNotificationsCount(): Promise<number> {
    const res = await fetch("/api/customer/notifications/unread-count", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      return 0;
    }
    return json.data?.unreadCount || 0;
  },

  /**
   * Mark notification as read
   */
  async markNotificationRead(id: string): Promise<any> {
    const res = await fetch(`/api/customer/notifications/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to mark notification as read.");
    }
    return json.data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(): Promise<number> {
    const res = await fetch("/api/customer/notifications/read-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to mark all notifications as read.");
    }
    return json.data?.count || 0;
  },

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(): Promise<any> {
    const res = await fetch("/api/customer/notifications/preferences", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to load preferences.");
    }
    return json.data;
  },

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(data: any): Promise<any> {
    const res = await fetch("/api/customer/notifications/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to update preferences.");
    }
    return json.data;
  },
};
