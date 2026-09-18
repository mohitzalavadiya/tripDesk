import { Activity, ActivityType } from "@prisma/client";
import {
  CreateActivityInput,
  UpdateActivityInput,
} from "@/lib/validation/activity-schema";
import {
  PaginatedResponse,
  SingleResponse,
  ApiClientError,
} from "./customer-client";

export type ActivityWithRelations = Activity & {
  destination?: {
    id: string;
    name: string;
    state: string | null;
    country: string;
    status: string;
  } | null;
};

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

export interface ActivityListParams {
  page?: number;
  limit?: number;
  search?: string;
  location?: string;
  destinationId?: string;
  type?: ActivityType;
  includeArchived?: boolean;
}

export const activityClient = {
  /**
   * Retrieves a paginated list of activities for the authenticated agency.
   */
  async getActivities(params: ActivityListParams = {}): Promise<PaginatedResponse<ActivityWithRelations>> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page.toString());
    if (params.limit) query.set("limit", params.limit.toString());
    if (params.search) query.set("search", params.search);
    if (params.location) query.set("location", params.location);
    if (params.destinationId) query.set("destinationId", params.destinationId);
    if (params.type) query.set("type", params.type);
    if (params.includeArchived) query.set("includeArchived", "true");

    const url = `/api/activities${query.toString() ? `?${query.toString()}` : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<PaginatedResponse<ActivityWithRelations>>(res);
  },

  /**
   * Retrieves a single activity record by ID.
   */
  async getActivity(id: string): Promise<SingleResponse<ActivityWithRelations>> {
    const res = await fetch(`/api/activities/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<Activity>>(res);
  },

  /**
   * Creates a new activity master record.
   */
  async createActivity(data: CreateActivityInput): Promise<SingleResponse<Activity>> {
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<Activity>>(res);
  },

  /**
   * Updates an existing activity master record.
   */
  async updateActivity(id: string, data: UpdateActivityInput): Promise<SingleResponse<Activity>> {
    const res = await fetch(`/api/activities/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<Activity>>(res);
  },

  /**
   * Soft-deletes (archives) an activity master record.
   */
  async archiveActivity(id: string): Promise<SingleResponse<{ message: string; activity: Activity }>> {
    const res = await fetch(`/api/activities/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<SingleResponse<{ message: string; activity: Activity }>>(res);
  },
};
