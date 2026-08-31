import { NotificationProvider, NotificationPayload, SendNotificationResult, NotificationChannel, NotificationDeliveryStatus } from "../types";

export class InAppNotificationProvider implements NotificationProvider {
  channel: NotificationChannel = NotificationChannel.IN_APP;

  async send(payload: NotificationPayload): Promise<SendNotificationResult> {
    // In-app notifications are stored directly in DB and displayed in traveler portal
    return {
      success: true,
      channel: this.channel,
      status: NotificationDeliveryStatus.SENT,
      providerMessageId: `inapp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date(),
    };
  }
}
