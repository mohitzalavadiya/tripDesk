import {
  TripOperation,
  HotelConfirmation,
  VehicleDispatch,
  ActivityConfirmation,
  OperationalIssue,
  OperationEvent,
  OperationStatus,
  ConfirmationStatus,
  DispatchStatus,
  IssuePriority,
  IssueStatus,
} from "@prisma/client";
import {
  CreateTripOperationInput,
  UpdateTripOperationInput,
  TripOperationQueryInput,
  CreateHotelConfirmationInput,
  UpdateHotelConfirmationInput,
  CreateVehicleDispatchInput,
  UpdateVehicleDispatchInput,
  CreateActivityConfirmationInput,
  UpdateActivityConfirmationInput,
  CreateOperationalIssueInput,
  UpdateOperationalIssueInput,
  LogCommunicationInput,
  PostTourReviewInput,
  FinancialReconciliationInput,
  FinalizeOperationInput,
  ReopenOperationInput,
  CostAdjustmentItem,
  AnalyticsFilterInput,
  AnalyticsPreset,
} from "@/lib/validation/operations-schema";
import { OperationsClosureSummary, HotelReconciliationItem, FleetReconciliationItem, ActivityReconciliationItem } from "@/lib/services/operations-service";
import type {
  OperationsAnalyticsDashboard,
  OperationsOverviewKPIs,
  ReadinessAnalyticsResult,
  OperationalRiskAnalyticsResult,
  OperationalRiskItem,
  IssueAnalyticsResult,
  SupplierAnalyticsResult,
  SupplierPerformanceItem,
  DriverPerformanceItem,
  FinancialAnalyticsResult,
  GuestSatisfactionResult,
  TrendTimePoint,
  RiskLevel,
} from "@/lib/services/operations-analytics-service";
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

export interface ReadinessCheck {
  key: string;
  label: string;
  passed: boolean;
  details?: string;
}

export interface ReadinessSummary {
  score: number;
  isReady: boolean;
  totalHotels: number;
  confirmedHotels: number;
  totalVehicles: number;
  confirmedVehicles: number;
  totalActivities: number;
  confirmedActivities: number;
  openIssuesCount: number;
  criticalIssuesCount: number;
  checks: ReadinessCheck[];
}

export type OperationListItem = TripOperation & {
  trip: {
    id: string;
    tripNumber: string;
    title: string;
    startDate: Date | string;
    endDate: Date | string;
    customer: {
      id: string;
      name: string;
      phone: string;
      email?: string | null;
    };
  };
  booking?: {
    id: string;
    bookingNumber: string;
    totalAmount: number;
    status: string;
  } | null;
  hotelConfirmations: Array<{ id: string; status: ConfirmationStatus }>;
  vehicleDispatches: Array<{ id: string; status: DispatchStatus }>;
  activityConfirmations: Array<{ id: string; status: ConfirmationStatus }>;
  issues: Array<{ id: string; priority: IssuePriority; status: IssueStatus }>;
  _count: {
    hotelConfirmations: number;
    vehicleDispatches: number;
    activityConfirmations: number;
    issues: number;
    events: number;
  };
};

export type HotelConfirmationWithDetails = HotelConfirmation & {
  tripHotel?: {
    id: string;
    roomType: string;
    rooms: number;
    mealPlan?: string | null;
    checkIn: Date | string;
    checkOut: Date | string;
    hotel?: {
      id: string;
      name: string;
      city?: string | null;
      phone?: string | null;
      email?: string | null;
    };
  } | null;
  supplier?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
};

export type VehicleDispatchWithDetails = VehicleDispatch & {
  tripVehicle?: {
    id: string;
    vehicleName: string;
    vehicleType: string;
    capacity?: number | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    pickupLocation?: string | null;
    dropLocation?: string | null;
  } | null;
  vehicle?: {
    id: string;
    name: string;
    type: string;
    registrationNumber?: string | null;
  } | null;
};

