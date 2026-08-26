import { Payment, PaymentMethod, PaymentStatus } from "@prisma/client";
import {
  CreatePaymentInput,
  UpdatePaymentInput,
  PaymentQueryInput,
} from "@/lib/validation/payment-schema";
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

export type PaymentWithRelations = Payment & {
  booking: {
    id: string;
    bookingNumber: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
    currency: string;
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  } | null;
  trip?: {
    id: string;
    title: string;
    tripNumber: string;
  } | null;
};

export const paymentClient = {
  /**
   * List payments with search and filtering
   */
  async getPayments(
    params?: PaymentQueryInput
  ): Promise<PaginatedResponse<PaymentWithRelations>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.bookingId) searchParams.set("bookingId", params.bookingId);
    if (params?.tripId) searchParams.set("tripId", params.tripId);
    if (params?.customerId) searchParams.set("customerId", params.customerId);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.paymentMethod) searchParams.set("paymentMethod", params.paymentMethod);
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

    const queryStr = searchParams.toString();
    const res = await fetch(`/api/payments${queryStr ? `?${queryStr}` : ""}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<PaginatedResponse<PaymentWithRelations>>(res);
  },

  /**
   * Get single payment by ID
   */
  async getPayment(id: string): Promise<SingleResponse<PaymentWithRelations>> {
    const res = await fetch(`/api/payments/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<PaymentWithRelations>>(res);
  },

  /**
   * Create a new payment record
   */
  async createPayment(data: CreatePaymentInput): Promise<SingleResponse<PaymentWithRelations>> {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<PaymentWithRelations>>(res);
  },

  /**
   * Update payment record
   */
  async updatePayment(
    id: string,
    data: UpdatePaymentInput
  ): Promise<SingleResponse<PaymentWithRelations>> {
    const res = await fetch(`/api/payments/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<PaymentWithRelations>>(res);
  },

  /**
   * Soft delete / archive payment
   */
  async deletePayment(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/payments/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<{ success: boolean; message: string }>(res);
  },
};
