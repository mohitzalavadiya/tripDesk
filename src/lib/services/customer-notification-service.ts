import { prisma } from "@/lib/prisma";
import {
  CustomerNotificationType,
  NotificationChannel,
  NotificationDeliveryStatus,
  Prisma,
} from "@prisma/client";
import { notificationDispatcher } from "@/lib/notifications/dispatcher";

export interface CreateCustomerNotificationInput {
  customerId: string;
  tripId?: string | null;
  bookingId?: string | null;
  type: CustomerNotificationType;
  title: string;
  message: string;
  channel?: NotificationChannel;
  idempotencyKey?: string | null;
  linkUrl?: string | null;
  metadata?: Record<string, any> | null;
}

export interface ListNotificationsQuery {
  unreadOnly?: boolean;
  type?: CustomerNotificationType;
  page?: number;
  limit?: number;
}

export interface CustomerNotificationItemView {
  id: string;
  tripId: string | null;
  bookingId: string | null;
  type: CustomerNotificationType;
  title: string;
  message: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  linkUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  sentAt: string;
  createdAt: string;
}

export interface CustomerNotificationPreferencesView {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  tripUpdates: boolean;
  paymentAlerts: boolean;
  documentAlerts: boolean;
  serviceUpdates: boolean;
  marketingMessages: boolean;
}

export class CustomerNotificationService {
  /**
   * Creates a customer notification with deterministic idempotency check
   */
  async createNotification(
    agencyId: string,
    input: CreateCustomerNotificationInput
  ): Promise<CustomerNotificationItemView | null> {
    const {
      customerId,
      tripId,
      bookingId,
      type,
      title,
      message,
      channel = NotificationChannel.IN_APP,
      idempotencyKey,
      linkUrl,
      metadata,
    } = input;

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existing = await prisma.customerNotification.findFirst({
        where: { agencyId, idempotencyKey },
      });
      if (existing) {
        return this.mapToItemView(existing);
      }
    }

