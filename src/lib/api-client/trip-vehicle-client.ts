import { TripVehicle, Vehicle } from "@prisma/client";
import {
  CreateTripVehicleInput,
  UpdateTripVehicleInput,
} from "@/lib/validation/trip-vehicle-schema";
import { SingleResponse, ApiClientError } from "./customer-client";

export interface TripVehicleWithVehicle extends TripVehicle {
  vehicle: Vehicle | null;
}

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

export const tripVehicleClient = {
  /**
   * Retrieves all vehicle assignments associated with a trip.
   */
  async getTripVehicles(tripId: string): Promise<SingleResponse<TripVehicleWithVehicle[]>> {
    const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/vehicles`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<TripVehicleWithVehicle[]>>(res);
  },

  /**
   * Retrieves a single Trip-Vehicle assignment by ID.
   */
  async getTripVehicle(tripId: string, vehicleId: string): Promise<SingleResponse<TripVehicleWithVehicle>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/vehicles/${encodeURIComponent(vehicleId)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<TripVehicleWithVehicle>>(res);
  },

  /**
   * Adds a new vehicle assignment to a trip.
   */
  async createTripVehicle(
    tripId: string,
    data: CreateTripVehicleInput
  ): Promise<SingleResponse<TripVehicleWithVehicle>> {
    const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<TripVehicleWithVehicle>>(res);
  },

  /**
   * Updates an existing Trip-Vehicle assignment.
   */
  async updateTripVehicle(
    tripId: string,
    vehicleId: string,
    data: UpdateTripVehicleInput
  ): Promise<SingleResponse<TripVehicleWithVehicle>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/vehicles/${encodeURIComponent(vehicleId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<SingleResponse<TripVehicleWithVehicle>>(res);
  },

  /**
   * Deletes a Trip-Vehicle assignment.
   */
  async deleteTripVehicle(
    tripId: string,
    vehicleId: string
  ): Promise<SingleResponse<{ message: string; tripVehicle: TripVehicle }>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/vehicles/${encodeURIComponent(vehicleId)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );

    return handleResponse<SingleResponse<{ message: string; tripVehicle: TripVehicle }>>(res);
  },
};