export type ActivityConfirmationWithDetails = ActivityConfirmation & {
  tripActivity?: {
    id: string;
    name: string;
    description?: string | null;
    date?: Date | string | null;
    time?: string | null;
    location?: string | null;
    numberOfParticipants?: number | null;
    activity?: {
      id: string;
      name: string;
      location?: string | null;
      supplier?: {
        id: string;
        name: string;
        phone?: string | null;
        email?: string | null;
      } | null;
    } | null;
  } | null;
  activity?: {
    id: string;
    name: string;
    location?: string | null;
    supplier?: {
      id: string;
      name: string;
      phone?: string | null;
      email?: string | null;
    } | null;
  } | null;
};

export type OperationDetailWithRelations = TripOperation & {
  trip: {
    id: string;
    tripNumber: string;
    title: string;
    startDate: Date | string;
    endDate: Date | string;
    status: string;
    notes?: string | null;
    customer: {
      id: string;
      name: string;
      phone: string;
      email?: string | null;
      city?: string | null;
    };
    travelers: Array<{
      id: string;
      name: string;
      type: string;
      phone?: string | null;
      isPrimary: boolean;
    }>;
  };
  booking?: {
    id: string;
    bookingNumber: string;
    status: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    currency: string;
  } | null;
  hotelConfirmations: HotelConfirmationWithDetails[];
  vehicleDispatches: VehicleDispatchWithDetails[];
  activityConfirmations: ActivityConfirmationWithDetails[];
  issues: OperationalIssue[];
  events: OperationEvent[];
};

