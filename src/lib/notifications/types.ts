import { CustomerNotificationType, NotificationChannel, NotificationDeliveryStatus } from "@prisma/client";

export { CustomerNotificationType, NotificationChannel, NotificationDeliveryStatus };

export interface NotificationPayload {
  agencyId: string;
  customerId: string;
  tripId?: string | null;
  bookingId?: string | null;
  type: CustomerNotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  idempotencyKey?: string | null;
  linkUrl?: string | null;
  metadata?: Record<string, any> | null;
  recipient?: {
    name?: string;
    phone?: string | null;
    email?: string | null;
  };
}

export interface SendNotificationResult {
  success: boolean;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  providerMessageId?: string;
  error?: string;
  timestamp: Date;
}

export interface NotificationProvider {
  channel: NotificationChannel;
  send(payload: NotificationPayload): Promise<SendNotificationResult>;
}
