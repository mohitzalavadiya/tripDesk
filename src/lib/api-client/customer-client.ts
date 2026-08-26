import { Customer } from "@prisma/client";
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryParams,
  CheckDuplicateCustomerInput,
} from "@/lib/validation/customer-schema";

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ApiClientError extends Error {
  code: string;
  statusCode: number;
  details?: any;
}

export interface CustomerWithCounts extends Customer {
  _count?: {
    enquiries: number;
    trips: number;
    quotations: number;
    bookings: number;
    payments: number;
  };
}

export interface CustomerActivityEvent {
  id: string;
  type:
    | "CUSTOMER_CREATED"
    | "ENQUIRY_CREATED"
    | "ENQUIRY_CONVERTED"
    | "TRIP_CREATED"
    | "QUOTATION_CREATED"
    | "QUOTATION_ACCEPTED"
    | "BOOKING_CREATED"
    | "BOOKING_CONFIRMED"
    | "PAYMENT_RECEIVED";
  title: string;
  description: string;
  timestamp: Date | string;
  referenceId?: string;
  referenceUrl?: string;
  statusBadge?: string;
  amount?: number;
}

export interface CustomerDetails360 extends Customer {
  enquiries: any[];
  trips: any[];
  quotations: any[];
  bookings: any[];
  payments: any[];
  financials: {
    totalEnquiries: number;
    totalTrips: number;
    totalQuotations: number;
    totalBookings: number;
    totalPaid: number;
    totalOutstandingBalance: number;
    totalSpent: number;
  };
  timeline: CustomerActivityEvent[];
}

/**
 * Standard HTTP response handler for client-side API requests.
 */
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

export const customerClient = {
  /**
   * Fetches a paginated, search-filtered list of customers for the authenticated agency.
   */
  async getCustomers(
    params?: Partial<CustomerQueryParams>
  ): Promise<PaginatedResponse<CustomerWithCounts>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.city) searchParams.set("city", params.city);
    if (params?.source) searchParams.set("source", params.source);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
    if (params?.includeArchived !== undefined) {
      searchParams.set("includeArchived", String(params.includeArchived));
    }

    const url = `/api/customers${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<PaginatedResponse<CustomerWithCounts>>(res);
  },

  /**
   * Retrieves a single customer record by ID (360 profile with all history & aggregates).
   */
  async getCustomer(id: string): Promise<SingleResponse<CustomerDetails360>> {
    const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<CustomerDetails360>>(res);
  },

  /**
   * Checks for potential duplicate customer records by phone/email/name.
   */
  async checkDuplicate(
    params: CheckDuplicateCustomerInput
  ): Promise<SingleResponse<{ duplicates: Customer[]; matchCount: number }>> {
    const searchParams = new URLSearchParams();
    if (params.phone) searchParams.set("phone", params.phone);
    if (params.email) searchParams.set("email", params.email);
    if (params.name) searchParams.set("name", params.name);

    const res = await fetch(
      `/api/customers/check-duplicate?${searchParams.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<{ duplicates: Customer[]; matchCount: number }>>(res);
  },

  /**
   * Creates a new customer under the authenticated agency.
   */
  async createCustomer(data: CreateCustomerInput): Promise<SingleResponse<Customer>> {
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<Customer>>(res);
  },

  /**
   * Updates an existing customer record.
   */
  async updateCustomer(
    id: string,
    data: UpdateCustomerInput
  ): Promise<SingleResponse<Customer>> {
    const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<Customer>>(res);
  },

  /**
   * Soft-deletes (archives) a customer record.
   */
  async archiveCustomer(
    id: string
  ): Promise<SingleResponse<{ message: string; customer: Customer }>> {
    const res = await fetch(`/api/customers/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<SingleResponse<{ message: string; customer: Customer }>>(res);
  },
};
