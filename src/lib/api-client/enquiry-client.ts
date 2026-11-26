import {
  AssignLeadInput,
  CheckDuplicateEnquiryQuery,
ConvertEnquiryToTripInput,
CreateEnquiryInput,
CreateFollowUpInput,
EnquiryQueryInput,
QuickLogInteractionInput,
MarkEnquiryLostInput,
TransitionStageInput,
UpdateEnquiryInput,
UpdateFollowUpInput,
} from "@/lib/validation/enquiry-schema";
import type {
Enquiry,
EnquiryFollowUp,
} from "@prisma/client";
import {
ApiClientError,
PaginatedResponse,
SingleResponse,
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

export type EnquiryWithRelations = Enquiry & {
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    address?: string | null;
  };
  convertedTrip?: {
    id: string;
    title: string;
    tripNumber: string;
    startDate: Date | string;
    endDate: Date | string;
    status: string;
    bookings?: Array<{
      id: string;
      bookingNumber: string;
      totalAmount: number;
      paidAmount: number;
      balanceAmount: number;
      status: string;
    }>;
  } | null;
  convertedQuotation?: {
    id: string;
    quotationNumber: string;
    version: number;
    finalAmount: number;
    status: string;
  } | null;
  followUps: EnquiryFollowUp[];
  isRepeatCustomer?: boolean;
};

export interface CrmTimelineEvent {
  id: string;
  type:
    | "ENQUIRY_CREATED"
    | "STAGE_CHANGED"
    | "FOLLOW_UP_SCHEDULED"
    | "FOLLOW_UP_COMPLETED"
    | "FOLLOW_UP_RESCHEDULED"
    | "QUOTATION_CREATED"
    | "QUOTATION_ACCEPTED"
    | "BOOKING_CREATED"
    | "ENQUIRY_CONVERTED"
    | "ENQUIRY_LOST"
    | "LEAD_REASSIGNED"
    | "FIELD_UPDATED"
    | "FOLLOW_UP_CANCELLED"
    | "INTERACTION_LOGGED";
  title: string;
  description: string;
  timestamp: Date | string;
  referenceId?: string;
  referenceUrl?: string;
  statusBadge?: string;
  actorName?: string;
  actorRole?: string;
  changes?: Array<{ field: string; label: string; oldValue?: any; newValue?: any }>;
  metadata?: Record<string, any>;
}

export interface EnquiryAssignee {
  id?: string;
  name: string;
  email?: string;
  role?: string;
  isUser: boolean;
}

export interface EnquiryDetails360 extends EnquiryWithRelations {
  isRepeatCustomer: boolean;
  timeline: CrmTimelineEvent[];
}

export interface CrmDashboardStats {
  pipelineSummary: Record<string, { count: number; totalBudget: number }>;
  followUpSummary: {
    overdueCount: number;
    todayCount: number;
    upcomingCount: number;
    completedCount: number;
    totalPending: number;
  };
  salesSummary: {
    totalLeads: number;
    activeLeads: number;
    wonLeads: number;
    lostLeads: number;
    conversionRate: number;
  };
  sourcesSummary: { source: string; count: number }[];
}

