import {
  CustomerNotificationType,
  NotificationChannel,
  NotificationDeliveryStatus,
} from "@prisma/client";

export interface CommunicationLogItem {
  id: string;
  agencyId: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string | null;
  tripId: string | null;
  tripTitle?: string | null;
  bookingId: string | null;
  bookingNumber?: string | null;
  quotationId: string | null;
  quotationNumber?: string | null;
  enquiryId: string | null;
  enquiryNumber?: string | null;
  type: CustomerNotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  recipient: string | null;
  subject: string | null;
  status: NotificationDeliveryStatus;
  providerMessageId: string | null;
  failureReason: string | null;
  retryCount: number;
  idempotencyKey: string | null;
  linkUrl: string | null;
  sentAt: string;
  deliveredAt: string | null;
  failedAt: string | null;
  createdAt: string;
}

export interface CommunicationSettings {
  id: string;
  agencyId: string;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  defaultSenderName?: string | null;
  defaultSenderEmail?: string | null;
  autoQuotationSent: boolean;
  autoBookingConfirmed: boolean;
  autoPaymentReminders: boolean;
  autoTravelReminders: boolean;
  autoFeedbackRequests: boolean;
  paymentReminderDays: number;
  travelReminderDays: number;
  whatsappProvider: string;
  emailProvider: string;
}

export interface ListCommunicationLogsParams {
  channel?: NotificationChannel;
  status?: NotificationDeliveryStatus;
  type?: CustomerNotificationType;
  customerId?: string;
  bookingId?: string;
  quotationId?: string;
  tripId?: string;
  enquiryId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SendManualMessageParams {
  customerId: string;
  channel: NotificationChannel;
  type?: CustomerNotificationType;
  title: string;
  message: string;
  recipient?: string;
  subject?: string;
  tripId?: string | null;
  bookingId?: string | null;
  quotationId?: string | null;
  enquiryId?: string | null;
  linkUrl?: string | null;
}

export const communicationClient = {
  /**
   * List communication history
   */
  async listLogs(params: ListCommunicationLogsParams = {}) {
    const searchParams = new URLSearchParams();
    if (params.channel) searchParams.set("channel", params.channel);
    if (params.status) searchParams.set("status", params.status);
    if (params.type) searchParams.set("type", params.type);
    if (params.customerId) searchParams.set("customerId", params.customerId);
    if (params.bookingId) searchParams.set("bookingId", params.bookingId);
    if (params.quotationId) searchParams.set("quotationId", params.quotationId);
    if (params.tripId) searchParams.set("tripId", params.tripId);
    if (params.enquiryId) searchParams.set("enquiryId", params.enquiryId);
    if (params.search) searchParams.set("search", params.search);
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());

    const res = await fetch(`/api/communication/logs?${searchParams.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to fetch communication logs");
    }
    const json = await res.json();
    return json.data as {
      data: CommunicationLogItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  },

  /**
   * Get single communication detail
   */
  async getLogDetails(id: string) {
    const res = await fetch(`/api/communication/logs/${encodeURIComponent(id)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to fetch communication details");
    }
    const json = await res.json();
    return json.data as CommunicationLogItem;
  },

  /**
   * Resend / retry communication
   */
  async resend(id: string, customRecipient?: string) {
    const res = await fetch(`/api/communication/logs/${encodeURIComponent(id)}/resend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customRecipient }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to resend communication");
    }
    const json = await res.json();
    return json.data as CommunicationLogItem;
  },

  /**
   * Send manual customer message
   */
  async sendManual(input: SendManualMessageParams) {
    const res = await fetch("/api/communication/send-manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to send manual message");
    }
    const json = await res.json();
    return json.data as CommunicationLogItem;
  },

  /**
   * Get agency settings
   */
  async getSettings() {
    const res = await fetch("/api/communication/settings");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to fetch communication settings");
    }
    const json = await res.json();
    return json.data as CommunicationSettings;
  },

  /**
   * Update agency settings
   */
  async updateSettings(settings: Partial<CommunicationSettings>) {
    const res = await fetch("/api/communication/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to update communication settings");
    }
    const json = await res.json();
    return json.data as CommunicationSettings;
  },

  /**
   * Run automated reminder sweeps
   */
  async runAutomation(scope: "all" | "payment_reminders" | "travel_reminders" | "feedback_requests" = "all") {
    const res = await fetch("/api/communication/automation/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || "Failed to run communication automation");
    }
    const json = await res.json();
    return json.data as {
      success: boolean;
      summary: {
        paymentRemindersSent: number;
        travelRemindersSent: number;
        feedbackRequestsSent: number;
        totalDispatched: number;
      };
    };
  },
};
