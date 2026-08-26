import { Trip } from "@prisma/client";
import {
  CreateTripInput,
  UpdateTripInput,
  TripQueryParams,
} from "@/lib/validation/trip-schema";
import { TripWithRelations } from "@/lib/services/trip-service";
import { PaginatedResponse, SingleResponse, ApiClientError } from "./customer-client";

export type { TripWithRelations };


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

export const tripClient = {
  /**
   * Fetches a paginated, filtered list of trips for the authenticated agency.
   */
  async getTrips(params?: Partial<TripQueryParams>): Promise<PaginatedResponse<TripWithRelations>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.customerId) searchParams.set("customerId", params.customerId);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.includeArchived !== undefined) {
      searchParams.set("includeArchived", String(params.includeArchived));
    }

    const url = `/api/trips${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<PaginatedResponse<TripWithRelations>>(res);
  },

  /**
   * Retrieves a single trip record by ID with relations.
   */
  async getTrip(id: string): Promise<SingleResponse<TripWithRelations>> {
    const res = await fetch(`/api/trips/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<TripWithRelations>>(res);
  },

  /**
   * Creates a new trip under the authenticated agency.
   */
  async createTrip(data: CreateTripInput): Promise<SingleResponse<Trip>> {
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<Trip>>(res);
  },

  /**
   * Updates an existing trip record.
   */
  async updateTrip(id: string, data: UpdateTripInput): Promise<SingleResponse<Trip>> {
    const res = await fetch(`/api/trips/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<Trip>>(res);
  },

  /**
   * Soft-deletes (archives) a trip record.
   */
  async archiveTrip(id: string): Promise<SingleResponse<{ message: string; trip: Trip }>> {
    const res = await fetch(`/api/trips/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<SingleResponse<{ message: string; trip: Trip }>>(res);
  },
};
