import { Destination } from "@prisma/client";
import {
  CreateDestinationInput,
  UpdateDestinationInput,
  DestinationListQueryInput,
} from "@/lib/validation/destination-schema";
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

export const destinationClient = {
  /**
   * Retrieves a paginated list of destinations for the authenticated agency.
   */
  async getDestinations(params: Partial<DestinationListQueryInput> = {}): Promise<PaginatedResponse<Destination>> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page.toString());
    if (params.limit) query.set("limit", params.limit.toString());
    if (params.search) query.set("search", params.search);
    if (params.status) query.set("status", params.status);
    if (params.state) query.set("state", params.state);

    const url = `/api/destinations${query.toString() ? `?${query.toString()}` : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<PaginatedResponse<Destination>>(res);
  },

  /**
   * Retrieves a single destination record by ID.
   */
  async getDestination(id: string): Promise<SingleResponse<Destination>> {
    const res = await fetch(`/api/destinations/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<Destination>>(res);
  },

  /**
   * Creates a new destination master record.
   */
  async createDestination(data: CreateDestinationInput): Promise<SingleResponse<Destination>> {
    const res = await fetch("/api/destinations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<Destination>>(res);
  },

  /**
   * Updates an existing destination master record.
   */
  async updateDestination(id: string, data: UpdateDestinationInput): Promise<SingleResponse<Destination>> {
    const res = await fetch(`/api/destinations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<Destination>>(res);
  },

  /**
   * Deletes a destination master record.
   */
  async deleteDestination(id: string): Promise<SingleResponse<{ message: string; destination: Destination }>> {
    const res = await fetch(`/api/destinations/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<SingleResponse<{ message: string; destination: Destination }>>(res);
  },
};
