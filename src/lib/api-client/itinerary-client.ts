import {
ApplyDayTemplateInput,
ApplyPackageTemplateInput,
CreateItineraryItemInput,
DeleteDayInput,
DuplicateDayInput,
ReorderDayInput,
ReorderItemInput,
SaveAsTemplateInput,
UpdateItineraryItemInput,
} from "@/lib/validation/itinerary-schema";
import { ItineraryItem } from "@prisma/client";
import { ApiClientError,SingleResponse } from "./customer-client";

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
   * Updates an existing itinerary item (supports expectedUpdatedAt for concurrency).
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

  /**
   * Duplicates an entire day schedule (ItineraryItems only).
   */
  async duplicateDay(
    tripId: string,
    data: DuplicateDayInput
  ): Promise<SingleResponse<{ message: string; items: ItineraryItem[] }>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/itinerary/duplicate-day`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<SingleResponse<{ message: string; items: ItineraryItem[] }>>(res);
  },

  /**
   * Deletes a complete day schedule and shifts subsequent days down by 1.
   */
  async deleteDay(
    tripId: string,
    data: DeleteDayInput
  ): Promise<SingleResponse<{ message: string; deletedCount: number; shiftedCount: number }>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/itinerary/delete-day`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<SingleResponse<{ message: string; deletedCount: number; shiftedCount: number }>>(res);
  },

  /**
   * Reorders an entire day group Up or Down.
   */
  async reorderDay(
    tripId: string,
    data: ReorderDayInput
  ): Promise<SingleResponse<{ message: string }>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/itinerary/reorder-day`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<SingleResponse<{ message: string }>>(res);
  },

  /**
   * Reorders an itinerary item Up or Down within its day group.
   */
  async reorderItem(
    tripId: string,
    data: ReorderItemInput
  ): Promise<SingleResponse<{ message: string }>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/itinerary/reorder-item`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<SingleResponse<{ message: string }>>(res);
  },

  /**
   * Applies a Day Template to a specific trip day.
   */
  async applyDayTemplate(
    tripId: string,
    data: ApplyDayTemplateInput
  ): Promise<SingleResponse<{ message: string; items: ItineraryItem[] }>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/itinerary/apply-day-template`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<SingleResponse<{ message: string; items: ItineraryItem[] }>>(res);
  },

  /**
   * Applies a Package Template via Append or Replace mode.
   */
  async applyPackageTemplate(
    tripId: string,
    data: ApplyPackageTemplateInput
  ): Promise<SingleResponse<{ message: string; result: { addedCount: number; mode: string } }>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/itinerary/apply-package-template`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<
      SingleResponse<{ message: string; result: { addedCount: number; mode: string } }>
    >(res);
  },

  /**
   * Saves content from current trip as a reusable DAY or PACKAGE template.
   */
  async saveAsTemplate(
    tripId: string,
    data: SaveAsTemplateInput
  ): Promise<SingleResponse<any>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/itinerary/save-as-template`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<SingleResponse<any>>(res);
  },
};
