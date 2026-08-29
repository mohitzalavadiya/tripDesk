import {
  Quotation,
  QuotationItem,
  QuotationProposalItem,
  QuotationPaymentMilestone,
  QuotationPackageOption,
  ProposalItemType,
} from "@prisma/client";
import {
  CreateQuotationInput,
  UpdateQuotationInput,
  QuotationQueryInput,
  GenerateTripQuotationInput,
  AcceptQuotationInput,
  RequestChangesInput,
} from "@/lib/validation/quotation-schema";
import {
  CreateQuotationItemInput,
  UpdateQuotationItemInput,
} from "@/lib/validation/quotation-item-schema";
import {
  CreateProposalItemInput,
  UpdateProposalItemInput,
  ReorderProposalItemsInput,
} from "@/lib/validation/proposal-item-schema";
import {
  CreatePaymentMilestoneInput,
  UpdatePaymentMilestoneInput,
  GeneratePaymentScheduleInput,
} from "@/lib/validation/payment-milestone-schema";
import {
  CreatePackageOptionInput,
  UpdatePackageOptionInput,
  ReorderPackageOptionsInput,
} from "@/lib/validation/package-option-schema";
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

export type QuotationWithRelations = Quotation & {
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
    itineraryItems: Array<{
      id: string;
      dayNumber: number;
      date?: Date | string | null;
      title: string;
      description?: string | null;
      location?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      sortOrder: number;
    }>;
  };
  items: QuotationItem[];
  proposalItems: QuotationProposalItem[];
  paymentMilestones: QuotationPaymentMilestone[];
  packageOptions: QuotationPackageOption[];
  selectedPackageOption?: QuotationPackageOption | null;
};

export interface HotelCostItem {
  id: string;
  hotelId: string;
  hotelName: string;
  roomType: string;
  rooms: number;
  checkIn: Date | string;
  checkOut: Date | string;
  nights: number;
  nightlyRate: number;
  mealPlan?: string | null;
  totalCost: number;
}

export interface VehicleCostItem {
  id: string;
  vehicleId?: string | null;
  vehicleName: string;
  vehicleType: string;
  pricingType: string;
  ratePerKm: number;
  estimatedKm: number;
  totalCost: number;
}

export interface ActivityCostItem {
  id: string;
  activityId?: string | null;
  activityName: string;
  type: string;
  numberOfParticipants: number;
  adultPrice: number;
  childPrice: number;
  totalCost: number;
}

export interface TripCostingResult {
  tripId: string;
  tripTitle: string;
  tripNumber: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  };
  travelersCount: number;
  adultsCount: number;
  childrenCount: number;
  hotels: HotelCostItem[];
  vehicles: VehicleCostItem[];
  activities: ActivityCostItem[];
  hotelsTotal: number;
  vehiclesTotal: number;
  activitiesTotal: number;
  subtotal: number;
}

export interface TripQuotationData {
  costing: TripCostingResult;
  quotations: QuotationWithRelations[];
}

export interface PublicProposalItem {
  id: string;
  type: ProposalItemType;
  title: string;
  description?: string | null;
  sortOrder: number;
}

export interface PublicPaymentMilestone {
  id: string;
  title: string;
  description?: string | null;
  percentage?: number | null;
  amount?: number | null;
  dueDate?: string | null;
  sortOrder: number;
}

export interface PublicPackageOption {
  id: string;
  name: string;
  subtitle?: string | null;
  description?: string | null;
  isRecommended: boolean;
  finalAmount: number;
  hotelNotes?: string | null;
  vehicleNotes?: string | null;
  activityNotes?: string | null;
  inclusions: string[];
  exclusions: string[];
  sortOrder: number;
}

