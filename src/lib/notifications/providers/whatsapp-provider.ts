import { NotificationProvider, NotificationPayload, SendNotificationResult, NotificationChannel, NotificationDeliveryStatus } from "../types";

export class WhatsAppNotificationProvider implements NotificationProvider {
  channel: NotificationChannel = NotificationChannel.WHATSAPP;

  async send(payload: NotificationPayload): Promise<SendNotificationResult> {
    const phone = payload.recipient?.phone;
    if (!phone) {
      return {
        success: false,
        channel: this.channel,
        status: NotificationDeliveryStatus.FAILED,
        error: "Recipient WhatsApp phone number not provided",
        timestamp: new Date(),
      };
    }

    // Provider abstraction stub (e.g. Meta Cloud API / Gupshup / Interakt)
    return {
      success: true,
      channel: this.channel,
      status: NotificationDeliveryStatus.SENT,
      providerMessageId: `wa-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date(),
    };
  }
}
