import { NotificationProvider, NotificationPayload, SendNotificationResult, NotificationChannel, NotificationDeliveryStatus } from "../types";

export class SmsNotificationProvider implements NotificationProvider {
  channel: NotificationChannel = NotificationChannel.SMS;

  async send(payload: NotificationPayload): Promise<SendNotificationResult> {
    const phone = payload.recipient?.phone;
    if (!phone) {
      return {
        success: false,
        channel: this.channel,
        status: NotificationDeliveryStatus.FAILED,
        error: "Recipient phone number not provided",
        timestamp: new Date(),
      };
    }

    // Provider abstraction stub (e.g. Twilio / MSG91 / Gupshup)
    return {
      success: true,
      channel: this.channel,
      status: NotificationDeliveryStatus.SENT,
      providerMessageId: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date(),
    };
  }
}
