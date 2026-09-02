import {
  EnquiryFollowUp,
  FollowUpStatus,
  FollowUpType,
  EnquiryPriority,
} from "@prisma/client";
import {
  GlobalFollowUpQueryInput,
  CreateGlobalFollowUpInput,
  CompleteFollowUpInput,
  RescheduleFollowUpInput,
  CancelFollowUpInput,
} from "@/lib/validation/follow-up-schema";
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

export type FollowUpWithRelations = EnquiryFollowUp & {
  enquiry: {
    id: string;
    enquiryNumber: string;
    title: string;
    destination: string;
    status: string;
    priority: string;
    budget?: number | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    customer: {
      id: string;
      name: string;
      phone: string;
      email?: string | null;
    };
  };
};

export interface FollowUpSummaryStats {
  overdueCount: number;
  todayCount: number;
  upcomingCount: number;
  completedCount: number;
  totalPending: number;
}

export const followUpClient = {
  /**
   * List global follow-ups with scope, search, filter, and pagination
   */
  async getFollowUps(
    params?: GlobalFollowUpQueryInput
  ): Promise<PaginatedResponse<FollowUpWithRelations>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.scope) searchParams.set("scope", params.scope);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.type) searchParams.set("type", params.type);
    if (params?.priority) searchParams.set("priority", params.priority);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.enquiryId) searchParams.set("enquiryId", params.enquiryId);
    if (params?.customerId) searchParams.set("customerId", params.customerId);
    if (params?.startDate) searchParams.set("startDate", params.startDate);
    if (params?.endDate) searchParams.set("endDate", params.endDate);
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

    const queryStr = searchParams.toString();
    const res = await fetch(`/api/follow-ups${queryStr ? `?${queryStr}` : ""}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<PaginatedResponse<FollowUpWithRelations>>(res);
  },

  /**
   * Get follow-up telemetry summary counts
   */
  async getSummary(): Promise<SingleResponse<FollowUpSummaryStats>> {
    const res = await fetch("/api/follow-ups/summary", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<FollowUpSummaryStats>>(res);
  },

  /**
   * Create a new follow-up
   */
  async createFollowUp(
    data: CreateGlobalFollowUpInput
  ): Promise<SingleResponse<EnquiryFollowUp>> {
    const res = await fetch("/api/follow-ups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<EnquiryFollowUp>>(res);
  },

  /**
   * Complete a follow-up
   */
  async completeFollowUp(
    id: string,
    data: CompleteFollowUpInput
  ): Promise<SingleResponse<{ completed: EnquiryFollowUp; nextFollowUp?: EnquiryFollowUp | null }>> {
    const res = await fetch(`/api/follow-ups/${encodeURIComponent(id)}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<{ completed: EnquiryFollowUp; nextFollowUp?: EnquiryFollowUp | null }>>(res);
  },

  /**
   * Reschedule a follow-up
   */
  async rescheduleFollowUp(
    id: string,
    data: RescheduleFollowUpInput
  ): Promise<SingleResponse<EnquiryFollowUp>> {
    const res = await fetch(`/api/follow-ups/${encodeURIComponent(id)}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<EnquiryFollowUp>>(res);
  },

  /**
   * Cancel a follow-up
   */
  async cancelFollowUp(
    id: string,
    data: CancelFollowUpInput
  ): Promise<SingleResponse<EnquiryFollowUp>> {
    const res = await fetch(`/api/follow-ups/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<EnquiryFollowUp>>(res);
  },
};
