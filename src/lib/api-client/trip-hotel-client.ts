import { TripHotel, Hotel } from "@prisma/client";
import {
  CreateTripHotelInput,
  UpdateTripHotelInput,
} from "@/lib/validation/trip-hotel-schema";
import { SingleResponse, ApiClientError } from "./customer-client";

export interface TripHotelWithHotel extends TripHotel {
  hotel: Hotel;
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

export const tripHotelClient = {
  /**
   * Retrieves all hotel assignments associated with a trip.
   */
  async getTripHotels(tripId: string): Promise<SingleResponse<TripHotelWithHotel[]>> {
    const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/hotels`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<TripHotelWithHotel[]>>(res);
  },

  /**
   * Retrieves a single Trip-Hotel assignment by ID.
   */
  async getTripHotel(tripId: string, hotelId: string): Promise<SingleResponse<TripHotelWithHotel>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/hotels/${encodeURIComponent(hotelId)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<TripHotelWithHotel>>(res);
  },

  /**
   * Adds a new hotel assignment to a trip.
   */
  async createTripHotel(
    tripId: string,
    data: CreateTripHotelInput
  ): Promise<SingleResponse<TripHotelWithHotel>> {
    const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/hotels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<TripHotelWithHotel>>(res);
  },

  /**
   * Updates an existing Trip-Hotel assignment.
   */
  async updateTripHotel(
    tripId: string,
    hotelId: string,
    data: UpdateTripHotelInput
  ): Promise<SingleResponse<TripHotelWithHotel>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/hotels/${encodeURIComponent(hotelId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<SingleResponse<TripHotelWithHotel>>(res);
  },

  /**
   * Deletes a Trip-Hotel assignment.
   */
  async deleteTripHotel(
    tripId: string,
    hotelId: string
  ): Promise<SingleResponse<{ message: string; tripHotel: TripHotel }>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/hotels/${encodeURIComponent(hotelId)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );

    return handleResponse<SingleResponse<{ message: string; tripHotel: TripHotel }>>(res);
  },
};
