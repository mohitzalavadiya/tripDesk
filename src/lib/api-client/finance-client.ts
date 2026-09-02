import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  SupplierPayable,
  SupplierPayableStatus,
  SupplierPayment,
  SupplierPaymentStatus,
  OperationalExpense,
  ExpenseCategory,
  BookingPaymentStatus,
} from "@prisma/client";
import {
  FinanceFilterInput,
  FinancePreset,
  RecordCustomerPaymentInput,
  RefundCustomerPaymentInput,
  CreateSupplierPayableInput,
  UpdateSupplierPayableInput,
  RecordSupplierPaymentInput,
  CreateExpenseInput,
  UpdateExpenseInput,
  TransactionQueryInput,
  TransactionType,
} from "@/lib/validation/finance-schema";
import {
  FinanceDashboardResult,
  FinanceKPIOverview,
  CustomerOutstandingItem,
  SupplierOutstandingItem,
  UnifiedTransactionItem,
  BookingFinanceBreakdown,
  BookingPaymentMilestoneScheduleItem,
  BookingPaymentScheduleResult,
} from "@/lib/services/finance-service";
import {
  PaginatedResponse,
  SingleResponse,
  ApiClientError,
} from "./customer-client";

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(
      json.error?.message || "An unexpected error occurred."
    ) as ApiClientError;
    error.code =
      json.error?.code ||
      (res.status === 401
        ? "UNAUTHORIZED"
        : res.status === 403
        ? "FORBIDDEN"
        : "API_ERROR");
    error.statusCode = res.status;
    error.details = json.error?.details;
    throw error;
  }

  return json;
}

