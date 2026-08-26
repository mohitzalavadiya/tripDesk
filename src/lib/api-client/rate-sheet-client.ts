import { RateSheet } from "@prisma/client";
import {
  CreateRateSheetPayload,
  UpdateRateSheetPayload,
  RateSheetQueryParams,
  RateLookupQueryParams,
} from "@/lib/validation/rate-sheet-schema";
import { PaginatedResponse, SingleResponse, ApiClientError } from "./customer-client";
import { RateSheetWithRelations, MatchedRateResult } from "@/lib/services/rate-sheet-service";

export type { RateSheetWithRelations, MatchedRateResult };

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

export const rateSheetClient = {
  /**
   * Retrieves paginated, search-filtered rate sheets.
   */
  async getRateSheets(
    params?: Partial<RateSheetQueryParams>
  ): Promise<PaginatedResponse<RateSheetWithRelations>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.inventoryType) searchParams.set("inventoryType", params.inventoryType);
    if (params?.supplierId) searchParams.set("supplierId", params.supplierId);
    if (params?.hotelId) searchParams.set("hotelId", params.hotelId);
    if (params?.vehicleId) searchParams.set("vehicleId", params.vehicleId);
    if (params?.activityId) searchParams.set("activityId", params.activityId);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.seasonName) searchParams.set("seasonName", params.seasonName);
    if (params?.validDate) searchParams.set("validDate", new Date(params.validDate).toISOString());
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
    if (params?.includeArchived !== undefined) {
      searchParams.set("includeArchived", String(params.includeArchived));
    }

    const url = `/api/rate-sheets${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<PaginatedResponse<RateSheetWithRelations>>(res);
  },

  /**
   * Retrieves single rate sheet record.
   */
  async getRateSheet(id: string): Promise<SingleResponse<RateSheetWithRelations>> {
    const res = await fetch(`/api/rate-sheets/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<RateSheetWithRelations>>(res);
  },

  /**
   * Resolves applicable rate preview.
   */
  async lookupRate(params: RateLookupQueryParams): Promise<SingleResponse<MatchedRateResult>> {
    const searchParams = new URLSearchParams();
    searchParams.set("inventoryType", params.inventoryType);
    searchParams.set("inventoryId", params.inventoryId);
    searchParams.set("date", new Date(params.date).toISOString());
    if (params.roomType) searchParams.set("roomType", params.roomType);
    if (params.mealPlan) searchParams.set("mealPlan", params.mealPlan);
    if (params.pricingType) searchParams.set("pricingType", params.pricingType);
    if (params.adults !== undefined) searchParams.set("adults", String(params.adults));
    if (params.children !== undefined) searchParams.set("children", String(params.children));

    const res = await fetch(`/api/rate-sheets/lookup?${searchParams.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<MatchedRateResult>>(res);
  },

  /**
   * Creates a new rate sheet.
   */
  async createRateSheet(data: CreateRateSheetPayload): Promise<SingleResponse<RateSheet>> {
    const res = await fetch("/api/rate-sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<RateSheet>>(res);
  },

  /**
   * Updates an existing rate sheet.
   */
  async updateRateSheet(
    id: string,
    data: UpdateRateSheetPayload
  ): Promise<SingleResponse<RateSheet>> {
    const res = await fetch(`/api/rate-sheets/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<RateSheet>>(res);
  },

  /**
   * Soft archives a rate sheet.
   */
  async archiveRateSheet(
    id: string
  ): Promise<SingleResponse<{ message: string; rateSheet: RateSheet }>> {
    const res = await fetch(`/api/rate-sheets/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<SingleResponse<{ message: string; rateSheet: RateSheet }>>(res);
  },
};