export const operationsClient = {
  /**
   * List operations with filtering and pagination
   */
  async getOperations(
    params?: TripOperationQueryInput
  ): Promise<PaginatedResponse<OperationListItem>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.status) searchParams.set("status", params.status);
    if (params?.tripId) searchParams.set("tripId", params.tripId);
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

    const queryStr = searchParams.toString();
    const res = await fetch(`/api/operations${queryStr ? `?${queryStr}` : ""}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<PaginatedResponse<OperationListItem>>(res);
  },

  /**
   * Get single operation by ID
   */
  async getOperation(
    id: string
  ): Promise<SingleResponse<OperationDetailWithRelations>> {
    const res = await fetch(`/api/operations/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<OperationDetailWithRelations>>(res);
  },

  /**
   * Get operation by Trip ID (falls back to search by tripId)
   */
  async getOperationByTripId(
    tripId: string
  ): Promise<SingleResponse<OperationDetailWithRelations | null>> {
    // Check if tripId is directly an operation ID first or search by tripId
    try {
      const direct = await this.getOperation(tripId);
      if (direct.data) return direct;
    } catch {
      // ignore and search by tripId
    }

    const list = await this.getOperations({ tripId, limit: 1 });
    if (list.data && list.data.length > 0) {
      return this.getOperation(list.data[0].id);
    }

    return { success: true, data: null };
  },

  /**
   * Initialize a new Trip Operation
   */
  async createOperation(
    input: CreateTripOperationInput
  ): Promise<SingleResponse<OperationDetailWithRelations>> {
    const res = await fetch("/api/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    return handleResponse<SingleResponse<OperationDetailWithRelations>>(res);
  },

  /**
   * Update operational metadata or status
   */
  async updateOperation(
    id: string,
    input: UpdateTripOperationInput
  ): Promise<SingleResponse<TripOperation>> {
    const res = await fetch(`/api/operations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    return handleResponse<SingleResponse<TripOperation>>(res);
  },

  /**
   * Get operational readiness breakdown & score
   */
  async getReadiness(id: string): Promise<SingleResponse<ReadinessSummary>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(id)}/readiness`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<ReadinessSummary>>(res);
  },

  /**
   * Get chronological event timeline
   */
  async getTimeline(id: string): Promise<SingleResponse<OperationEvent[]>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(id)}/timeline`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<OperationEvent[]>>(res);
  },

  /**
   * HOTEL CONFIRMATIONS
   */
  async createHotelConfirmation(
    operationId: string,
    input: CreateHotelConfirmationInput
  ): Promise<SingleResponse<HotelConfirmation>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(operationId)}/hotels`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    return handleResponse<SingleResponse<HotelConfirmation>>(res);
  },

  async updateHotelConfirmation(
    operationId: string,
    confirmationId: string,
    input: UpdateHotelConfirmationInput
  ): Promise<SingleResponse<HotelConfirmation>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(
        operationId
      )}/hotels/${encodeURIComponent(confirmationId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    return handleResponse<SingleResponse<HotelConfirmation>>(res);
  },

  /**
   * VEHICLE DISPATCHES
   */
  async createVehicleDispatch(
    operationId: string,
    input: CreateVehicleDispatchInput
  ): Promise<SingleResponse<VehicleDispatch>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(operationId)}/vehicles`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    return handleResponse<SingleResponse<VehicleDispatch>>(res);
  },

  async updateVehicleDispatch(
    operationId: string,
    dispatchId: string,
    input: UpdateVehicleDispatchInput
  ): Promise<SingleResponse<VehicleDispatch>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(
        operationId
      )}/vehicles/${encodeURIComponent(dispatchId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    return handleResponse<SingleResponse<VehicleDispatch>>(res);
  },

  /**
   * ACTIVITY CONFIRMATIONS
   */
  async listActivityConfirmations(
    operationId: string
  ): Promise<SingleResponse<ActivityConfirmationWithDetails[]>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(operationId)}/activities`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<ActivityConfirmationWithDetails[]>>(res);
  },

  async getActivityConfirmation(
    operationId: string,
    confirmationId: string
  ): Promise<SingleResponse<ActivityConfirmationWithDetails>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(
        operationId
      )}/activities/${encodeURIComponent(confirmationId)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<ActivityConfirmationWithDetails>>(res);
  },

  async createActivityConfirmation(
    operationId: string,
    input: CreateActivityConfirmationInput
  ): Promise<SingleResponse<ActivityConfirmation>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(operationId)}/activities`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    return handleResponse<SingleResponse<ActivityConfirmation>>(res);
  },

  async updateActivityConfirmation(
    operationId: string,
    confirmationId: string,
    input: UpdateActivityConfirmationInput
  ): Promise<SingleResponse<ActivityConfirmation>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(
        operationId
      )}/activities/${encodeURIComponent(confirmationId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    return handleResponse<SingleResponse<ActivityConfirmation>>(res);
  },

  /**
   * OPERATIONAL ISSUES
   */
  async listAgencyIssues(params?: {
    status?: string;
    priority?: string;
    search?: string;
    tripId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Array<
      OperationalIssue & {
        tripOperation: {
          id: string;
          trip: {
            id: string;
            tripNumber: string;
            title: string;
            customer: { id: string; name: string; phone: string; email?: string | null };
          };
          booking?: { id: string; bookingNumber: string; totalAmount: number; status: string } | null;
        };
      }
    >;
    meta?: {
      pagination: { page: number; limit: number; total: number; totalPages: number };
      summary: {
        total: number;
        open: number;
        inProgress: number;
        critical: number;
        highPriority: number;
        resolved: number;
      };
    };
  }> {
    const url = new URL("/api/operations/issues", window.location.origin);
    if (params?.status && params.status !== "ALL") url.searchParams.set("status", params.status);
    if (params?.priority && params.priority !== "ALL") url.searchParams.set("priority", params.priority);
    if (params?.search) url.searchParams.set("search", params.search);
    if (params?.tripId) url.searchParams.set("tripId", params.tripId);
    if (params?.page) url.searchParams.set("page", params.page.toString());
    if (params?.limit) url.searchParams.set("limit", params.limit.toString());

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse(res);
  },

  async listIssuesByOperation(
    operationId: string
  ): Promise<SingleResponse<OperationalIssue[]>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(operationId)}/issues`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<OperationalIssue[]>>(res);
  },

  async createIssue(
    operationId: string,
    input: CreateOperationalIssueInput
  ): Promise<SingleResponse<OperationalIssue>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(operationId)}/issues`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    return handleResponse<SingleResponse<OperationalIssue>>(res);
  },

  async updateIssue(
    operationId: string,
    issueId: string,
    input: UpdateOperationalIssueInput
  ): Promise<SingleResponse<OperationalIssue>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(
        operationId
      )}/issues/${encodeURIComponent(issueId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    return handleResponse<SingleResponse<OperationalIssue>>(res);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // OPERATIONAL COMMUNICATIONS
  // ═════════════════════════════════════════════════════════════════════════

  async logCommunication(
    operationId: string,
    input: LogCommunicationInput
  ): Promise<SingleResponse<OperationEvent>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(operationId)}/communications`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    return handleResponse<SingleResponse<OperationEvent>>(res);
  },

  // ═════════════════════════════════════════════════════════════════════════
  // DOCUMENTS & VOUCHERS
  // ═════════════════════════════════════════════════════════════════════════

  async getDocumentsSummary(
    operationId: string
  ): Promise<SingleResponse<any>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(operationId)}/documents`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<any>>(res);
  },

  getHotelVoucherUrl(operationId: string, confirmationId: string): string {
    return `/api/operations/${encodeURIComponent(operationId)}/documents/hotel/${encodeURIComponent(confirmationId)}/pdf`;
  },

  getVehicleVoucherUrl(operationId: string, dispatchId: string): string {
    return `/api/operations/${encodeURIComponent(operationId)}/documents/vehicle/${encodeURIComponent(dispatchId)}/pdf`;
  },

  getActivityVoucherUrl(operationId: string, confirmationId: string): string {
    return `/api/operations/${encodeURIComponent(operationId)}/documents/activity/${encodeURIComponent(confirmationId)}/pdf`;
  },

  getBookingConfirmationUrl(operationId: string): string {
    return `/api/operations/${encodeURIComponent(operationId)}/documents/booking/pdf`;
  },

  getTravelKitUrl(operationId: string): string {
    return `/api/operations/${encodeURIComponent(operationId)}/documents/travel-kit/pdf`;
  },

  // ═════════════════════════════════════════════════════════════════════════
  // OPERATIONS CLOSURE & FINANCIAL RECONCILIATION
  // ═════════════════════════════════════════════════════════════════════════

  async getClosureSummary(
    operationId: string
  ): Promise<SingleResponse<OperationsClosureSummary>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(operationId)}/closure`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );

    return handleResponse<SingleResponse<OperationsClosureSummary>>(res);
  },

  async savePostTourReview(
    operationId: string,
    input: PostTourReviewInput
  ): Promise<SingleResponse<OperationEvent>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(operationId)}/closure/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    return handleResponse<SingleResponse<OperationEvent>>(res);
  },

  async saveFinancialReconciliation(
    operationId: string,
    input: FinancialReconciliationInput
  ): Promise<SingleResponse<OperationEvent>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(operationId)}/closure/reconciliation`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    return handleResponse<SingleResponse<OperationEvent>>(res);
  },

  async finalizeOperation(
    operationId: string,
    input: FinalizeOperationInput
  ): Promise<SingleResponse<OperationEvent>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(operationId)}/closure/finalize`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    return handleResponse<SingleResponse<OperationEvent>>(res);
  },

  async reopenOperation(
    operationId: string,
    input: ReopenOperationInput
  ): Promise<SingleResponse<OperationEvent>> {
    const res = await fetch(
      `/api/operations/${encodeURIComponent(operationId)}/closure/reopen`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );

    return handleResponse<SingleResponse<OperationEvent>>(res);
  },

  getClosureSummaryPdfUrl(operationId: string): string {
    return `/api/operations/${encodeURIComponent(operationId)}/closure/pdf`;
  },

  /**
   * PHASE 10.13J: OPERATIONS ANALYTICS & MANAGEMENT INSIGHTS
   */
  async getOperationsAnalytics(
    filters?: AnalyticsFilterInput
  ): Promise<SingleResponse<OperationsAnalyticsDashboard>> {
    const params = new URLSearchParams();
    if (filters?.preset) params.set("preset", filters.preset);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.serviceType) params.set("serviceType", filters.serviceType);
    if (filters?.supplierId) params.set("supplierId", filters.supplierId);
    if (filters?.search) params.set("search", filters.search);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/operations/analytics${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<OperationsAnalyticsDashboard>>(res);
  },

  async getReadinessAnalytics(
    filters?: AnalyticsFilterInput
  ): Promise<SingleResponse<{ readiness: ReadinessAnalyticsResult; overview: any }>> {
    const params = new URLSearchParams();
    if (filters?.preset) params.set("preset", filters.preset);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/operations/analytics/readiness${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<{ readiness: ReadinessAnalyticsResult; overview: any }>>(res);
  },

  async getIssueAnalytics(
    filters?: AnalyticsFilterInput
  ): Promise<SingleResponse<{ issues: IssueAnalyticsResult; overview: any }>> {
    const params = new URLSearchParams();
    if (filters?.preset) params.set("preset", filters.preset);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/operations/analytics/issues${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<{ issues: IssueAnalyticsResult; overview: any }>>(res);
  },

  async getSupplierAnalytics(
    filters?: AnalyticsFilterInput
  ): Promise<SingleResponse<SupplierAnalyticsResult>> {
    const params = new URLSearchParams();
    if (filters?.preset) params.set("preset", filters.preset);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);
    if (filters?.supplierId) params.set("supplierId", filters.supplierId);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/operations/analytics/suppliers${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<SupplierAnalyticsResult>>(res);
  },

  async getFinancialAnalytics(
    filters?: AnalyticsFilterInput
  ): Promise<SingleResponse<{ financial: FinancialAnalyticsResult; overview: any }>> {
    const params = new URLSearchParams();
    if (filters?.preset) params.set("preset", filters.preset);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/operations/analytics/financial${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<{ financial: FinancialAnalyticsResult; overview: any }>>(res);
  },

  async getGuestSatisfactionAnalytics(
    filters?: AnalyticsFilterInput
  ): Promise<SingleResponse<{ guestSatisfaction: GuestSatisfactionResult; overview: any }>> {
    const params = new URLSearchParams();
    if (filters?.preset) params.set("preset", filters.preset);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/operations/analytics/guest-satisfaction${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<{ guestSatisfaction: GuestSatisfactionResult; overview: any }>>(res);
  },

  async getOperationsTrends(
    filters?: AnalyticsFilterInput
  ): Promise<SingleResponse<{ trends: TrendTimePoint[]; dateRange: any }>> {
    const params = new URLSearchParams();
    if (filters?.preset) params.set("preset", filters.preset);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/operations/analytics/trends${qs}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<{ trends: TrendTimePoint[]; dateRange: any }>>(res);
  },

  getOperationsAnalyticsExportUrl(filters?: AnalyticsFilterInput): string {
    const params = new URLSearchParams();
    if (filters?.preset) params.set("preset", filters.preset);
    if (filters?.startDate) params.set("startDate", filters.startDate);
    if (filters?.endDate) params.set("endDate", filters.endDate);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return `/api/operations/analytics/export${qs}`;
  },
};

export type {
  OperationsClosureSummary,
  HotelReconciliationItem,
  FleetReconciliationItem,
  ActivityReconciliationItem,
  PostTourReviewInput,
  FinancialReconciliationInput,
  FinalizeOperationInput,
  ReopenOperationInput,
  CostAdjustmentItem,
  AnalyticsFilterInput,
  AnalyticsPreset,
  OperationsAnalyticsDashboard,
  OperationsOverviewKPIs,
  ReadinessAnalyticsResult,
  OperationalRiskAnalyticsResult,
  OperationalRiskItem,
  IssueAnalyticsResult,
  SupplierAnalyticsResult,
  SupplierPerformanceItem,
  DriverPerformanceItem,
  FinancialAnalyticsResult,
  GuestSatisfactionResult,
  TrendTimePoint,
  RiskLevel,
};