export const financeClient = {
  /**
   * Get Executive Finance Dashboard Summary & KPIs
   */
  async getFinanceSummary(
    filters?: FinanceFilterInput
  ): Promise<SingleResponse<FinanceDashboardResult>> {
    const params = new URLSearchParams();
    if (filters?.preset) params.set("preset", filters.preset);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);
    if (filters?.bookingId) params.set("bookingId", filters.bookingId);
    if (filters?.supplierId) params.set("supplierId", filters.supplierId);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/finance/summary${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<SingleResponse<FinanceDashboardResult>>(res);
  },

  /**
   * Get Paginated Unified Transactions Ledger
   */
  async getTransactions(
    query?: TransactionQueryInput
  ): Promise<PaginatedResponse<UnifiedTransactionItem>> {
    const params = new URLSearchParams();
    if (query?.page) params.set("page", query.page.toString());
    if (query?.limit) params.set("limit", query.limit.toString());
    if (query?.type) params.set("type", query.type);
    if (query?.paymentMethod) params.set("paymentMethod", query.paymentMethod);
    if (query?.search) params.set("search", query.search);
    if (query?.startDate) params.set("startDate", query.startDate);
    if (query?.endDate) params.set("endDate", query.endDate);
    if (query?.sortBy) params.set("sortBy", query.sortBy);
    if (query?.sortOrder) params.set("sortOrder", query.sortOrder);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/finance/transactions${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<PaginatedResponse<UnifiedTransactionItem>>(res);
  },

  /**
   * Record Customer Payment
   */
  async recordCustomerPayment(
    data: RecordCustomerPaymentInput
  ): Promise<SingleResponse<Payment>> {
    const res = await fetch("/api/finance/customer-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<SingleResponse<Payment>>(res);
  },

  /**
   * Refund Customer Payment
   */
  async refundCustomerPayment(
    paymentId: string,
    data: RefundCustomerPaymentInput
  ): Promise<SingleResponse<Payment>> {
    const res = await fetch(`/api/finance/customer-payments/${paymentId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<SingleResponse<Payment>>(res);
  },

  /**
   * List Supplier Payables
   */
  async getSupplierPayables(params?: {
    supplierId?: string;
    bookingId?: string;
    tripId?: string;
    status?: SupplierPayableStatus;
  }): Promise<SingleResponse<SupplierPayable[]>> {
    const q = new URLSearchParams();
    if (params?.supplierId) q.set("supplierId", params.supplierId);
    if (params?.bookingId) q.set("bookingId", params.bookingId);
    if (params?.tripId) q.set("tripId", params.tripId);
    if (params?.status) q.set("status", params.status);

    const qs = q.toString() ? `?${q.toString()}` : "";
    const res = await fetch(`/api/finance/supplier-payables${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<SingleResponse<SupplierPayable[]>>(res);
  },

  /**
   * Record Supplier Payable
   */
  async createSupplierPayable(
    data: CreateSupplierPayableInput
  ): Promise<SingleResponse<SupplierPayable>> {
    const res = await fetch("/api/finance/supplier-payables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<SingleResponse<SupplierPayable>>(res);
  },

  /**
   * List Supplier Payments
   */
  async getSupplierPayments(params?: {
    supplierId?: string;
    payableId?: string;
  }): Promise<SingleResponse<SupplierPayment[]>> {
    const q = new URLSearchParams();
    if (params?.supplierId) q.set("supplierId", params.supplierId);
    if (params?.payableId) q.set("payableId", params.payableId);

    const qs = q.toString() ? `?${q.toString()}` : "";
    const res = await fetch(`/api/finance/supplier-payments${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<SingleResponse<SupplierPayment[]>>(res);
  },

  /**
   * Record Supplier Payment (Disbursement)
   */
  async recordSupplierPayment(
    data: RecordSupplierPaymentInput
  ): Promise<SingleResponse<SupplierPayment>> {
    const res = await fetch("/api/finance/supplier-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<SingleResponse<SupplierPayment>>(res);
  },

  /**
   * List Operational Expenses
   */
  async getExpenses(params?: {
    tripOperationId?: string;
    tripId?: string;
    bookingId?: string;
  }): Promise<SingleResponse<OperationalExpense[]>> {
    const q = new URLSearchParams();
    if (params?.tripOperationId) q.set("tripOperationId", params.tripOperationId);
    if (params?.tripId) q.set("tripId", params.tripId);
    if (params?.bookingId) q.set("bookingId", params.bookingId);

    const qs = q.toString() ? `?${q.toString()}` : "";
    const res = await fetch(`/api/finance/expenses${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<SingleResponse<OperationalExpense[]>>(res);
  },

  /**
   * Record Operational Expense
   */
  async createExpense(
    data: CreateExpenseInput
  ): Promise<SingleResponse<OperationalExpense>> {
    const res = await fetch("/api/finance/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<SingleResponse<OperationalExpense>>(res);
  },

  /**
   * Update Operational Expense
   */
  async updateExpense(
    id: string,
    data: UpdateExpenseInput
  ): Promise<SingleResponse<OperationalExpense>> {
    const res = await fetch(`/api/finance/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<SingleResponse<OperationalExpense>>(res);
  },

  /**
   * Delete Operational Expense
   */
  async deleteExpense(id: string): Promise<SingleResponse<OperationalExpense>> {
    const res = await fetch(`/api/finance/expenses/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<SingleResponse<OperationalExpense>>(res);
  },

  /**
   * Get Booking-level deep financial breakdown
   */
  async getBookingFinanceBreakdown(
    bookingId: string
  ): Promise<SingleResponse<BookingFinanceBreakdown>> {
    const res = await fetch(`/api/finance/bookings/${bookingId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<SingleResponse<BookingFinanceBreakdown>>(res);
  },

  /**
   * Get Booking Payment Milestone Schedule with Waterfall Allocation
   */
  async getBookingPaymentSchedule(
    bookingId: string
  ): Promise<SingleResponse<BookingPaymentScheduleResult>> {
    const res = await fetch(`/api/finance/bookings/${bookingId}/schedule`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<SingleResponse<BookingPaymentScheduleResult>>(res);
  },

  /**
   * Get Export CSV URL
   */
  getFinanceExportUrl(filters?: FinanceFilterInput): string {
    const params = new URLSearchParams();
    if (filters?.preset) params.set("preset", filters.preset);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return `/api/finance/export${qs}`;
  },
};

export type {
  FinanceFilterInput,
  FinancePreset,
  RecordCustomerPaymentInput,
  RefundCustomerPaymentInput,
  CreateSupplierPayableInput,
  UpdateSupplierPayableInput,
  RecordSupplierPaymentInput,
  CreateExpenseInput,
  UpdateExpenseInput,
  TransactionQueryInput,
  TransactionType,
  FinanceDashboardResult,
  FinanceKPIOverview,
  CustomerOutstandingItem,
  SupplierOutstandingItem,
  UnifiedTransactionItem,
  BookingFinanceBreakdown,
  BookingPaymentMilestoneScheduleItem,
  BookingPaymentScheduleResult,
};