    // 2. Fetch Customer & Preferences
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, agencyId },
      include: { notificationPreference: true },
    });

    if (!customer) {
      return null;
    }

    const prefs = customer.notificationPreference;

    // Check optional marketing / channel suppression if non-transactional
    if (prefs && channel === NotificationChannel.EMAIL && !prefs.emailEnabled) {
      // In-app fallback
    }
    if (prefs && channel === NotificationChannel.SMS && !prefs.smsEnabled) {
      // In-app fallback
    }
    if (prefs && channel === NotificationChannel.WHATSAPP && !prefs.whatsappEnabled) {
      // In-app fallback
    }

    // 3. Create Notification in Database
    const notification = await prisma.customerNotification.create({
      data: {
        agencyId,
        customerId,
        tripId: tripId || null,
        bookingId: bookingId || null,
        type,
        title,
        message,
        channel,
        status: NotificationDeliveryStatus.SENT,
        idempotencyKey: idempotencyKey || null,
        linkUrl: linkUrl || null,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });

    // 4. Non-blocking external dispatch
    try {
      notificationDispatcher
        .dispatch({
          agencyId,
          customerId,
          tripId,
          bookingId,
          type,
          title,
          message,
          channel,
          idempotencyKey,
          linkUrl,
          metadata,
          recipient: {
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
          },
        })
        .catch((err) => {
          console.warn("[Notification Dispatch Warning]", err);
        });
    } catch (dispatchErr) {
      console.warn("[Notification Non-blocking Error]", dispatchErr);
    }

    return this.mapToItemView(notification);
  }

  /**
   * List notifications for authenticated customer
   */
  async listCustomerNotifications(
    agencyId: string,
    customerId: string,
    query: ListNotificationsQuery = {}
  ): Promise<{
    data: CustomerNotificationItemView[];
    meta: { total: number; unreadCount: number; page: number; limit: number };
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerNotificationWhereInput = {
      agencyId,
      customerId,
      ...(query.unreadOnly ? { readAt: null } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    const [items, total, unreadCount] = await Promise.all([
      prisma.customerNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.customerNotification.count({ where }),
      prisma.customerNotification.count({
        where: { agencyId, customerId, readAt: null },
      }),
    ]);

    return {
      data: items.map((item) => this.mapToItemView(item)),
      meta: {
        total,
        unreadCount,
        page,
        limit,
      },
    };
  }

  /**
   * Get unread count for customer
   */
  async getUnreadCount(agencyId: string, customerId: string): Promise<number> {
    return prisma.customerNotification.count({
      where: { agencyId, customerId, readAt: null },
    });
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(
    agencyId: string,
    customerId: string,
    notificationId: string
  ): Promise<CustomerNotificationItemView | null> {
    const existing = await prisma.customerNotification.findFirst({
      where: { id: notificationId, customerId, agencyId },
    });

    if (!existing) {
      return null;
    }

    const updated = await prisma.customerNotification.update({
      where: { id: notificationId },
      data: {
        readAt: new Date(),
        status: NotificationDeliveryStatus.READ,
      },
    });

    return this.mapToItemView(updated);
  }

  /**
   * Mark all notifications as read for customer
   */
  async markAllAsRead(agencyId: string, customerId: string): Promise<{ count: number }> {
    const res = await prisma.customerNotification.updateMany({
      where: { agencyId, customerId, readAt: null },
      data: {
        readAt: new Date(),
        status: NotificationDeliveryStatus.READ,
      },
    });

    return { count: res.count };
  }

  /**
   * Get customer notification preferences
   */
  async getPreferences(
    agencyId: string,
    customerId: string
  ): Promise<CustomerNotificationPreferencesView> {
    let prefs = await prisma.customerNotificationPreference.findFirst({
      where: { agencyId, customerId },
    });

    if (!prefs) {
      prefs = await prisma.customerNotificationPreference.create({
        data: {
          agencyId,
          customerId,
          inAppEnabled: true,
          emailEnabled: true,
          smsEnabled: true,
          whatsappEnabled: true,
          tripUpdates: true,
          paymentAlerts: true,
          documentAlerts: true,
          serviceUpdates: true,
          marketingMessages: false,
        },
      });
    }

    return {
      inAppEnabled: prefs.inAppEnabled,
      emailEnabled: prefs.emailEnabled,
      smsEnabled: prefs.smsEnabled,
      whatsappEnabled: prefs.whatsappEnabled,
      tripUpdates: prefs.tripUpdates,
      paymentAlerts: prefs.paymentAlerts,
      documentAlerts: prefs.documentAlerts,
      serviceUpdates: prefs.serviceUpdates,
      marketingMessages: prefs.marketingMessages,
    };
  }

  /**
   * Update customer notification preferences
   */
  async updatePreferences(
    agencyId: string,
    customerId: string,
    data: Partial<CustomerNotificationPreferencesView>
  ): Promise<CustomerNotificationPreferencesView> {
    const updated = await prisma.customerNotificationPreference.upsert({
      where: { customerId },
      create: {
        agencyId,
        customerId,
        inAppEnabled: data.inAppEnabled ?? true,
        emailEnabled: data.emailEnabled ?? true,
        smsEnabled: data.smsEnabled ?? true,
        whatsappEnabled: data.whatsappEnabled ?? true,
        tripUpdates: data.tripUpdates ?? true,
        paymentAlerts: data.paymentAlerts ?? true,
        documentAlerts: data.documentAlerts ?? true,
        serviceUpdates: data.serviceUpdates ?? true,
        marketingMessages: data.marketingMessages ?? false,
      },
      update: {
        ...(data.inAppEnabled !== undefined ? { inAppEnabled: data.inAppEnabled } : {}),
        ...(data.emailEnabled !== undefined ? { emailEnabled: data.emailEnabled } : {}),
        ...(data.smsEnabled !== undefined ? { smsEnabled: data.smsEnabled } : {}),
        ...(data.whatsappEnabled !== undefined ? { whatsappEnabled: data.whatsappEnabled } : {}),
        ...(data.tripUpdates !== undefined ? { tripUpdates: data.tripUpdates } : {}),
        ...(data.paymentAlerts !== undefined ? { paymentAlerts: data.paymentAlerts } : {}),
        ...(data.documentAlerts !== undefined ? { documentAlerts: data.documentAlerts } : {}),
        ...(data.serviceUpdates !== undefined ? { serviceUpdates: data.serviceUpdates } : {}),
        ...(data.marketingMessages !== undefined ? { marketingMessages: data.marketingMessages } : {}),
      },
    });

    return {
      inAppEnabled: updated.inAppEnabled,
      emailEnabled: updated.emailEnabled,
      smsEnabled: updated.smsEnabled,
      whatsappEnabled: updated.whatsappEnabled,
      tripUpdates: updated.tripUpdates,
      paymentAlerts: updated.paymentAlerts,
      documentAlerts: updated.documentAlerts,
      serviceUpdates: updated.serviceUpdates,
      marketingMessages: updated.marketingMessages,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT-DRIVEN CUSTOMER NOTIFICATION DISPATCHERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Hotel Confirmation Notification
   */
  async notifyHotelConfirmation(agencyId: string, confirmationId: string) {
    const conf = await prisma.hotelConfirmation.findFirst({
      where: { id: confirmationId, agencyId },
      include: {
        tripHotel: {
          include: {
            trip: { include: { customer: true, bookings: true } },
            hotel: true,
          },
        },
      },
    });

    if (!conf || !conf.tripHotel || !conf.tripHotel.trip) return null;

    const trip = conf.tripHotel.trip;
    const hotelName = conf.tripHotel.hotel?.name || "Hotel";
    const booking = trip.bookings[0] || null;

    return this.createNotification(agencyId, {
      customerId: trip.customerId,
      tripId: trip.id,
      bookingId: booking?.id || null,
      type: CustomerNotificationType.HOTEL_CONFIRMED,
      title: `Hotel Confirmed: ${hotelName}`,
      message: `Your stay at ${hotelName} has been confirmed (Ref: ${conf.confirmationNumber || "Confirmed"}).`,
      linkUrl: `/customer/trips/${trip.id}`,
      idempotencyKey: `hotel-conf-${conf.id}-${conf.status}`,
    });
  }

  /**
   * Vehicle Dispatch & Chauffeur Assignment Notification
   */
  async notifyVehicleDispatch(agencyId: string, dispatchId: string) {
    const dispatch = await prisma.vehicleDispatch.findFirst({
      where: { id: dispatchId, agencyId },
      include: {
        tripVehicle: {
          include: {
            trip: { include: { customer: true, bookings: true } },
            vehicle: true,
          },
        },
      },
    });

    if (!dispatch || !dispatch.tripVehicle || !dispatch.tripVehicle.trip) return null;

    const trip = dispatch.tripVehicle.trip;
    const vehicleName = dispatch.tripVehicle.vehicleName || "Vehicle";
    const driverName = dispatch.driverName || "Chauffeur";
    const booking = trip.bookings[0] || null;

    return this.createNotification(agencyId, {
      customerId: trip.customerId,
      tripId: trip.id,
      bookingId: booking?.id || null,
      type: CustomerNotificationType.VEHICLE_ASSIGNED,
      title: `Chauffeur Assigned for ${vehicleName}`,
      message: `Your driver ${driverName} (${dispatch.driverPhone || "Contact on arrival"}) has been assigned for your transfer.`,
      linkUrl: `/customer/trips/${trip.id}`,
      idempotencyKey: `vehicle-dispatch-${dispatch.id}-${dispatch.status}-${dispatch.driverName || ""}`,
    });
  }

  /**
   * Activity Excursion Confirmation Notification
   */
  async notifyActivityConfirmation(agencyId: string, confirmationId: string) {
    const conf = await prisma.activityConfirmation.findFirst({
      where: { id: confirmationId, agencyId },
      include: {
        tripActivity: {
          include: {
            trip: { include: { customer: true, bookings: true } },
            activity: true,
          },
        },
      },
    });

    if (!conf || !conf.tripActivity || !conf.tripActivity.trip) return null;

    const trip = conf.tripActivity.trip;
    const activityName = conf.tripActivity.name || "Activity";
    const booking = trip.bookings[0] || null;

    return this.createNotification(agencyId, {
      customerId: trip.customerId,
      tripId: trip.id,
      bookingId: booking?.id || null,
      type: CustomerNotificationType.ACTIVITY_CONFIRMED,
      title: `Activity Confirmed: ${activityName}`,
      message: `Your pass for ${activityName} is confirmed (Pass #: ${conf.ticketNumber || conf.confirmationNumber || "Confirmed"}).`,
      linkUrl: `/customer/trips/${trip.id}`,
      idempotencyKey: `activity-conf-${conf.id}-${conf.status}`,
    });
  }

  /**
   * Customer Payment Received Notification
   */
  async notifyPaymentReceived(agencyId: string, paymentId: string) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, agencyId },
      include: {
        customer: true,
        booking: {
          include: { trip: true },
        },
      },
    });

    if (!payment || !payment.customerId) return null;

    const formattedAmount = Number(payment.amount).toLocaleString("en-IN");
    const bookingNumber = payment.booking?.bookingNumber || "Booking";

    return this.createNotification(agencyId, {
      customerId: payment.customerId,
      tripId: payment.tripId || payment.booking?.tripId || null,
      bookingId: payment.bookingId,
      type: CustomerNotificationType.PAYMENT_RECEIVED,
      title: `Payment Received: ₹${formattedAmount}`,
      message: `We have received your payment of ₹${formattedAmount} for ${bookingNumber} (Receipt: ${payment.receiptNumber || payment.paymentNumber}).`,
      linkUrl: payment.tripId ? `/customer/trips/${payment.tripId}/payments` : "/customer",
      idempotencyKey: `payment-received-${payment.id}`,
    });
  }

  /**
   * Payment Refund Notification
   */
  async notifyPaymentRefund(agencyId: string, paymentId: string, refundAmount: number) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, agencyId },
      include: {
        customer: true,
        booking: {
          include: { trip: true },
        },
      },
    });

    if (!payment || !payment.customerId) return null;

    const formattedAmount = Number(refundAmount).toLocaleString("en-IN");

    return this.createNotification(agencyId, {
      customerId: payment.customerId,
      tripId: payment.tripId || payment.booking?.tripId || null,
      bookingId: payment.bookingId,
      type: CustomerNotificationType.PAYMENT_REFUNDED,
      title: `Refund Processed: ₹${formattedAmount}`,
      message: `A refund of ₹${formattedAmount} has been processed for your payment ${payment.paymentNumber}.`,
      linkUrl: payment.tripId ? `/customer/trips/${payment.tripId}/payments` : "/customer",
      idempotencyKey: `payment-refund-${payment.id}-${refundAmount}`,
    });
  }

  /**
   * Travel Document Ready Notification
   */
  async notifyDocumentReady(
    agencyId: string,
    tripId: string,
    docType: string,
    docTitle: string
  ) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, agencyId },
      include: { customer: true, bookings: true },
    });

    if (!trip) return null;

    const booking = trip.bookings[0] || null;

    return this.createNotification(agencyId, {
      customerId: trip.customerId,
      tripId: trip.id,
      bookingId: booking?.id || null,
      type: CustomerNotificationType.DOCUMENT_READY,
      title: `Document Ready: ${docTitle}`,
      message: `Your ${docTitle} is now ready to download in your traveler document center.`,
      linkUrl: `/customer/trips/${trip.id}/documents`,
      idempotencyKey: `doc-ready-${trip.id}-${docType}`,
    });
  }

  /**
   * Trip Lifecycle Notification
   */
  async notifyTripStatusChange(
    agencyId: string,
    tripId: string,
    status: string
  ) {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, agencyId },
      include: { customer: true, bookings: true },
    });

    if (!trip) return null;

    let type: CustomerNotificationType = CustomerNotificationType.TRIP_UPDATED;
    let title = `Trip Update: ${trip.title}`;
    let message = `Your trip status has been updated to ${status}.`;

    if (status === "BOOKED" || status === "CONFIRMED") {
      type = CustomerNotificationType.TRIP_CONFIRMED;
      title = `Trip Confirmed: ${trip.title}`;
      message = `Your booking for ${trip.title} is now confirmed!`;
    } else if (status === "ONGOING" || status === "DISPATCHED") {
      type = CustomerNotificationType.TRIP_STARTED;
      title = `Journey Commenced!`;
      message = `Welcome to your tour! Your travel itinerary is active.`;
    } else if (status === "COMPLETED") {
      type = CustomerNotificationType.FEEDBACK_REQUEST;
      title = `Welcome Home! How was your journey?`;
      message = `We hope you had a wonderful trip! Please take a moment to share your rating and feedback.`;
    } else if (status === "CANCELLED") {
      type = CustomerNotificationType.TRIP_CANCELLED;
      title = `Trip Cancelled`;
      message = `Your booking for ${trip.title} has been cancelled. Please contact your coordinator for details.`;
    }

    return this.createNotification(agencyId, {
      customerId: trip.customerId,
      tripId: trip.id,
      bookingId: trip.bookings[0]?.id || null,
      type,
      title,
      message,
      linkUrl: status === "COMPLETED" ? `/customer/trips/${trip.id}/feedback` : `/customer/trips/${trip.id}`,
      idempotencyKey: `trip-status-${trip.id}-${status}`,
    });
  }

  private mapToItemView(item: any): CustomerNotificationItemView {
    return {
      id: item.id,
      tripId: item.tripId,
      bookingId: item.bookingId,
      type: item.type,
      title: item.title,
      message: item.message,
      channel: item.channel,
      status: item.status,
      linkUrl: item.linkUrl,
      isRead: !!item.readAt || item.status === NotificationDeliveryStatus.READ,
      readAt: item.readAt ? item.readAt.toISOString() : null,
      sentAt: item.sentAt ? item.sentAt.toISOString() : item.createdAt.toISOString(),
      createdAt: item.createdAt.toISOString(),
    };
  }
}

export const customerNotificationService = new CustomerNotificationService();
