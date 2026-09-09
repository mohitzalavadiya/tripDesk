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

  /**
   * Previews an Excel file for Hotel import without writing to the database.
   */
  async previewImport(file: File, mode: "SKIP" | "UPDATE" | "REJECT" = "SKIP"): Promise<SingleResponse<any>> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    const res = await fetch("/api/hotels/import?action=preview", {
      method: "POST",
      body: formData,
    });

    return handleResponse<SingleResponse<any>>(res);
  },

  /**
   * Executes the Hotel Excel import.
   */
  async executeImport(file: File, mode: "SKIP" | "UPDATE" | "REJECT" = "SKIP"): Promise<SingleResponse<any>> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    const res = await fetch("/api/hotels/import?action=execute", {
      method: "POST",
      body: formData,
    });

    return handleResponse<SingleResponse<any>>(res);
  },

  /**
   * Triggers download of the official sample Hotels.xlsx template.
   */
  async downloadSample(): Promise<void> {
    const res = await fetch("/api/hotels/sample", { method: "GET" });
    if (!res.ok) {
      throw new Error("Failed to download sample file.");
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Hotels.xlsx";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

