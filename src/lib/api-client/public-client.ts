import { PublicTripPayload } from "@/lib/services/trip-public-service";
import { PublicBookingPayload } from "@/lib/services/booking-public-service";

export const tripPublicClient = {
  async getByToken(token: string): Promise<PublicTripPayload> {
    const res = await fetch(`/api/trips/public/${encodeURIComponent(token)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Trip not found or link has expired.");
    }

    return json.data;
  },

  async getFeedback(token: string) {
    const res = await fetch(`/api/trips/public/${encodeURIComponent(token)}/feedback`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Unable to check feedback status.");
    }

    return json.data;
  },

  async submitFeedback(token: string, payload: any) {
    const res = await fetch(`/api/trips/public/${encodeURIComponent(token)}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Unable to submit feedback.");
    }

    return json.data;
  },

  async getNotifications(token: string, params: { unreadOnly?: boolean; type?: string; page?: number; limit?: number } = {}) {
    const searchParams = new URLSearchParams();
    if (params.unreadOnly) searchParams.set("unreadOnly", "true");
    if (params.type) searchParams.set("type", params.type);
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());

    const res = await fetch(`/api/trips/public/${encodeURIComponent(token)}/notifications?${searchParams.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Unable to fetch notifications.");
    }

    return json.data;
  },

  async markNotificationRead(token: string, notificationId: string) {
    const res = await fetch(`/api/trips/public/${encodeURIComponent(token)}/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Unable to mark notification as read.");
    }

    return json.data;
  },
};

export const bookingPublicClient = {
  async getByToken(token: string): Promise<PublicBookingPayload> {
    const res = await fetch(`/api/bookings/public/${encodeURIComponent(token)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Booking not found or link has expired.");
    }

    return json.data;
  },
};
