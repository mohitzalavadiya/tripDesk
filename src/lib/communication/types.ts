import {
  CustomerNotificationType,
  NotificationChannel,
  NotificationDeliveryStatus,
} from "@prisma/client";

export interface CommunicationRecipient {
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface CommunicationEventPayload {
  agencyId: string;
  customerId: string;
  type: CustomerNotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  recipient?: CommunicationRecipient;
  subject?: string;
  linkUrl?: string | null;
  idempotencyKey?: string | null;
  tripId?: string | null;
  bookingId?: string | null;
  quotationId?: string | null;
  enquiryId?: string | null;
  metadata?: Record<string, any> | null;
}

export interface SendResult {
  success: boolean;
  status: NotificationDeliveryStatus;
  providerMessageId?: string;
  error?: string;
  deliveredAt?: Date;
  failedAt?: Date;
  timestamp: Date;
}

export interface EmailRenderOutput {
  subject: string;
  html: string;
  text: string;
}

export interface WhatsAppRenderOutput {
  templateName?: string;
  text: string;
  parameters?: Record<string, string>;
  documentUrl?: string;
}

export interface EmailProviderAdapter {
  name: string;
  sendEmail(params: {
    fromName: string;
    fromEmail: string;
    toEmail: string;
    toName: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<SendResult>;
}

export interface WhatsAppProviderAdapter {
  name: string;
  sendWhatsApp(params: {
    toPhone: string;
    toName: string;
    templateName?: string;
    text: string;
    parameters?: Record<string, string>;
    documentUrl?: string;
  }): Promise<SendResult>;
}
