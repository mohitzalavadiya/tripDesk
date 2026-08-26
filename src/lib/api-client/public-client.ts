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
