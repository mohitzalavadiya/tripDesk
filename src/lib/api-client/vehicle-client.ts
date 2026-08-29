import { Vehicle } from "@prisma/client";
import {
  CreateVehicleInput,
  UpdateVehicleInput,
} from "@/lib/validation/vehicle-schema";
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

export interface VehicleListParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  includeArchived?: boolean;
}

export const vehicleClient = {
  /**
   * Retrieves a paginated list of vehicles for the authenticated agency.
   */
  async getVehicles(params: VehicleListParams = {}): Promise<PaginatedResponse<Vehicle>> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page.toString());
    if (params.limit) query.set("limit", params.limit.toString());
    if (params.search) query.set("search", params.search);
    if (params.type) query.set("type", params.type);
    if (params.includeArchived) query.set("includeArchived", "true");

    const url = `/api/vehicles${query.toString() ? `?${query.toString()}` : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<PaginatedResponse<Vehicle>>(res);
  },

  /**
   * Retrieves a single vehicle record by ID.
   */
  async getVehicle(id: string): Promise<SingleResponse<Vehicle>> {
    const res = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<Vehicle>>(res);
  },

  /**
   * Creates a new vehicle master record.
   */
  async createVehicle(data: CreateVehicleInput): Promise<SingleResponse<Vehicle>> {
    const res = await fetch("/api/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<Vehicle>>(res);
  },

  /**
   * Updates an existing vehicle master record.
   */
  async updateVehicle(id: string, data: UpdateVehicleInput): Promise<SingleResponse<Vehicle>> {
    const res = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<Vehicle>>(res);
  },

  /**
   * Soft-deletes (archives) a vehicle master record.
   */
  async archiveVehicle(id: string): Promise<SingleResponse<{ message: string; vehicle: Vehicle }>> {
    const res = await fetch(`/api/vehicles/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<SingleResponse<{ message: string; vehicle: Vehicle }>>(res);
  },
};
