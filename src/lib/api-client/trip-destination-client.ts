import { TripDestination, Destination } from "@prisma/client";
import {
  AddTripDestinationInput,
  ReorderTripDestinationsInput,
} from "@/lib/validation/trip-destination-schema";
import { SingleResponse, ApiClientError } from "./customer-client";

export interface TripDestinationWithDestination extends TripDestination {
  destination: Destination;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(
      json.error?.message || "An unexpected error occurred."
    ) as ApiClientError;
    error.code =
      json.error?.code ||
      (res.status === 401
        ? "UNAUTHORIZED"
        : res.status === 403
        ? "FORBIDDEN"
        : "API_ERROR");
    error.statusCode = res.status;
    error.details = json.error?.details;
    throw error;
  }

  return json;
}

export const tripDestinationClient = {
  /**
   * Retrieves all TripDestinations for a trip, ordered by sequence.
   */
  async getTripDestinations(
    tripId: string
  ): Promise<SingleResponse<TripDestinationWithDestination[]>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/destinations`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<TripDestinationWithDestination[]>>(res);
  },

  /**
   * Retrieves a single TripDestination by ID.
   */
  async getTripDestination(
    tripId: string,
    destinationId: string
  ): Promise<SingleResponse<TripDestinationWithDestination>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/destinations/${encodeURIComponent(
        destinationId
      )}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<TripDestinationWithDestination>>(res);
  },

  /**
   * Adds a destination to a trip.
   */
  async addTripDestination(
    tripId: string,
    data: AddTripDestinationInput
  ): Promise<SingleResponse<TripDestinationWithDestination>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/destinations`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<SingleResponse<TripDestinationWithDestination>>(res);
  },

  /**
   * Reorders all destination legs for a trip.
   */
  async reorderTripDestinations(
    tripId: string,
    data: ReorderTripDestinationsInput
  ): Promise<SingleResponse<TripDestinationWithDestination[]>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/destinations/reorder`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<SingleResponse<TripDestinationWithDestination[]>>(res);
  },

  /**
   * Deletes a destination from a trip and resequences remaining destinations.
   */
  async deleteTripDestination(
    tripId: string,
    destinationId: string
  ): Promise<SingleResponse<{ message: string; tripDestination: TripDestination }>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/destinations/${encodeURIComponent(
        destinationId
      )}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );

    return handleResponse<
      SingleResponse<{ message: string; tripDestination: TripDestination }>
    >(res);
  },
};
