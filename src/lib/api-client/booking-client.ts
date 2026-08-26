import { Booking, BookingStatus, BookingPaymentStatus, Payment } from "@prisma/client";
import {
  CreateBookingInput,
  UpdateBookingInput,
  BookingQueryInput,
  ConvertQuotationToBookingInput,
} from "@/lib/validation/booking-schema";
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

export type BookingWithRelations = Booking & {
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  };
  trip: {
    id: string;
    title: string;
    tripNumber: string;
    startDate: Date | string;
    endDate: Date | string;
    status: string;
    travelers: Array<{
      id: string;
      name: string;
      type: string;
    }>;
  };
  quotation?: {
    id: string;
    quotationNumber: string;
    version: number;
    title?: string | null;
    finalAmount: number;
    status: string;
  } | null;
  payments: Payment[];
};

export const bookingClient = {
  /**
   * List bookings with search and filters
   */
  async getBookings(
    params?: BookingQueryInput
  ): Promise<PaginatedResponse<BookingWithRelations>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.paymentStatus) searchParams.set("paymentStatus", params.paymentStatus);
    if (params?.customerId) searchParams.set("customerId", params.customerId);
    if (params?.tripId) searchParams.set("tripId", params.tripId);
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

    const queryStr = searchParams.toString();
    const res = await fetch(`/api/bookings${queryStr ? `?${queryStr}` : ""}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<PaginatedResponse<BookingWithRelations>>(res);
  },

  /**
   * Get single booking by ID
   */
  async getBooking(id: string): Promise<SingleResponse<BookingWithRelations>> {
    const res = await fetch(`/api/bookings/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<BookingWithRelations>>(res);
  },

  /**
   * Create a manual booking
   */
  async createBooking(data: CreateBookingInput): Promise<SingleResponse<BookingWithRelations>> {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<BookingWithRelations>>(res);
  },

  /**
   * Convert an accepted quotation into a booking
   */
  async convertQuotationToBooking(
    quotationId: string,
    data?: ConvertQuotationToBookingInput
  ): Promise<SingleResponse<BookingWithRelations>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/booking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || {}),
    });

    return handleResponse<SingleResponse<BookingWithRelations>>(res);
  },

  /**
   * Update booking fields (status, financial total, notes, dates)
   */
  async updateBooking(
    id: string,
    data: UpdateBookingInput
  ): Promise<SingleResponse<BookingWithRelations>> {
    const res = await fetch(`/api/bookings/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<BookingWithRelations>>(res);
  },

  /**
   * Soft delete / archive booking
   */
  async deleteBooking(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/bookings/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<{ success: boolean; message: string }>(res);
  },
};
