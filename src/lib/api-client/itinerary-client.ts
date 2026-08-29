import { ItineraryItem } from "@prisma/client";
import {
  CreateItineraryItemInput,
  UpdateItineraryItemInput,
} from "@/lib/validation/itinerary-schema";
import { SingleResponse, ApiClientError } from "./customer-client";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(json.error?.message || "An unexpected error occurred.") as ApiClientError;
    error.code = json.error?.code || (res.status === 401 ? "UNAUTHORIZED" : res.status === 403 ? "FORBIDDEN" : "API_ERROR");
    error.statusCode = res.status;
    error.details = json.error?.details;
    throw error;
  }

  return json;
}

export const itineraryClient = {
  /**
   * Retrieves all itinerary items associated with a trip.
   */
  async getItineraryItems(tripId: string): Promise<SingleResponse<ItineraryItem[]>> {
    const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/itinerary`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<ItineraryItem[]>>(res);
  },

  /**
   * Retrieves a single itinerary item by ID.
   */
  async getItineraryItem(tripId: string, itemId: string): Promise<SingleResponse<ItineraryItem>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/itinerary/${encodeURIComponent(itemId)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<ItineraryItem>>(res);
  },

  /**
   * Adds a new itinerary item to a trip.
   */
  async createItineraryItem(
    tripId: string,
    data: CreateItineraryItemInput
  ): Promise<SingleResponse<ItineraryItem>> {
    const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/itinerary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<ItineraryItem>>(res);
  },

  /**
   * Updates an existing itinerary item.
   */
  async updateItineraryItem(
    tripId: string,
    itemId: string,
    data: UpdateItineraryItemInput
  ): Promise<SingleResponse<ItineraryItem>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/itinerary/${encodeURIComponent(itemId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<SingleResponse<ItineraryItem>>(res);
  },

  /**
   * Deletes an itinerary item from a trip.
   */
  async deleteItineraryItem(
    tripId: string,
    itemId: string
  ): Promise<SingleResponse<{ message: string; item: ItineraryItem }>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/itinerary/${encodeURIComponent(itemId)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );

    return handleResponse<SingleResponse<{ message: string; item: ItineraryItem }>>(res);
  },
};
