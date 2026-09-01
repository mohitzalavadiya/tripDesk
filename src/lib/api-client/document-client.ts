import {
  TravelDocumentType,
  TravelDocumentStatus,
  NotificationChannel,
} from "@prisma/client";

export interface DocumentItem {
  id: string;
  documentNumber: string;
  documentType: TravelDocumentType;
  status: TravelDocumentStatus;
  title: string;
  version: number;
  isLatest: boolean;
  supersedesDocumentId?: string | null;
  bookingId?: string | null;
  bookingNumber?: string | null;
  tripId?: string | null;
  tripNumber?: string | null;
  tripTitle?: string | null;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  issuedAt?: string | null;
  revokedAt?: string | null;
  revokedReason?: string | null;
  generatedAt: string;
  createdAt: string;
}

export interface ListDocumentsParams {
  type?: TravelDocumentType;
  status?: TravelDocumentStatus;
  bookingId?: string;
  tripId?: string;
  customerId?: string;
  paymentId?: string;
  supplierId?: string;
  isLatest?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface GenerateBookingDocumentsPayload {
  documentTypes?: TravelDocumentType[];
  notes?: string;
}

export interface IssueDocumentPayload {
  notes?: string;
  notifyCustomer?: boolean;
  channel?: NotificationChannel;
}

export interface RevokeDocumentPayload {
  reason: string;
}

export interface ResendDocumentPayload {
  channel?: NotificationChannel;
  customRecipient?: string;
}

export class DocumentClient {
  private baseUrl = "/api/documents";

  /**
   * List travel documents with filtering and pagination
   */
  async list(params: ListDocumentsParams = {}): Promise<{
    data: DocumentItem[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params.type) searchParams.set("type", params.type);
    if (params.status) searchParams.set("status", params.status);
    if (params.bookingId) searchParams.set("bookingId", params.bookingId);
    if (params.tripId) searchParams.set("tripId", params.tripId);
    if (params.customerId) searchParams.set("customerId", params.customerId);
    if (params.paymentId) searchParams.set("paymentId", params.paymentId);
    if (params.supplierId) searchParams.set("supplierId", params.supplierId);
    if (params.isLatest !== undefined) searchParams.set("isLatest", String(params.isLatest));
    if (params.search) searchParams.set("search", params.search);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));

    const res = await fetch(`${this.baseUrl}?${searchParams.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to fetch travel documents");
    }
    const json = await res.json();
    return {
      data: json.data || [],
      meta: json.meta || { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
  }

  /**
   * Get single travel document detail
   */
  async get(id: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/${id}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to fetch document details");
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Generate travel documents for a booking
   */
  async generateForBooking(
    bookingId: string,
    payload: GenerateBookingDocumentsPayload = {}
  ): Promise<{ generatedCount: number; documents: DocumentItem[] }> {
    const res = await fetch(`/api/bookings/${bookingId}/documents/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to generate booking travel documents");
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Issue a generated travel document
   */
  async issue(id: string, payload: IssueDocumentPayload = {}): Promise<DocumentItem> {
    const res = await fetch(`${this.baseUrl}/${id}/issue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to issue travel document");
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Revoke an issued travel document
   */
  async revoke(id: string, payload: RevokeDocumentPayload): Promise<DocumentItem> {
    const res = await fetch(`${this.baseUrl}/${id}/revoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to revoke travel document");
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Resend an issued travel document via Phase 15 communication layer
   */
  async resend(
    id: string,
    payload: ResendDocumentPayload = {}
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/${id}/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to resend travel document");
    }
    const json = await res.json();
    return json.data;
  }

  /**
   * Get preview URL for inline display
   */
  getPreviewUrl(id: string): string {
    return `${this.baseUrl}/${id}/preview`;
  }

  /**
   * Get download URL for attachment download
   */
  getDownloadUrl(id: string): string {
    return `${this.baseUrl}/${id}/download`;
  }
}

export const documentClient = new DocumentClient();
