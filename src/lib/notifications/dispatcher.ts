import {
  NotificationChannel,
  NotificationPayload,
  NotificationProvider,
  SendNotificationResult,
  NotificationDeliveryStatus,
} from "./types";
import { InAppNotificationProvider } from "./providers/in-app-provider";
import { EmailNotificationProvider } from "./providers/email-provider";
import { SmsNotificationProvider } from "./providers/sms-provider";
import { WhatsAppNotificationProvider } from "./providers/whatsapp-provider";

export class NotificationDispatcher {
  private providers: Map<NotificationChannel, NotificationProvider> = new Map();

  constructor() {
    this.registerProvider(new InAppNotificationProvider());
    this.registerProvider(new EmailNotificationProvider());
    this.registerProvider(new SmsNotificationProvider());
    this.registerProvider(new WhatsAppNotificationProvider());
  }

  registerProvider(provider: NotificationProvider) {
    this.providers.set(provider.channel, provider);
  }

  async dispatch(payload: NotificationPayload): Promise<SendNotificationResult> {
    const provider = this.providers.get(payload.channel);
    if (!provider) {
      return {
        success: false,
        channel: payload.channel,
        status: NotificationDeliveryStatus.FAILED,
        error: `No provider registered for channel: ${payload.channel}`,
        timestamp: new Date(),
      };
    }

    try {
      return await provider.send(payload);
    } catch (err: any) {
      return {
        success: false,
        channel: payload.channel,
        status: NotificationDeliveryStatus.FAILED,
        error: err?.message || "Provider dispatch error",
        timestamp: new Date(),
      };
    }
  }
}

export const notificationDispatcher = new NotificationDispatcher();
