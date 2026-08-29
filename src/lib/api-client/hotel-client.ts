import { Hotel } from "@prisma/client";
import {
  CreateHotelInput,
  UpdateHotelInput,
} from "@/lib/validation/hotel-schema";
import {
  PaginatedResponse,
  SingleResponse,
  ApiClientError,
} from "./customer-client";

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

export interface HotelListParams {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  includeArchived?: boolean;
}

export const hotelClient = {
  /**
   * Retrieves a paginated list of hotels for the authenticated agency.
   */
  async getHotels(params: HotelListParams = {}): Promise<PaginatedResponse<Hotel>> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page.toString());
    if (params.limit) query.set("limit", params.limit.toString());
    if (params.search) query.set("search", params.search);
    if (params.city) query.set("city", params.city);
    if (params.includeArchived) query.set("includeArchived", "true");

    const url = `/api/hotels${query.toString() ? `?${query.toString()}` : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<PaginatedResponse<Hotel>>(res);
  },

  /**
   * Retrieves a single hotel record by ID.
   */
  async getHotel(id: string): Promise<SingleResponse<Hotel>> {
    const res = await fetch(`/api/hotels/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<Hotel>>(res);
  },

  /**
   * Creates a new hotel master record.
   */
  async createHotel(data: CreateHotelInput): Promise<SingleResponse<Hotel>> {
    const res = await fetch("/api/hotels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<Hotel>>(res);
  },

  /**
   * Updates an existing hotel master record.
   */
  async updateHotel(id: string, data: UpdateHotelInput): Promise<SingleResponse<Hotel>> {
    const res = await fetch(`/api/hotels/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<Hotel>>(res);
  },

  /**
   * Soft-deletes (archives) a hotel master record.
   */
  async archiveHotel(id: string): Promise<SingleResponse<{ message: string; hotel: Hotel }>> {
    const res = await fetch(`/api/hotels/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<SingleResponse<{ message: string; hotel: Hotel }>>(res);
  },
};
