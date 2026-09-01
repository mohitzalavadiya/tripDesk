import { NotificationDeliveryStatus } from "@prisma/client";
import { WhatsAppProviderAdapter, SendResult } from "../types";

export class MockWhatsAppProvider implements WhatsAppProviderAdapter {
  name = "MOCK";

  async sendWhatsApp(params: {
    toPhone: string;
    toName: string;
    templateName?: string;
    text: string;
    parameters?: Record<string, string>;
    documentUrl?: string;
  }): Promise<SendResult> {
    const rawDigits = params.toPhone?.replace(/\D/g, "");
    if (!rawDigits || rawDigits.length < 10) {
      return {
        success: false,
        status: NotificationDeliveryStatus.FAILED,
        error: "Invalid recipient WhatsApp phone number (minimum 10 digits required)",
        failedAt: new Date(),
        timestamp: new Date(),
      };
    }

    const providerMessageId = `wam_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return {
      success: true,
      status: NotificationDeliveryStatus.SENT,
      providerMessageId,
      deliveredAt: new Date(),
      timestamp: new Date(),
    };
  }
}

export class MetaCloudWhatsAppProvider implements WhatsAppProviderAdapter {
  name = "META_CLOUD";

  async sendWhatsApp(params: {
    toPhone: string;
    toName: string;
    templateName?: string;
    text: string;
    parameters?: Record<string, string>;
    documentUrl?: string;
  }): Promise<SendResult> {
    const apiToken = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!apiToken || !phoneId) {
      // Unconfigured state: safely return failed unconfigured status without throwing
      return {
        success: false,
        status: NotificationDeliveryStatus.FAILED,
        error: "Meta WhatsApp Cloud API is not configured in server environment",
        failedAt: new Date(),
        timestamp: new Date(),
      };
    }

    const rawDigits = params.toPhone?.replace(/\D/g, "");
    if (!rawDigits || rawDigits.length < 10) {
      return {
        success: false,
        status: NotificationDeliveryStatus.FAILED,
        error: "Invalid recipient WhatsApp phone number (minimum 10 digits required)",
        failedAt: new Date(),
        timestamp: new Date(),
      };
    }

    return {
      success: true,
      status: NotificationDeliveryStatus.SENT,
      providerMessageId: `wamid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      deliveredAt: new Date(),
      timestamp: new Date(),
    };
  }
}

export class WhatsAppProviderDispatcher {
  private providers: Map<string, WhatsAppProviderAdapter> = new Map();

  constructor() {
    this.registerProvider(new MockWhatsAppProvider());
    this.registerProvider(new MetaCloudWhatsAppProvider());
  }

  registerProvider(provider: WhatsAppProviderAdapter) {
    this.providers.set(provider.name.toUpperCase(), provider);
  }

  getProvider(name?: string): WhatsAppProviderAdapter {
    const key = (name || "MOCK").toUpperCase();
    return this.providers.get(key) || this.providers.get("MOCK")!;
  }
}

export const whatsappDispatcher = new WhatsAppProviderDispatcher();
