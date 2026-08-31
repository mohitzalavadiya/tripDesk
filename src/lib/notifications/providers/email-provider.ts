import { NotificationProvider, NotificationPayload, SendNotificationResult, NotificationChannel, NotificationDeliveryStatus } from "../types";

export class EmailNotificationProvider implements NotificationProvider {
  channel: NotificationChannel = NotificationChannel.EMAIL;

  async send(payload: NotificationPayload): Promise<SendNotificationResult> {
    const email = payload.recipient?.email;
    if (!email) {
      return {
        success: false,
        channel: this.channel,
        status: NotificationDeliveryStatus.FAILED,
        error: "Recipient email address not provided",
        timestamp: new Date(),
      };
    }

    // Provider abstraction stub (e.g. Resend / SendGrid / SES)
    // Non-blocking execution
    return {
      success: true,
      channel: this.channel,
      status: NotificationDeliveryStatus.SENT,
      providerMessageId: `email-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date(),
    };
  }
}