export interface PublicQuotationPayload {
  id: string;
  quotationNumber: string;
  version: number;
  title: string;
  proposalSubtitle?: string | null;
  status: string;
  currency: string;
  validUntil?: string | null;
  isExpired: boolean;
  subtotal: number;
  markupAmount: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  selectedPackageOptionId?: string | null;
  customerMessage?: string | null;
  inclusionsIntro?: string | null;
  exclusionsIntro?: string | null;
  paymentTerms?: string | null;
  cancellationPolicy?: string | null;
  importantNotes?: string | null;
  terms?: string | null;
  customerFeedback?: string | null;
  customerFeedbackAt?: string | null;
  agency: {
    id: string;
    name: string;
    email: string;
    phone: string;
    logo?: string | null;
    address?: string | null;
  };
  customer: {
    name: string;
    email?: string | null;
    phone: string;
  };
  trip: {
    id: string;
    title: string;
    tripNumber: string;
    startDate: string;
    endDate: string;
    travelers: Array<{ id: string; name: string; type: string }>;
    itineraryItems: Array<{
      id: string;
      dayNumber: number;
      date?: string | null;
      title: string;
      description?: string | null;
      location?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      sortOrder: number;
    }>;
  };
  items: Array<{
    id: string;
    type: string;
    category?: string | null;
    name: string;
    description?: string | null;
    quantity: number;
    unit?: string | null;
    unitPrice: number;
    totalPrice: number;
    sortOrder: number;
  }>;
  proposalItems: PublicProposalItem[];
  paymentMilestones: PublicPaymentMilestone[];
  packageOptions: PublicPackageOption[];
  selectedPackageOption?: PublicPackageOption | null;
  createdAt: string;
}

