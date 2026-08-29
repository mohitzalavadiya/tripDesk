import { Traveler } from "@prisma/client";
import {
  CreateTravelerInput,
  UpdateTravelerInput,
} from "@/lib/validation/traveler-schema";
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

export const travelerClient = {
  /**
   * Retrieves all travelers associated with a trip.
   */
  async getTravelers(tripId: string): Promise<SingleResponse<Traveler[]>> {
    const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/travelers`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<Traveler[]>>(res);
  },

  /**
   * Retrieves a single traveler record by ID.
   */
  async getTraveler(tripId: string, travelerId: string): Promise<SingleResponse<Traveler>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/travelers/${encodeURIComponent(travelerId)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<Traveler>>(res);
  },

  /**
   * Adds a new traveler to a trip.
   */
  async createTraveler(
    tripId: string,
    data: CreateTravelerInput
  ): Promise<SingleResponse<Traveler>> {
    const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/travelers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<Traveler>>(res);
  },

  /**
   * Updates an existing traveler record.
   */
  async updateTraveler(
    tripId: string,
    travelerId: string,
    data: UpdateTravelerInput
  ): Promise<SingleResponse<Traveler>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/travelers/${encodeURIComponent(travelerId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<SingleResponse<Traveler>>(res);
  },

  /**
   * Deletes a traveler from a trip.
   */
  async deleteTraveler(
    tripId: string,
    travelerId: string
  ): Promise<SingleResponse<{ message: string; traveler: Traveler }>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/travelers/${encodeURIComponent(travelerId)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );

    return handleResponse<SingleResponse<{ message: string; traveler: Traveler }>>(res);
  },
};
