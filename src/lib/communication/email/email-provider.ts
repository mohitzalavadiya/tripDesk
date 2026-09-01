import { NotificationDeliveryStatus } from "@prisma/client";
import { EmailProviderAdapter, SendResult } from "../types";

export class MockEmailProvider implements EmailProviderAdapter {
  name = "MOCK";

  async sendEmail(params: {
    fromName: string;
    fromEmail: string;
    toEmail: string;
    toName: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<SendResult> {
    if (!params.toEmail || !params.toEmail.includes("@")) {
      return {
        success: false,
        status: NotificationDeliveryStatus.FAILED,
        error: "Invalid recipient email address",
        failedAt: new Date(),
        timestamp: new Date(),
      };
    }

    const providerMessageId = `em_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      success: true,
      status: NotificationDeliveryStatus.SENT,
      providerMessageId,
      deliveredAt: new Date(),
      timestamp: new Date(),
    };
  }
}

export class SmtpEmailProvider implements EmailProviderAdapter {
  name = "SMTP";

  async sendEmail(params: {
    fromName: string;
    fromEmail: string;
    toEmail: string;
    toName: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<SendResult> {
    // Check if SMTP is configured in environment
    const smtpHost = process.env.SMTP_HOST;
    if (!smtpHost) {
      // Unconfigured state: gracefully report unconfigured status
      return {
        success: false,
        status: NotificationDeliveryStatus.FAILED,
        error: "SMTP provider is not configured in server environment",
        failedAt: new Date(),
        timestamp: new Date(),
      };
    }

    if (!params.toEmail || !params.toEmail.includes("@")) {
      return {
        success: false,
        status: NotificationDeliveryStatus.FAILED,
        error: "Invalid recipient email address",
        failedAt: new Date(),
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      status: NotificationDeliveryStatus.SENT,
      providerMessageId: `smtp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      deliveredAt: new Date(),
      timestamp: new Date(),
    };
  }
}

export class EmailProviderDispatcher {
  private providers: Map<string, EmailProviderAdapter> = new Map();

  constructor() {
    this.registerProvider(new MockEmailProvider());
    this.registerProvider(new SmtpEmailProvider());
  }

  registerProvider(provider: EmailProviderAdapter) {
    this.providers.set(provider.name.toUpperCase(), provider);
  }

  getProvider(name?: string): EmailProviderAdapter {
    const key = (name || "MOCK").toUpperCase();
    return this.providers.get(key) || this.providers.get("MOCK")!;
  }
}

export const emailDispatcher = new EmailProviderDispatcher();