export const quotationClient = {
  /**
   * List quotations with pagination & filters
   */
  async getQuotations(
    params?: QuotationQueryInput
  ): Promise<PaginatedResponse<QuotationWithRelations>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.customerId) searchParams.set("customerId", params.customerId);
    if (params?.tripId) searchParams.set("tripId", params.tripId);
    if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);

    const queryStr = searchParams.toString();
    const res = await fetch(`/api/quotations${queryStr ? `?${queryStr}` : ""}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<PaginatedResponse<QuotationWithRelations>>(res);
  },

  /**
   * Get single quotation by ID
   */
  async getQuotation(id: string): Promise<SingleResponse<QuotationWithRelations>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<QuotationWithRelations>>(res);
  },

  /**
   * Create a manual quotation
   */
  async createQuotation(data: CreateQuotationInput): Promise<SingleResponse<QuotationWithRelations>> {
    const res = await fetch("/api/quotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<QuotationWithRelations>>(res);
  },

  /**
   * Update quotation details
   */
  async updateQuotation(id: string, data: UpdateQuotationInput): Promise<SingleResponse<QuotationWithRelations>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<QuotationWithRelations>>(res);
  },

  /**
   * Soft delete/archive quotation
   */
  async deleteQuotation(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<{ success: boolean; message: string }>(res);
  },

  /**
   * Create next version of quotation
   */
  async createQuotationVersion(id: string): Promise<SingleResponse<QuotationWithRelations>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(id)}/version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<SingleResponse<QuotationWithRelations>>(res);
  },

  // ──────────────────────── LINE ITEMS ─────────────────────────

  /**
   * List line items of quotation
   */
  async getQuotationItems(quotationId: string): Promise<SingleResponse<QuotationItem[]>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/items`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<QuotationItem[]>>(res);
  },

  /**
   * Add line item to quotation
   */
  async createQuotationItem(
    quotationId: string,
    data: CreateQuotationItemInput
  ): Promise<SingleResponse<QuotationItem>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<QuotationItem>>(res);
  },

  /**
   * Update line item in quotation
   */
  async updateQuotationItem(
    quotationId: string,
    itemId: string,
    data: UpdateQuotationItemInput
  ): Promise<SingleResponse<QuotationItem>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/items/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<QuotationItem>>(res);
  },

  /**
   * Delete line item in quotation
   */
  async deleteQuotationItem(
    quotationId: string,
    itemId: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/items/${encodeURIComponent(itemId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // ──────────────────────── PROPOSAL ITEMS (INCLUSIONS / EXCLUSIONS) ─────────────────────────

  /**
   * List proposal items
   */
  async getProposalItems(
    quotationId: string,
    type?: ProposalItemType
  ): Promise<SingleResponse<QuotationProposalItem[]>> {
    const query = type ? `?type=${type}` : "";
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/proposal-items${query}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<QuotationProposalItem[]>>(res);
  },

  /**
   * Create proposal item
   */
  async createProposalItem(
    quotationId: string,
    data: CreateProposalItemInput
  ): Promise<SingleResponse<QuotationProposalItem>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/proposal-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<QuotationProposalItem>>(res);
  },

  /**
   * Update proposal item
   */
  async updateProposalItem(
    quotationId: string,
    itemId: string,
    data: UpdateProposalItemInput
  ): Promise<SingleResponse<QuotationProposalItem>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/proposal-items/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<QuotationProposalItem>>(res);
  },

  /**
   * Delete proposal item
   */
  async deleteProposalItem(
    quotationId: string,
    itemId: string
  ): Promise<SingleResponse<QuotationProposalItem>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/proposal-items/${encodeURIComponent(itemId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<SingleResponse<QuotationProposalItem>>(res);
  },

  /**
   * Reorder proposal items
   */
  async reorderProposalItems(
    quotationId: string,
    data: ReorderProposalItemsInput
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/proposal-items/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // ──────────────────────── PAYMENT MILESTONES ─────────────────────────

  /**
   * List payment milestones
   */
  async getPaymentMilestones(
    quotationId: string
  ): Promise<SingleResponse<QuotationPaymentMilestone[]>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/payment-milestones`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<QuotationPaymentMilestone[]>>(res);
  },

  /**
   * Create payment milestone
   */
  async createPaymentMilestone(
    quotationId: string,
    data: CreatePaymentMilestoneInput
  ): Promise<SingleResponse<QuotationPaymentMilestone>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/payment-milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<QuotationPaymentMilestone>>(res);
  },

  /**
   * Update payment milestone
   */
  async updatePaymentMilestone(
    quotationId: string,
    milestoneId: string,
    data: UpdatePaymentMilestoneInput
  ): Promise<SingleResponse<QuotationPaymentMilestone>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/payment-milestones/${encodeURIComponent(milestoneId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<QuotationPaymentMilestone>>(res);
  },

  /**
   * Delete payment milestone
   */
  async deletePaymentMilestone(
    quotationId: string,
    milestoneId: string
  ): Promise<SingleResponse<QuotationPaymentMilestone>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/payment-milestones/${encodeURIComponent(milestoneId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<SingleResponse<QuotationPaymentMilestone>>(res);
  },

  /**
   * Generate default payment schedule
   */
  async generateDefaultPaymentSchedule(
    quotationId: string,
    data?: GeneratePaymentScheduleInput
  ): Promise<SingleResponse<QuotationPaymentMilestone[]>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/payment-milestones/generate-default`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || {}),
    });

    return handleResponse<SingleResponse<QuotationPaymentMilestone[]>>(res);
  },

  // ──────────────────────── PACKAGE OPTIONS (PHASE 10.11B) ─────────────────────────

  /**
   * List package options
   */
  async getPackageOptions(
    quotationId: string
  ): Promise<SingleResponse<QuotationPackageOption[]>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/package-options`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<QuotationPackageOption[]>>(res);
  },

  /**
   * Create package option
   */
  async createPackageOption(
    quotationId: string,
    data: CreatePackageOptionInput
  ): Promise<SingleResponse<QuotationPackageOption>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/package-options`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<QuotationPackageOption>>(res);
  },

  /**
   * Update package option
   */
  async updatePackageOption(
    quotationId: string,
    optionId: string,
    data: UpdatePackageOptionInput
  ): Promise<SingleResponse<QuotationPackageOption>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/package-options/${encodeURIComponent(optionId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<SingleResponse<QuotationPackageOption>>(res);
  },

  /**
   * Delete package option
   */
  async deletePackageOption(
    quotationId: string,
    optionId: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/package-options/${encodeURIComponent(optionId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    return handleResponse<{ success: boolean; message: string }>(res);
  },

  /**
   * Reorder package options
   */
  async reorderPackageOptions(
    quotationId: string,
    data: ReorderPackageOptionsInput
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/package-options/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<{ success: boolean; message: string }>(res);
  },

  /**
   * Select package option on quotation (Agency side)
   */
  async selectPackageOption(
    quotationId: string,
    optionId: string
  ): Promise<SingleResponse<QuotationWithRelations>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/package-options/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });

    return handleResponse<SingleResponse<QuotationWithRelations>>(res);
  },

  /**
   * Generate 3 default package tiers (Standard, Deluxe, Luxury)
   */
  async generateDefaultPackageTiers(
    quotationId: string
  ): Promise<SingleResponse<QuotationPackageOption[]>> {
    const res = await fetch(`/api/quotations/${encodeURIComponent(quotationId)}/package-options/generate-default`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    return handleResponse<SingleResponse<QuotationPackageOption[]>>(res);
  },

  // ──────────────────────── TRIP INTEGRATION ─────────────────────────

  /**
   * Get trip's live costing and quotations
   */
  async getTripQuotation(tripId: string): Promise<SingleResponse<TripQuotationData>> {
    const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/quotation`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<TripQuotationData>>(res);
  },

  /**
   * Generate quotation snapshot from trip
   */
  async generateTripQuotation(
    tripId: string,
    data?: GenerateTripQuotationInput
  ): Promise<SingleResponse<QuotationWithRelations>> {
    const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/quotation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || {}),
    });

    return handleResponse<SingleResponse<QuotationWithRelations>>(res);
  },

  // ──────────────────────── PUBLIC SHARE & CUSTOMER ACTIONS ─────────────────────────

  /**
   * Get public sanitized quotation by share token
   */
  async getPublicQuotation(token: string): Promise<SingleResponse<PublicQuotationPayload>> {
    const res = await fetch(`/api/quotations/public/${encodeURIComponent(token)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    return handleResponse<SingleResponse<PublicQuotationPayload>>(res);
  },

  /**
   * Mark quotation viewed
   */
  async markQuotationViewed(token: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/quotations/public/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    return handleResponse<{ success: boolean; message: string }>(res);
  },

  /**
   * Public Action: Select Package Option (Customer)
   */
  async selectPublicPackageOption(
    token: string,
    optionId: string
  ): Promise<{ success: boolean; message: string; selectedPackageOptionId: string; finalAmount: number }> {
    const res = await fetch(`/api/quotations/public/${encodeURIComponent(token)}/select-option`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });

    return handleResponse<{ success: boolean; message: string; selectedPackageOptionId: string; finalAmount: number }>(res);
  },

  /**
   * Public Action: Accept Quotation
   */
  async acceptPublicQuotation(
    token: string,
    data?: AcceptQuotationInput
  ): Promise<{ success: boolean; message: string; quotationId: string; selectedPackageOptionId?: string; finalAmount?: number }> {
    const res = await fetch(`/api/quotations/public/${encodeURIComponent(token)}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data || {}),
    });

    return handleResponse<{ success: boolean; message: string; quotationId: string; selectedPackageOptionId?: string; finalAmount?: number }>(res);
  },

  /**
   * Public Action: Request Changes
   */
  async requestChangesPublicQuotation(
    token: string,
    data: RequestChangesInput
  ): Promise<{ success: boolean; message: string; quotationId: string }> {
    const res = await fetch(`/api/quotations/public/${encodeURIComponent(token)}/request-changes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    return handleResponse<{ success: boolean; message: string; quotationId: string }>(res);
  },

  /**
   * Get PDF download URL for authenticated agency user
   */
  getPdfUrl(id: string): string {
    return `/api/quotations/${encodeURIComponent(id)}/pdf`;
  },

  /**
   * Get PDF download URL for public customer
   */
  getPublicPdfUrl(token: string): string {
    return `/api/quotations/public/${encodeURIComponent(token)}/pdf`;
  },
};
