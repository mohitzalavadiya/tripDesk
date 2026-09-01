import "server-only";
import { prisma } from "@/lib/prisma";
import {
  CustomerNotification,
  CustomerNotificationType,
  NotificationChannel,
  NotificationDeliveryStatus,
  Prisma,
  AgencyCommunicationSetting,
} from "@prisma/client";
import {
  CommunicationEventPayload,
  CommunicationRecipient,
  SendResult,
} from "@/lib/communication/types";
import { EmailTemplateEngine, EmailTemplateVariables } from "@/lib/communication/email/template-engine";
import { emailDispatcher } from "@/lib/communication/email/email-provider";
import { WhatsAppTemplateEngine, WhatsAppTemplateVariables } from "@/lib/communication/whatsapp/template-engine";
import { whatsappDispatcher } from "@/lib/communication/whatsapp/whatsapp-provider";
import {
  ListCommunicationLogsInput,
  SendManualMessageInput,
  UpdateCommunicationSettingsInput,
} from "@/lib/validation/communication-schema";

export interface CommunicationLogItemView {
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

export class CommunicationService {
  /**
   * List communication history with multi-tenant scoping and filters
   */
  async listCommunicationLogs(
    agencyId: string,
    query: ListCommunicationLogsInput
  ): Promise<{
    data: CommunicationLogItemView[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      channel,
      status,
      type,
      customerId,
      bookingId,
      quotationId,
      tripId,
      enquiryId,
      search,
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.CustomerNotificationWhereInput = {
      agencyId,
      ...(channel && { channel }),
      ...(status && { status }),
      ...(type && { type }),
      ...(customerId && { customerId }),
      ...(bookingId && { bookingId }),
      ...(quotationId && { quotationId }),
      ...(tripId && { tripId }),
      ...(enquiryId && { enquiryId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { message: { contains: search, mode: "insensitive" } },
          { recipient: { contains: search, mode: "insensitive" } },
          { customer: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.customerNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
          trip: { select: { id: true, title: true, tripNumber: true } },
          booking: { select: { id: true, bookingNumber: true } },
          quotation: { select: { id: true, quotationNumber: true } },
          enquiry: { select: { id: true, enquiryNumber: true } },
        },
      }),
      prisma.customerNotification.count({ where }),
    ]);

    const data = items.map((item) => this.mapToItemView(item));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get single communication record details
   */
  async getCommunicationDetails(
    agencyId: string,
    communicationId: string
  ): Promise<CommunicationLogItemView | null> {
    const item = await prisma.customerNotification.findFirst({
      where: { id: communicationId, agencyId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        trip: { select: { id: true, title: true, tripNumber: true } },
        booking: { select: { id: true, bookingNumber: true } },
        quotation: { select: { id: true, quotationNumber: true } },
        enquiry: { select: { id: true, enquiryNumber: true } },
      },
    });

    if (!item) return null;
    return this.mapToItemView(item);
  }

  /**
   * Get or create default agency communication settings
   */
  async getAgencySettings(agencyId: string): Promise<AgencyCommunicationSetting> {
    let settings = await prisma.agencyCommunicationSetting.findUnique({
      where: { agencyId },
    });

    if (!settings) {
      const agency = await prisma.agency.findUnique({
        where: { id: agencyId },
        select: { name: true, email: true },
      });

      settings = await prisma.agencyCommunicationSetting.create({
        data: {
          agencyId,
          defaultSenderName: agency?.name || "TripDesk Support",
          defaultSenderEmail: agency?.email || "notifications@tripdesk.internal",
          emailEnabled: true,
          whatsappEnabled: true,
          autoQuotationSent: true,
          autoBookingConfirmed: true,
          autoPaymentReminders: true,
          autoTravelReminders: true,
          autoFeedbackRequests: true,
          paymentReminderDays: 3,
          travelReminderDays: 3,
          whatsappProvider: "MOCK",
          emailProvider: "MOCK",
        },
      });
    }

    return settings;
  }

  /**
   * Update agency communication settings
   */
  async updateAgencySettings(
    agencyId: string,
    input: UpdateCommunicationSettingsInput
  ): Promise<AgencyCommunicationSetting> {
    await this.getAgencySettings(agencyId); // Ensures existence

    return prisma.agencyCommunicationSetting.update({
      where: { agencyId },
      data: {
        ...input,
      },
    });
  }

  /**
   * Centralized send communication with deterministic idempotency, customer preference check,
   * sanitized DTO rendering, provider dispatch, and delivery state tracking.
   */
  async sendCommunication(
    agencyId: string,
    payload: CommunicationEventPayload
  ): Promise<CustomerNotification | null> {
    const {
      customerId,
      type,
      channel,
      title,
      message,
      linkUrl,
      idempotencyKey,
      tripId,
      bookingId,
      quotationId,
      enquiryId,
      metadata,
    } = payload;

    // 1. Deterministic Idempotency Guard
    if (idempotencyKey) {
      const existing = await prisma.customerNotification.findFirst({
        where: { agencyId, idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Fetch Customer, Preferences & Agency Details
    const [customer, agency, settings] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: customerId, agencyId },
        include: { notificationPreference: true },
      }),
      prisma.agency.findUnique({
        where: { id: agencyId },
        select: { id: true, name: true, phone: true, email: true },
      }),
      this.getAgencySettings(agencyId),
    ]);

    if (!customer || !agency) {
      return null;
    }

    // 3. Customer Channel Preferences Check
    const prefs = customer.notificationPreference;
    if (prefs) {
      if (channel === NotificationChannel.EMAIL && !prefs.emailEnabled) {
        // Customer opted out of email
        return this.createSkippedRecord(agencyId, customer.id, payload, "Customer opted out of email notifications");
      }
      if (channel === NotificationChannel.WHATSAPP && !prefs.whatsappEnabled) {
        // Customer opted out of WhatsApp
        return this.createSkippedRecord(agencyId, customer.id, payload, "Customer opted out of WhatsApp notifications");
      }
      if (channel === NotificationChannel.SMS && !prefs.smsEnabled) {
        return this.createSkippedRecord(agencyId, customer.id, payload, "Customer opted out of SMS notifications");
      }
    }

    // 4. Agency Settings Check
    if (channel === NotificationChannel.EMAIL && !settings.emailEnabled) {
      return this.createSkippedRecord(agencyId, customer.id, payload, "Agency has disabled email notifications");
    }
    if (channel === NotificationChannel.WHATSAPP && !settings.whatsappEnabled) {
      return this.createSkippedRecord(agencyId, customer.id, payload, "Agency has disabled WhatsApp notifications");
    }

    // 5. Determine Recipient and Subject
    const recipientContact =
      channel === NotificationChannel.EMAIL
        ? payload.recipient?.email || customer.email
        : payload.recipient?.phone || customer.phone;

    let emailSubject = payload.subject || title;
    let sendResult: SendResult;

    // 6. Provider Dispatch Execution
    if (channel === NotificationChannel.EMAIL) {
      const emailProvider = emailDispatcher.getProvider(settings.emailProvider);
      const emailVars: EmailTemplateVariables = {
        customerName: payload.recipient?.name || customer.name,
        agencyName: agency.name,
        agencyEmail: settings.defaultSenderEmail || agency.email,
        agencyPhone: agency.phone,
        destination: metadata?.destination || null,
        tripName: metadata?.tripName || null,
        quotationNumber: metadata?.quotationNumber || null,
        quotationUrl: linkUrl || metadata?.quotationUrl || null,
        quotationValidity: metadata?.quotationValidity || null,
        quotationTotal: metadata?.quotationTotal ? Number(metadata.quotationTotal).toLocaleString("en-IN") : null,
        bookingNumber: metadata?.bookingNumber || null,
        bookingStatus: metadata?.bookingStatus || null,
        travelStartDate: metadata?.travelStartDate || null,
        travelEndDate: metadata?.travelEndDate || null,
        amountDue: metadata?.amountDue ? Number(metadata.amountDue).toLocaleString("en-IN") : null,
        dueDate: metadata?.dueDate || null,
        currency: metadata?.currency || "₹",
        receiptNumber: metadata?.receiptNumber || null,
        paymentMethod: metadata?.paymentMethod || null,
        feedbackUrl: linkUrl || metadata?.feedbackUrl || null,
        customMessage: message,
      };

      const rendered = EmailTemplateEngine.render(type, emailVars);
      emailSubject = rendered.subject;

      sendResult = await emailProvider.sendEmail({
        fromName: settings.defaultSenderName || agency.name,
        fromEmail: settings.defaultSenderEmail || agency.email,
        toEmail: recipientContact || "",
        toName: payload.recipient?.name || customer.name,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
    } else if (channel === NotificationChannel.WHATSAPP) {
      const whatsappProvider = whatsappDispatcher.getProvider(settings.whatsappProvider);
      const waVars: WhatsAppTemplateVariables = {
        customerName: payload.recipient?.name || customer.name,
        agencyName: agency.name,
        agencyPhone: agency.phone,
        destination: metadata?.destination || null,
        quotationNumber: metadata?.quotationNumber || null,
        quotationUrl: linkUrl || metadata?.quotationUrl || null,
        bookingNumber: metadata?.bookingNumber || null,
        travelDates: metadata?.travelDates || null,
        amountDue: metadata?.amountDue ? Number(metadata.amountDue).toLocaleString("en-IN") : null,
        dueDate: metadata?.dueDate || null,
        currency: metadata?.currency || "₹",
        receiptRef: metadata?.receiptNumber || null,
        departureDate: metadata?.travelStartDate || null,
        feedbackUrl: linkUrl || metadata?.feedbackUrl || null,
        customMessage: message,
      };

      const rendered = WhatsAppTemplateEngine.render(type, waVars);

      sendResult = await whatsappProvider.sendWhatsApp({
        toPhone: recipientContact || "",
        toName: payload.recipient?.name || customer.name,
        templateName: rendered.templateName,
        text: rendered.text,
        parameters: rendered.parameters,
      });
    } else {
      // In-App or other channel
      sendResult = {
        success: true,
        status: NotificationDeliveryStatus.SENT,
        providerMessageId: `inapp_${Date.now()}`,
        deliveredAt: new Date(),
        timestamp: new Date(),
      };
    }

    // 7. Persist Communication Record in Database
    const createdNotification = await prisma.customerNotification.create({
      data: {
        agencyId,
        customerId: customer.id,
        tripId: tripId || null,
        bookingId: bookingId || null,
        quotationId: quotationId || null,
        enquiryId: enquiryId || null,
        type,
        title,
        message,
        channel,
        status: sendResult.status,
        recipient: recipientContact || null,
        subject: channel === NotificationChannel.EMAIL ? emailSubject : null,
        providerMessageId: sendResult.providerMessageId || null,
        failureReason: sendResult.error || null,
        idempotencyKey: idempotencyKey || null,
        linkUrl: linkUrl || null,
        sentAt: new Date(),
        deliveredAt: sendResult.deliveredAt || null,
        failedAt: sendResult.failedAt || null,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    return createdNotification;
  }

  /**
   * Resend or retry a previously failed/completed communication
   */
  async resendCommunication(
    agencyId: string,
    communicationId: string,
    customRecipient?: string
  ): Promise<CustomerNotification> {
    const existing = await prisma.customerNotification.findFirst({
      where: { id: communicationId, agencyId },
      include: {
        customer: true,
        agency: true,
      },
    });

    if (!existing) {
      throw new Error("Communication record not found or access denied.");
    }

    const settings = await this.getAgencySettings(agencyId);
    const recipientContact = customRecipient || existing.recipient || (existing.channel === NotificationChannel.EMAIL ? existing.customer.email : existing.customer.phone);

    let sendResult: SendResult;

    if (existing.channel === NotificationChannel.EMAIL) {
      const emailProvider = emailDispatcher.getProvider(settings.emailProvider);
      const emailVars: EmailTemplateVariables = {
        customerName: existing.customer.name,
        agencyName: existing.agency.name,
        agencyEmail: settings.defaultSenderEmail || existing.agency.email,
        agencyPhone: existing.agency.phone,
        customMessage: existing.message,
      };

      const rendered = EmailTemplateEngine.render(existing.type, emailVars);

      sendResult = await emailProvider.sendEmail({
        fromName: settings.defaultSenderName || existing.agency.name,
        fromEmail: settings.defaultSenderEmail || existing.agency.email,
        toEmail: recipientContact || "",
        toName: existing.customer.name,
        subject: existing.subject || rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
    } else if (existing.channel === NotificationChannel.WHATSAPP) {
      const whatsappProvider = whatsappDispatcher.getProvider(settings.whatsappProvider);
      const waVars: WhatsAppTemplateVariables = {
        customerName: existing.customer.name,
        agencyName: existing.agency.name,
        agencyPhone: existing.agency.phone,
        customMessage: existing.message,
      };

      const rendered = WhatsAppTemplateEngine.render(existing.type, waVars);

      sendResult = await whatsappProvider.sendWhatsApp({
        toPhone: recipientContact || "",
        toName: existing.customer.name,
        templateName: rendered.templateName,
        text: rendered.text,
        parameters: rendered.parameters,
      });
    } else {
      sendResult = {
        success: true,
        status: NotificationDeliveryStatus.SENT,
        providerMessageId: `inapp_retry_${Date.now()}`,
        deliveredAt: new Date(),
        timestamp: new Date(),
      };
    }

    const updated = await prisma.customerNotification.update({
      where: { id: existing.id },
      data: {
        status: sendResult.status,
        recipient: recipientContact || null,
        providerMessageId: sendResult.providerMessageId || existing.providerMessageId,
        failureReason: sendResult.error || null,
        retryCount: { increment: 1 },
        sentAt: new Date(),
        deliveredAt: sendResult.deliveredAt || null,
        failedAt: sendResult.failedAt || null,
      },
    });

    return updated;
  }

  /**
   * Agency-initiated manual message
   */
  async sendManualMessage(
    agencyId: string,
    input: SendManualMessageInput
  ): Promise<CustomerNotification | null> {
    const {
      customerId,
      channel,
      type,
      title,
      message,
      recipient,
      subject,
      tripId,
      bookingId,
      quotationId,
      enquiryId,
      linkUrl,
    } = input;

    return this.sendCommunication(agencyId, {
      agencyId,
      customerId,
      channel,
      type,
      title,
      message,
      subject,
      recipient: recipient ? { name: "Customer", email: recipient, phone: recipient } : undefined,
      tripId,
      bookingId,
      quotationId,
      enquiryId,
      linkUrl,
      idempotencyKey: `manual-${agencyId}-${customerId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT-DRIVEN AUTOMATION DISPATCHERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 1. Enquiry / Lead Created Acknowledgement
   */
  async notifyEnquiryCreated(agencyId: string, enquiryId: string) {
    const enquiry = await prisma.enquiry.findFirst({
      where: { id: enquiryId, agencyId },
      include: { customer: true },
    });

    if (!enquiry || !enquiry.customer) return null;

    const metadata = {
      enquiryNumber: enquiry.enquiryNumber,
      destination: enquiry.destination,
    };

    // Send Email
    if (enquiry.customer.email) {
      await this.sendCommunication(agencyId, {
        agencyId,
        customerId: enquiry.customerId,
        enquiryId: enquiry.id,
        type: CustomerNotificationType.ENQUIRY_CREATED,
        channel: NotificationChannel.EMAIL,
        title: `Inquiry Received: ${enquiry.destination}`,
        message: `Thank you for your trip inquiry to ${enquiry.destination}. We are working on your custom travel plan.`,
        recipient: { name: enquiry.customer.name, email: enquiry.customer.email },
        metadata,
        idempotencyKey: `enq-created-email-${enquiry.id}`,
      });
    }

    // Send WhatsApp
    if (enquiry.customer.phone) {
      await this.sendCommunication(agencyId, {
        agencyId,
        customerId: enquiry.customerId,
        enquiryId: enquiry.id,
        type: CustomerNotificationType.ENQUIRY_CREATED,
        channel: NotificationChannel.WHATSAPP,
        title: `Inquiry Received: ${enquiry.destination}`,
        message: `Thank you for your trip inquiry to ${enquiry.destination}.`,
        recipient: { name: enquiry.customer.name, phone: enquiry.customer.phone },
        metadata,
        idempotencyKey: `enq-created-wa-${enquiry.id}`,
      });
    }
  }

  /**
   * 2. Quotation Proposal Sent Notification
   */
  async notifyQuotationSent(agencyId: string, quotationId: string) {
    const quote = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId },
      include: {
        customer: true,
        trip: true,
      },
    });

    if (!quote || !quote.customer) return null;

    const publicUrl = quote.shareToken ? `/q/${quote.shareToken}` : null;
    const metadata = {
      quotationNumber: quote.quotationNumber,
      quotationUrl: publicUrl,
      quotationTotal: Number(quote.finalAmount),
      quotationValidity: quote.validUntil ? quote.validUntil.toLocaleDateString("en-IN") : null,
      destination: quote.trip.title,
    };

    // Send Email
    if (quote.customer.email) {
      await this.sendCommunication(agencyId, {
        agencyId,
        customerId: quote.customerId,
        quotationId: quote.id,
        tripId: quote.tripId,
        type: CustomerNotificationType.QUOTATION_SENT,
        channel: NotificationChannel.EMAIL,
        title: `Custom Itinerary Proposal: ${quote.quotationNumber}`,
        message: `Your travel proposal for ${quote.trip.title} is ready. Total: ₹${Number(quote.finalAmount).toLocaleString("en-IN")}.`,
        linkUrl: publicUrl,
        recipient: { name: quote.customer.name, email: quote.customer.email },
        metadata,
        idempotencyKey: `quote-sent-email-${quote.id}-${quote.version}`,
      });
    }

    // Send WhatsApp
    if (quote.customer.phone) {
      await this.sendCommunication(agencyId, {
        agencyId,
        customerId: quote.customerId,
        quotationId: quote.id,
        tripId: quote.tripId,
        type: CustomerNotificationType.QUOTATION_SENT,
        channel: NotificationChannel.WHATSAPP,
        title: `Proposal Ready: ${quote.quotationNumber}`,
        message: `Your travel proposal for ${quote.trip.title} is ready.`,
        linkUrl: publicUrl,
        recipient: { name: quote.customer.name, phone: quote.customer.phone },
        metadata,
        idempotencyKey: `quote-sent-wa-${quote.id}-${quote.version}`,
      });
    }
  }

  /**
   * 3. Quotation Viewed Advisor Alert
   */
  async notifyQuotationViewed(agencyId: string, quotationId: string) {
    const quote = await prisma.quotation.findFirst({
      where: { id: quotationId, agencyId },
      include: { customer: true, trip: true },
    });

    if (!quote || !quote.customer) return null;

    // Create in-app audit notification with 2-hour cooldown check
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentView = await prisma.customerNotification.findFirst({
      where: {
        agencyId,
        quotationId: quote.id,
        type: CustomerNotificationType.QUOTATION_VIEWED,
        createdAt: { gte: twoHoursAgo },
      },
    });

    if (recentView) {
      return recentView;
    }

    return this.sendCommunication(agencyId, {
      agencyId,
      customerId: quote.customerId,
      quotationId: quote.id,
      tripId: quote.tripId,
      type: CustomerNotificationType.QUOTATION_VIEWED,
      channel: NotificationChannel.IN_APP,
      title: `Proposal Viewed: ${quote.customer.name}`,
      message: `${quote.customer.name} just opened quotation proposal ${quote.quotationNumber} (${quote.trip.title}).`,
      idempotencyKey: `quote-viewed-${quote.id}-${Math.floor(Date.now() / (1000 * 60 * 60 * 2))}`,
    });
  }

  /**
   * 4. Quotation Accepted / Booking Confirmed Notification
   */
  async notifyBookingConfirmed(agencyId: string, bookingId: string) {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId },
      include: {
        customer: true,
        trip: true,
        quotation: true,
      },
    });

    if (!booking || !booking.customer) return null;

    const startDateFormatted = booking.trip.startDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const endDateFormatted = booking.trip.endDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const metadata = {
      bookingNumber: booking.bookingNumber,
      bookingStatus: booking.status,
      destination: booking.trip.title,
      travelStartDate: startDateFormatted,
      travelEndDate: endDateFormatted,
      travelDates: `${startDateFormatted} — ${endDateFormatted}`,
    };

    // Send Email
    if (booking.customer.email) {
      await this.sendCommunication(agencyId, {
        agencyId,
        customerId: booking.customerId,
        bookingId: booking.id,
        tripId: booking.tripId,
        quotationId: booking.quotationId,
        type: CustomerNotificationType.BOOKING_CONFIRMED,
        channel: NotificationChannel.EMAIL,
        title: `Reservation Confirmed: #${booking.bookingNumber}`,
        message: `Your travel booking #${booking.bookingNumber} for ${booking.trip.title} is confirmed. Dates: ${startDateFormatted} to ${endDateFormatted}.`,
        linkUrl: `/customer/trips/${booking.tripId}`,
        recipient: { name: booking.customer.name, email: booking.customer.email },
        metadata,
        idempotencyKey: `booking-conf-email-${booking.id}`,
      });
    }

    // Send WhatsApp
    if (booking.customer.phone) {
      await this.sendCommunication(agencyId, {
        agencyId,
        customerId: booking.customerId,
        bookingId: booking.id,
        tripId: booking.tripId,
        quotationId: booking.quotationId,
        type: CustomerNotificationType.BOOKING_CONFIRMED,
        channel: NotificationChannel.WHATSAPP,
        title: `Reservation Confirmed: #${booking.bookingNumber}`,
        message: `Your booking #${booking.bookingNumber} is confirmed!`,
        linkUrl: `/customer/trips/${booking.tripId}`,
        recipient: { name: booking.customer.name, phone: booking.customer.phone },
        metadata,
        idempotencyKey: `booking-conf-wa-${booking.id}`,
      });
    }
  }

  /**
   * 5. Customer Payment Received Receipt
   */
  async notifyPaymentReceived(agencyId: string, paymentId: string) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, agencyId },
      include: {
        customer: true,
        booking: { include: { trip: true } },
      },
    });

    if (!payment || !payment.customer) return null;

    const formattedAmount = Number(payment.amount).toLocaleString("en-IN");
    const bookingNumber = payment.booking?.bookingNumber || "Your Booking";

    const metadata = {
      amountDue: formattedAmount,
      currency: payment.currency,
      bookingNumber,
      receiptNumber: payment.receiptNumber || payment.paymentNumber,
      paymentMethod: payment.paymentMethod,
    };

    // Send Email
    if (payment.customer.email) {
      await this.sendCommunication(agencyId, {
        agencyId,
        customerId: payment.customer.id,
        bookingId: payment.bookingId,
        tripId: payment.tripId || payment.booking?.tripId,
        type: CustomerNotificationType.PAYMENT_RECEIVED,
        channel: NotificationChannel.EMAIL,
        title: `Payment Receipt: ₹${formattedAmount}`,
        message: `We received your payment of ₹${formattedAmount} for booking ${bookingNumber}. Receipt: ${payment.paymentNumber}.`,
        linkUrl: payment.tripId ? `/customer/trips/${payment.tripId}/payments` : "/customer",
        recipient: { name: payment.customer.name, email: payment.customer.email },
        metadata,
        idempotencyKey: `pay-rcvd-email-${payment.id}`,
      });
    }

    // Send WhatsApp
    if (payment.customer.phone) {
      await this.sendCommunication(agencyId, {
        agencyId,
        customerId: payment.customer.id,
        bookingId: payment.bookingId,
        tripId: payment.tripId || payment.booking?.tripId,
        type: CustomerNotificationType.PAYMENT_RECEIVED,
        channel: NotificationChannel.WHATSAPP,
        title: `Payment Receipt: ₹${formattedAmount}`,
        message: `Payment received of ₹${formattedAmount} for booking ${bookingNumber}.`,
        linkUrl: payment.tripId ? `/customer/trips/${payment.tripId}/payments` : "/customer",
        recipient: { name: payment.customer.name, phone: payment.customer.phone },
        metadata,
        idempotencyKey: `pay-rcvd-wa-${payment.id}`,
      });
    }
  }

  /**
   * 6. Scheduled Automation: Payment Reminders
   * Scans bookings for upcoming milestones or overdue balances
   */
  async runPaymentReminders(agencyId: string): Promise<{ sentCount: number }> {
    const settings = await this.getAgencySettings(agencyId);
    if (!settings.autoPaymentReminders) {
      return { sentCount: 0 };
    }

    const now = new Date();
    const reminderThreshold = new Date(now.getTime() + (settings.paymentReminderDays || 3) * 24 * 60 * 60 * 1000);

    // Find confirmed active bookings with unpaid/partially paid balance
    const bookings = await prisma.booking.findMany({
      where: {
        agencyId,
        status: { in: ["CONFIRMED", "ONGOING"] },
        balanceAmount: { gt: 0 },
      },
      include: {
        customer: true,
        quotation: {
          include: {
            paymentMilestones: {
              where: {
                dueDate: { lte: reminderThreshold },
              },
            },
          },
        },
      },
    });

    let sentCount = 0;

    for (const booking of bookings) {
      if (!booking.customer) continue;

      const milestones = booking.quotation?.paymentMilestones || [];
      const milestone = milestones[0]; // Nearest due milestone
      const amountDue = milestone ? Number(milestone.amount) : Number(booking.balanceAmount);
      const dueDate = milestone?.dueDate ? milestone.dueDate.toLocaleDateString("en-IN") : "Upcoming";

      const metadata = {
        bookingNumber: booking.bookingNumber,
        amountDue: amountDue.toLocaleString("en-IN"),
        dueDate,
      };

      const idempotencyKey = `auto-pay-rem-${booking.id}-${dueDate}-${now.toISOString().split("T")[0]}`;

      if (booking.customer.email && settings.emailEnabled) {
        await this.sendCommunication(agencyId, {
          agencyId,
          customerId: booking.customerId,
          bookingId: booking.id,
          tripId: booking.tripId,
          type: CustomerNotificationType.PAYMENT_DUE,
          channel: NotificationChannel.EMAIL,
          title: `Payment Milestone Reminder: #${booking.bookingNumber}`,
          message: `Friendly reminder: Payment milestone of ₹${amountDue.toLocaleString("en-IN")} is due on ${dueDate}.`,
          recipient: { name: booking.customer.name, email: booking.customer.email },
          metadata,
          idempotencyKey: `${idempotencyKey}-email`,
        });
        sentCount++;
      }

      if (booking.customer.phone && settings.whatsappEnabled) {
        await this.sendCommunication(agencyId, {
          agencyId,
          customerId: booking.customerId,
          bookingId: booking.id,
          tripId: booking.tripId,
          type: CustomerNotificationType.PAYMENT_DUE,
          channel: NotificationChannel.WHATSAPP,
          title: `Payment Reminder: #${booking.bookingNumber}`,
          message: `Payment milestone of ₹${amountDue.toLocaleString("en-IN")} is due on ${dueDate}.`,
          recipient: { name: booking.customer.name, phone: booking.customer.phone },
          metadata,
          idempotencyKey: `${idempotencyKey}-wa`,
        });
        sentCount++;
      }
    }

    return { sentCount };
  }

  /**
   * 7. Scheduled Automation: Upcoming Travel Reminders
   * Scans trips departing within configured days
   */
  async runTravelReminders(agencyId: string): Promise<{ sentCount: number }> {
    const settings = await this.getAgencySettings(agencyId);
    if (!settings.autoTravelReminders) {
      return { sentCount: 0 };
    }

    const now = new Date();
    const reminderThreshold = new Date(now.getTime() + (settings.travelReminderDays || 3) * 24 * 60 * 60 * 1000);

    const upcomingTrips = await prisma.trip.findMany({
      where: {
        agencyId,
        status: { in: ["BOOKED", "PLANNING"] },
        startDate: {
          gte: now,
          lte: reminderThreshold,
        },
      },
      include: {
        customer: true,
        bookings: true,
      },
    });

    let sentCount = 0;

    for (const trip of upcomingTrips) {
      if (!trip.customer) continue;

      const departureFormatted = trip.startDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const metadata = {
        destination: trip.title,
        travelStartDate: departureFormatted,
        bookingNumber: trip.bookings[0]?.bookingNumber || "N/A",
      };

      const idempotencyKey = `auto-travel-rem-${trip.id}-${departureFormatted}`;

      if (trip.customer.email && settings.emailEnabled) {
        await this.sendCommunication(agencyId, {
          agencyId,
          customerId: trip.customerId,
          tripId: trip.id,
          bookingId: trip.bookings[0]?.id || null,
          type: CustomerNotificationType.TRIP_UPCOMING,
          channel: NotificationChannel.EMAIL,
          title: `Upcoming Departure: ${trip.title}`,
          message: `Your trip to ${trip.title} begins on ${departureFormatted}. Please check your vouchers and documents.`,
          recipient: { name: trip.customer.name, email: trip.customer.email },
          linkUrl: `/customer/trips/${trip.id}`,
          metadata,
          idempotencyKey: `${idempotencyKey}-email`,
        });
        sentCount++;
      }

      if (trip.customer.phone && settings.whatsappEnabled) {
        await this.sendCommunication(agencyId, {
          agencyId,
          customerId: trip.customerId,
          tripId: trip.id,
          bookingId: trip.bookings[0]?.id || null,
          type: CustomerNotificationType.TRIP_UPCOMING,
          channel: NotificationChannel.WHATSAPP,
          title: `Trip Departure Reminder`,
          message: `Your trip to ${trip.title} commences on ${departureFormatted}!`,
          recipient: { name: trip.customer.name, phone: trip.customer.phone },
          metadata,
          idempotencyKey: `${idempotencyKey}-wa`,
        });
        sentCount++;
      }
    }

    return { sentCount };
  }

  /**
   * 8. Scheduled Automation: Post-Tour Feedback Requests
   */
  async runFeedbackRequests(agencyId: string): Promise<{ sentCount: number }> {
    const settings = await this.getAgencySettings(agencyId);
    if (!settings.autoFeedbackRequests) {
      return { sentCount: 0 };
    }

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const completedTrips = await prisma.trip.findMany({
      where: {
        agencyId,
        status: "COMPLETED",
        endDate: { gte: twoDaysAgo },
      },
      include: {
        customer: true,
        bookings: true,
        feedbacks: true,
      },
    });

    let sentCount = 0;

    for (const trip of completedTrips) {
      if (!trip.customer || trip.feedbacks.length > 0) continue; // Skip if already reviewed

      const feedbackUrl = `/customer/trips/${trip.id}/feedback`;
      const metadata = {
        destination: trip.title,
        feedbackUrl,
      };

      const idempotencyKey = `auto-feedback-req-${trip.id}`;

      if (trip.customer.email && settings.emailEnabled) {
        await this.sendCommunication(agencyId, {
          agencyId,
          customerId: trip.customerId,
          tripId: trip.id,
          bookingId: trip.bookings[0]?.id || null,
          type: CustomerNotificationType.FEEDBACK_REQUEST,
          channel: NotificationChannel.EMAIL,
          title: `Welcome Home! How was your journey to ${trip.title}?`,
          message: `We hope you had a memorable tour. Please take a moment to share your rating and review.`,
          linkUrl: feedbackUrl,
          recipient: { name: trip.customer.name, email: trip.customer.email },
          metadata,
          idempotencyKey: `${idempotencyKey}-email`,
        });
        sentCount++;
      }
    }

    return { sentCount };
  }

  /**
   * Helper to create skipped notification when customer/agency disabled channel
   */
  private async createSkippedRecord(
    agencyId: string,
    customerId: string,
    payload: CommunicationEventPayload,
    reason: string
  ): Promise<CustomerNotification> {
    return prisma.customerNotification.create({
      data: {
        agencyId,
        customerId,
        tripId: payload.tripId || null,
        bookingId: payload.bookingId || null,
        quotationId: payload.quotationId || null,
        enquiryId: payload.enquiryId || null,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        channel: payload.channel,
        status: NotificationDeliveryStatus.CANCELLED,
        failureReason: reason,
        idempotencyKey: payload.idempotencyKey || null,
        linkUrl: payload.linkUrl || null,
        sentAt: new Date(),
        failedAt: new Date(),
        metadata: payload.metadata ? (payload.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }

  /**
   * Maps internal database record to safe item view
   */
  private mapToItemView(item: any): CommunicationLogItemView {
    return {
      id: item.id,
      agencyId: item.agencyId,
      customerId: item.customerId,
      customerName: item.customer?.name,
      customerPhone: item.customer?.phone,
      customerEmail: item.customer?.email,
      tripId: item.tripId,
      tripTitle: item.trip?.title,
      bookingId: item.bookingId,
      bookingNumber: item.booking?.bookingNumber,
      quotationId: item.quotationId,
      quotationNumber: item.quotation?.quotationNumber,
      enquiryId: item.enquiryId,
      enquiryNumber: item.enquiry?.enquiryNumber,
      type: item.type,
      channel: item.channel,
      title: item.title,
      message: item.message,
      recipient: item.recipient,
      subject: item.subject,
      status: item.status,
      providerMessageId: item.providerMessageId,
      failureReason: item.failureReason,
      retryCount: item.retryCount || 0,
      idempotencyKey: item.idempotencyKey,
      linkUrl: item.linkUrl,
      sentAt: item.sentAt ? item.sentAt.toISOString() : item.createdAt.toISOString(),
      deliveredAt: item.deliveredAt ? item.deliveredAt.toISOString() : null,
      failedAt: item.failedAt ? item.failedAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
    };
  }
}

export const communicationService = new CommunicationService();
