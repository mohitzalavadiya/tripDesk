import {
  Enquiry,
  EnquiryStatus,
  EnquiryPriority,
  EnquirySource,
  EnquiryFollowUp,
  FollowUpType,
  FollowUpStatus,
} from "@prisma/client";
import {
  CreateEnquiryInput,
  UpdateEnquiryInput,
  EnquiryQueryInput,
  ConvertEnquiryToTripInput,
  CreateFollowUpInput,
  UpdateFollowUpInput,
} from "@/lib/validation/enquiry-schema";
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
  } | null;
  convertedQuotation?: {
    id: string;
    quotationNumber: string;
    version: number;
    finalAmount: number;
    status: string;
  } | null;
  followUps: EnquiryFollowUp[];
};

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
};
