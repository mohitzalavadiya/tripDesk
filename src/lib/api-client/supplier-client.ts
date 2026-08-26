import { Supplier } from "@prisma/client";
import {
  CreateSupplierPayload,
  UpdateSupplierPayload,
  SupplierQueryParams,
} from "@/lib/validation/supplier-schema";
import { PaginatedResponse, SingleResponse, ApiClientError } from "./customer-client";
import { SupplierWithCounts, SupplierDetails360 } from "@/lib/services/supplier-service";

export type { SupplierWithCounts, SupplierDetails360 };

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

export const supplierClient = {
  /**
   * Retrieves paginated, search-filtered suppliers for the authenticated agency.
   */
  async getSuppliers(
    params?: Partial<SupplierQueryParams>
  ): Promise<PaginatedResponse<SupplierWithCounts>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.city) searchParams.set("city", params.city);
    if (params?.type) searchParams.set("type", params.type);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
    if (params?.includeArchived !== undefined) {
      searchParams.set("includeArchived", String(params.includeArchived));
    }

    const url = `/api/suppliers${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<PaginatedResponse<SupplierWithCounts>>(res);
  },

  /**
   * Retrieves single supplier 360 profile with linked inventory and rate sheets.
   */
  async getSupplier(id: string): Promise<SingleResponse<SupplierDetails360>> {
    const res = await fetch(`/api/suppliers/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<SupplierDetails360>>(res);
  },

  /**
   * Creates a new supplier.
   */
  async createSupplier(data: CreateSupplierPayload): Promise<SingleResponse<Supplier>> {
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<Supplier>>(res);
  },

  /**
   * Updates an existing supplier.
   */
  async updateSupplier(
    id: string,
    data: UpdateSupplierPayload
  ): Promise<SingleResponse<Supplier>> {
    const res = await fetch(`/api/suppliers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<Supplier>>(res);
  },

  /**
   * Soft archives a supplier.
   */
  async archiveSupplier(
    id: string
  ): Promise<SingleResponse<{ message: string; supplier: Supplier }>> {
    const res = await fetch(`/api/suppliers/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<SingleResponse<{ message: string; supplier: Supplier }>>(res);
  },
};
