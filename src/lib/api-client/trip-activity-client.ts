import { TripActivity, Activity } from "@prisma/client";
import {
  CreateTripActivityInput,
  UpdateTripActivityInput,
} from "@/lib/validation/trip-activity-schema";
import { SingleResponse, ApiClientError } from "./customer-client";

export interface TripActivityWithActivity extends TripActivity {
  activity: Activity | null;
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

export const tripActivityClient = {
  /**
   * Retrieves all activity assignments associated with a trip.
   */
  async getTripActivities(tripId: string): Promise<SingleResponse<TripActivityWithActivity[]>> {
    const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/activities`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<TripActivityWithActivity[]>>(res);
  },

  /**
   * Retrieves a single Trip-Activity assignment by ID.
   */
  async getTripActivity(tripId: string, activityId: string): Promise<SingleResponse<TripActivityWithActivity>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<TripActivityWithActivity>>(res);
  },

  /**
   * Adds a new activity assignment to a trip.
   */
  async createTripActivity(
    tripId: string,
    data: CreateTripActivityInput
  ): Promise<SingleResponse<TripActivityWithActivity>> {
    const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<TripActivityWithActivity>>(res);
  },

  /**
   * Updates an existing Trip-Activity assignment.
   */
  async updateTripActivity(
    tripId: string,
    activityId: string,
    data: UpdateTripActivityInput
  ): Promise<SingleResponse<TripActivityWithActivity>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<SingleResponse<TripActivityWithActivity>>(res);
  },

  /**
   * Deletes a Trip-Activity assignment.
   */
  async deleteTripActivity(
    tripId: string,
    activityId: string
  ): Promise<SingleResponse<{ message: string; tripActivity: TripActivity }>> {
    const res = await fetch(
      `/api/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(activityId)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );

    return handleResponse<SingleResponse<{ message: string; tripActivity: TripActivity }>>(res);
  },
};