export const enquiryClient = {
  /**
   * List enquiries with search, filters, and pagination
   */
  async getEnquiries(
    params?: EnquiryQueryInput
  ): Promise<PaginatedResponse<EnquiryWithRelations>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.priority) searchParams.set("priority", params.priority);
    if (params?.source) searchParams.set("source", params.source);
    if (params?.customerId) searchParams.set("customerId", params.customerId);
    if (params?.urgency) searchParams.set("urgency", params.urgency);
    if (params?.assignedTo) searchParams.set("assignedTo", params.assignedTo);
    if ((params as any)?.scope) searchParams.set("scope", (params as any).scope);
    if ((params as any)?.myEnquiries) searchParams.set("myEnquiries", "true");
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

    const queryStr = searchParams.toString();
    const res = await fetch(`/api/enquiries${queryStr ? `?${queryStr}` : ""}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<PaginatedResponse<EnquiryWithRelations>>(res);
  },

  /**
   * Get single enquiry by ID
   */
  async getEnquiry(id: string): Promise<SingleResponse<EnquiryWithRelations>> {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<EnquiryWithRelations>>(res);
  },

  /**
   * Create a new Enquiry
   */
  async createEnquiry(data: CreateEnquiryInput): Promise<SingleResponse<EnquiryWithRelations>> {
    const res = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<EnquiryWithRelations>>(res);
  },

  /**
   * Update an existing Enquiry
   */
  async updateEnquiry(
    id: string,
    data: UpdateEnquiryInput
  ): Promise<SingleResponse<EnquiryWithRelations>> {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<EnquiryWithRelations>>(res);
  },

  /**
   * Soft delete / archive enquiry
   */
  async archiveEnquiry(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<{ success: boolean; message: string }>(res);
  },

  /**
   * Convert enquiry to a Trip workspace
   */
  async convertEnquiry(
    id: string,
    data?: ConvertEnquiryToTripInput
  ): Promise<SingleResponse<{ tripId: string; enquiry: EnquiryWithRelations }>> {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(id)}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || {}),
    });

    return handleResponse<SingleResponse<{ tripId: string; enquiry: EnquiryWithRelations }>>(res);
  },

  /**
   * Get follow-ups for an enquiry
   */
  async getFollowUps(enquiryId: string): Promise<SingleResponse<EnquiryFollowUp[]>> {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(enquiryId)}/follow-ups`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<EnquiryFollowUp[]>>(res);
  },

  /**
   * Add a follow-up to an enquiry
   */
  async createFollowUp(
    enquiryId: string,
    data: CreateFollowUpInput
  ): Promise<SingleResponse<EnquiryFollowUp>> {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(enquiryId)}/follow-ups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<EnquiryFollowUp>>(res);
  },

  /**
   * Update a follow-up
   */
  async updateFollowUp(
    enquiryId: string,
    followUpId: string,
    data: UpdateFollowUpInput
  ): Promise<SingleResponse<EnquiryFollowUp>> {
    const res = await fetch(
      `/api/enquiries/${encodeURIComponent(enquiryId)}/follow-ups/${encodeURIComponent(followUpId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );

    return handleResponse<SingleResponse<EnquiryFollowUp>>(res);
  },

  /**
   * Delete / archive a follow-up
   */
  async deleteFollowUp(
    enquiryId: string,
    followUpId: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(
      `/api/enquiries/${encodeURIComponent(enquiryId)}/follow-ups/${encodeURIComponent(followUpId)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }
    );

    return handleResponse<{ success: boolean; message: string }>(res);
  },

  /**
   * Check for potential duplicate active enquiries
   */
  async checkDuplicate(
    params: CheckDuplicateEnquiryQuery
  ): Promise<SingleResponse<{ duplicates: EnquiryWithRelations[]; matchCount: number }>> {
    const searchParams = new URLSearchParams();
    searchParams.set("customerId", params.customerId);
    if (params.destination) searchParams.set("destination", params.destination);
    if (params.startDate) searchParams.set("startDate", params.startDate);
    if (params.endDate) searchParams.set("endDate", params.endDate);
    if (params.excludeId) searchParams.set("excludeId", params.excludeId);

    const res = await fetch(`/api/enquiries/check-duplicate?${searchParams.toString()}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<{ duplicates: EnquiryWithRelations[]; matchCount: number }>>(res);
  },

  /**
   * Transition pipeline stage
   */
  async transitionStage(
    id: string,
    data: TransitionStageInput
  ): Promise<SingleResponse<EnquiryWithRelations>> {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(id)}/stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<EnquiryWithRelations>>(res);
  },

  /**
   * Mark lead as LOST with mandatory structured reason
   */
  async markLost(
    id: string,
    data: MarkEnquiryLostInput
  ): Promise<SingleResponse<EnquiryWithRelations>> {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(id)}/lost`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<EnquiryWithRelations>>(res);
  },

  /**
   * Get chronological CRM activity timeline for a lead
   */
  async getTimeline(id: string): Promise<SingleResponse<CrmTimelineEvent[]>> {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(id)}/timeline`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<CrmTimelineEvent[]>>(res);
  },

  /**
   * Get CRM dashboard telemetry and pipeline metrics
   */
  async getCrmDashboard(): Promise<SingleResponse<CrmDashboardStats>> {
    const res = await fetch("/api/crm/dashboard", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<CrmDashboardStats>>(res);
  },

  /**
   * Quick-log an interaction against an enquiry
   */
  async logInteraction(
    id: string,
    data: QuickLogInteractionInput
  ): Promise<SingleResponse<{ interaction: EnquiryFollowUp; nextFollowUp?: EnquiryFollowUp | null }>> {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(id)}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<{ interaction: EnquiryFollowUp; nextFollowUp?: EnquiryFollowUp | null }>>(res);
  },

  /**
   * Reassign or hand off an enquiry with concurrency protection and audit trail
   */
  async assignEnquiry(
    id: string,
    data: AssignLeadInput
  ): Promise<SingleResponse<EnquiryWithRelations>> {
    const res = await fetch(`/api/enquiries/${encodeURIComponent(id)}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<EnquiryWithRelations>>(res);
  },

  /**
   * Get authorized team members and historical owners for the current agency
   */
  async getAssignees(): Promise<SingleResponse<EnquiryAssignee[]>> {
    const res = await fetch("/api/enquiries/assignees", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<EnquiryAssignee[]>>(res);
  },
};
