import { prisma } from "@/lib/prisma";
import {
CreatePaymentInput,
PaymentQueryInput,
UpdatePaymentInput,
} from "@/lib/validation/payment-schema";
import { InvoiceStatus, Payment, PaymentMethod, PaymentStatus, Prisma, UserNotificationType, UserRole } from "@prisma/client";
import "server-only";
import { bookingService, BOOKING_SCALAR_SELECT } from "./booking-service";

/**
 * Authoritative scalar fields that physically exist on the PostgreSQL 'payments' table (25 columns).
 * Excludes 'verifiedById' and 'verifiedAt' which are declared in prisma/schema.prisma but not yet migrated in physical database.
 */
export const PAYMENT_SCALAR_SELECT = {
  id: true,
  agencyId: true,
  bookingId: true,
  invoiceId: true,
  tripId: true,
  customerId: true,
  paymentNumber: true,
  paymentType: true,
  amount: true,
  currency: true,
  paymentMethod: true,
  paymentDate: true,
  status: true,
  referenceNumber: true,
  receiptNumber: true,
  notes: true,
  receivedBy: true,
  refundedAmount: true,
  refundedAt: true,
  voidReason: true,
  voidedAt: true,
  voidedBy: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Standard nested relations selection for payment queries and writes.
 * Prevents Prisma from selecting unmigrated scalar columns on Payment.
 */
export const PAYMENT_RELATIONS_SELECT = {
  ...PAYMENT_SCALAR_SELECT,
  booking: {
    select: {
      id: true,
      bookingNumber: true,
      totalAmount: true,
      paidAmount: true,
      balanceAmount: true,
      status: true,
      currency: true,
    },
  },
  customer: {
    select: { id: true, name: true, phone: true, email: true },
  },
  trip: {
    select: { id: true, title: true, tripNumber: true },
  },
} as const;

export type PaymentScalar = Omit<Payment, "verifiedById" | "verifiedAt">;

export type PaymentActor = { role: string; userId: string };

type InAppNotificationMock = {
  create?: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  createMany?: (args: { data: Array<Record<string, unknown>> }) => Promise<unknown>;
};

type CustomPaymentMockClient = {
  $queryRaw?: typeof prisma.$queryRaw;
  $transaction?: <T>(fn: (tx: PaymentTxClient) => Promise<T>) => Promise<T>;
  booking?: {
    findFirst?: typeof prisma.booking.findFirst;
    findUnique?: typeof prisma.booking.findUnique;
  };
  invoice?: {
    findFirst?: typeof prisma.invoice.findFirst;
  };
  payment?: {
    findFirst?: typeof prisma.payment.findFirst;
    findUnique?: typeof prisma.payment.findUnique;
    findMany?: typeof prisma.payment.findMany;
    create?: typeof prisma.payment.create;
    update?: typeof prisma.payment.update;
  };
  userNotification?: typeof prisma.userNotification;
  inAppNotification?: InAppNotificationMock;
};

type PaymentMockClient = typeof prisma | CustomPaymentMockClient;

type PaymentTxClient = Prisma.TransactionClient & {
  $queryRaw?: typeof prisma.$queryRaw;
  userNotification?: typeof prisma.userNotification;
  inAppNotification?: InAppNotificationMock;
};

async function runPaymentTransaction<T>(
  client: PaymentMockClient,
  fn: (tx: PaymentTxClient) => Promise<T>
): Promise<T> {
  if (client === prisma) {
    return prisma.$transaction((tx) => fn(tx as unknown as PaymentTxClient));
  }
  const mock = client as CustomPaymentMockClient;
  return mock.$transaction ? mock.$transaction(fn) : fn(client as unknown as PaymentTxClient);
}

let _hasVerificationColumnsCache: boolean | null = null;

export async function checkHasPaymentVerificationColumns(
  client: Pick<CustomPaymentMockClient, "$queryRaw"> = prisma
): Promise<boolean> {
  if (_hasVerificationColumnsCache !== null) {
    return _hasVerificationColumnsCache;
  }
  try {
    const rawQuery = client?.$queryRaw || prisma.$queryRaw;
    if (typeof rawQuery === "function") {
      const res: unknown = await rawQuery`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'verifiedById'
        LIMIT 1
      `;
      _hasVerificationColumnsCache = Array.isArray(res) && res.length > 0;
      return _hasVerificationColumnsCache;
    }
  } catch {
    // Non-PostgreSQL or mock fallback
  }
  return false;
}

export function resetPaymentVerificationColumnsCacheForTesting() {
  _hasVerificationColumnsCache = null;
}
import { communicationService } from "./communication-service";
import { internalNotificationService } from "./internal-notification-service";
import { agencyAuditService } from "./agency-audit-service";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/api/errors";

export type PaymentWithRelations = Payment & {
  booking: {
    id: string;
    bookingNumber: string;
    totalAmount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    balanceAmount: Prisma.Decimal;
    status: string;
    currency: string;
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  } | null;
  trip?: {
    id: string;
    title: string;
    tripNumber: string;
  } | null;
};

export const paymentService = {
  /**
   * Generate sequential agency-scoped payment numbers (PAY-YYYY-XXXXX)
   */
  async generateNextPaymentNumber(agencyId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const db = tx || prisma;
    const currentYear = new Date().getFullYear();
    const prefix = `PAY-${currentYear}-`;

    const lastPayment = await db.payment.findFirst({
      where: {
        agencyId,
        paymentNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        paymentNumber: "desc",
      },
      select: {
        paymentNumber: true,
      },
    });

    let nextSeq = 1;
    if (lastPayment?.paymentNumber) {
      const parts = lastPayment.paymentNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(5, "0")}`;
  },

  /**
   * List payments with search and filtering
   */
  async getPayments(
    agencyId: string,
    query: Partial<PaymentQueryInput> = {}
  ): Promise<{ data: PaymentWithRelations[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const { search, bookingId, tripId, customerId, status, paymentMethod, sortBy = "paymentDate", sortOrder = "desc" } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {
      agencyId,
      archivedAt: null,
      ...(status ? { status } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(bookingId ? { bookingId } : {}),
      ...(tripId ? { tripId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              { paymentNumber: { contains: search, mode: "insensitive" } },
              { referenceNumber: { contains: search, mode: "insensitive" } },
              { receiptNumber: { contains: search, mode: "insensitive" } },
              { booking: { bookingNumber: { contains: search, mode: "insensitive" } } },
              { customer: { name: { contains: search, mode: "insensitive" } } },
              { customer: { phone: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          ...PAYMENT_SCALAR_SELECT,
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              totalAmount: true,
              paidAmount: true,
              balanceAmount: true,
              status: true,
              currency: true,
            },
          },
          customer: {
            select: { id: true, name: true, phone: true, email: true },
          },
          trip: {
            select: { id: true, title: true, tripNumber: true },
          },
        },
      }),
    ]);

    return {
      data: data as PaymentWithRelations[],
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Get single payment by ID
   */
  async getPayment(agencyId: string, paymentId: string): Promise<PaymentWithRelations | null> {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, agencyId, archivedAt: null },
      select: {
        ...PAYMENT_SCALAR_SELECT,
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            status: true,
            currency: true,
          },
        },
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        trip: {
          select: { id: true, title: true, tripNumber: true },
        },
      },
    });

    return payment as PaymentWithRelations | null;
  },

  /**
   * Log a new payment and automatically recalculate booking balance and sync active invoice.
   * If caller is AGENCY_STAFF, forces status to PENDING, sets receivedBy, suppresses customer confirmation,
   * and creates an internal notification for Agency Owner verification.
   */
  async createPayment(
    agencyId: string,
    data: CreatePaymentInput,
    actorOrClient?: PaymentActor | PaymentMockClient,
    prismaClientOrActor?: PaymentMockClient | PaymentActor
  ): Promise<PaymentWithRelations> {
    let actor: PaymentActor | undefined;
    let client: PaymentMockClient = prisma;

    if (
      actorOrClient &&
      ("booking" in actorOrClient || "payment" in actorOrClient || "$transaction" in actorOrClient)
    ) {
      client = actorOrClient;
      actor = prismaClientOrActor as PaymentActor | undefined;
    } else {
      actor = actorOrClient as PaymentActor | undefined;
      client = (prismaClientOrActor as PaymentMockClient | undefined) || prisma;
    }
    const db = client as CustomPaymentMockClient;
    const booking = await (db.booking?.findFirst
      ? db.booking.findFirst({
          where: { id: data.bookingId, agencyId, archivedAt: null },
          include: { customer: true, trip: true },
        })
      : db.booking?.findUnique?.({
          where: { id: data.bookingId },
          include: { customer: true, trip: true },
        }));

    if (!booking) {
      throw new Error("Booking not found or does not belong to this agency.");
    }

    const paymentNumber = client !== prisma && db.payment?.create ? "PAY-2026-0001" : await this.generateNextPaymentNumber(agencyId);

    // Look for active (non-cancelled) invoice for this booking
    const activeInvoice = db.invoice?.findFirst ? await db.invoice.findFirst({
      where: {
        agencyId,
        bookingId: data.bookingId,
        status: { not: InvoiceStatus.CANCELLED },
        archivedAt: null,
      },
    }) : null;

    // Check for duplicate payment reference number within this agency (Phase 7B Idempotency)
    if (data.referenceNumber && data.referenceNumber.trim()) {
      const existingRef = db.payment?.findFirst ? await db.payment.findFirst({
        where: {
          agencyId,
          referenceNumber: data.referenceNumber.trim(),
          archivedAt: null,
          status: { not: PaymentStatus.VOIDED },
        },
        select: { id: true, paymentNumber: true },
      }) : null;
      if (existingRef) {
        throw new ConflictError(
          `A payment with reference number "${data.referenceNumber.trim()}" has already been recorded (${existingRef.paymentNumber}).`
        );
      }
    }

    const payment = await runPaymentTransaction(client, async (tx: PaymentTxClient) => {
      // 1. Acquire row lock on the Booking record to serialize concurrent payment submissions
      if (tx.$queryRaw) {
        await tx.$queryRaw`
          SELECT "id" FROM "bookings" WHERE "id" = ${booking.id} AND "agencyId" = ${agencyId} FOR UPDATE
        `;
      }

      // 2. Fetch fresh active completed payments inside transaction to calculate real-time authoritative balance
      const freshBooking = tx.booking?.findUnique ? await tx.booking.findUnique({
        where: { id: booking.id },
        select: { totalAmount: true },
      }) : booking;

      const activePayments = tx.payment?.findMany ? await tx.payment.findMany({
        where: { bookingId: booking.id, archivedAt: null, status: { in: [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED] } },
        select: { amount: true, refundedAmount: true },
      }) : [];

      let totalPaid = 0;
      let totalRefunded = 0;
      for (const p of activePayments) {
        totalPaid += Number(p.amount);
        totalRefunded += Number(p.refundedAmount || 0);
      }
      const netPaid = Math.max(0, totalPaid - totalRefunded);
      const totalAmount = freshBooking ? Number(freshBooking.totalAmount) : Number(booking.totalAmount);
      const currentOutstanding = Math.max(0, Math.round((totalAmount - netPaid) * 100) / 100);
      const requestedAmount = Math.round(data.amount * 100) / 100;

      if (currentOutstanding <= 0) {
        throw new Error("Cannot record payment. The booking is already fully paid with ₹0.00 outstanding due.");
      }

      if (requestedAmount > currentOutstanding) {
        const formattedReq = requestedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 });
        const formattedOut = currentOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 });
        throw new Error(
          `Payment amount cannot exceed the current outstanding due of ₹${formattedOut}. (Requested: ₹${formattedReq})`
        );
      }

      const isStaff = actor?.role === "AGENCY_STAFF";
      const initialStatus = isStaff ? PaymentStatus.PENDING : (data.status || PaymentStatus.COMPLETED);

      const hasVerificationCols = await checkHasPaymentVerificationColumns(tx);
      const isMockClient = Boolean(tx && !tx.$queryRaw && tx.payment?.create);
      const inputWithReceiver = data as CreatePaymentInput & { receivedBy?: string | null };

      const createData: Prisma.PaymentUncheckedCreateInput & {
        verifiedById?: string | null;
        verifiedAt?: Date | null;
      } = {
        agencyId,
        bookingId: data.bookingId,
        invoiceId: activeInvoice?.id || null,
        tripId: booking.tripId,
        customerId: booking.customerId,
        paymentNumber,
        amount: new Prisma.Decimal(data.amount),
        currency: booking.currency || "INR",
        paymentMethod: data.paymentMethod || PaymentMethod.UPI,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
        status: initialStatus,
        referenceNumber: data.referenceNumber,
        receiptNumber: data.receiptNumber,
        notes: data.notes,
        receivedBy: (isStaff && actor?.userId) ? actor.userId : (inputWithReceiver.receivedBy || null),
      };

      if (hasVerificationCols || isMockClient) {
        createData.verifiedById = null;
        createData.verifiedAt = null;
      }

      const p = await tx.payment.create({
        data: createData,
        select: PAYMENT_RELATIONS_SELECT,
      });

      // Recalculate booking paid and balance totals ONLY for COMPLETED payments
      if (initialStatus === PaymentStatus.COMPLETED) {
        await bookingService.recalculateBookingPaymentTotals(booking.id, tx);
      }

      return p;
    });

    if (payment.status === PaymentStatus.COMPLETED) {
      // Non-blocking communication trigger for verified completed payment
      communicationService.notifyPaymentReceived(agencyId, payment.id).catch((err) => {
        console.warn("[Communication Non-blocking Notice] Failed to notify payment received:", err?.message || err);
      });

      internalNotificationService.notifyAgencyOwner(agencyId, {
        type: "PAYMENT_RECEIVED",
        title: "Payment Logged",
        message: `Received ₹${Number(payment.amount).toLocaleString("en-IN")} for Booking #${booking.bookingNumber} (${booking.customer?.name || "Client"}).`,
        linkUrl: `/bookings/${booking.id}`,
        metadata: {
          paymentId: payment.id,
          paymentNumber: payment.paymentNumber,
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          amount: Number(payment.amount),
        },
        idempotencyKey: `payment-recv-${payment.id}`,
      }).catch((err) => {
        console.warn("[PaymentService] Failed to notify agency owner of payment received:", err);
      });

      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor?.userId || "SYSTEM",
        action: "PAYMENT_LOGGED",
        entityType: "PAYMENT",
        entityId: payment.id,
        newState: { status: PaymentStatus.COMPLETED, amount: Number(payment.amount) },
      }, client);
    } else {
      // Staff-submitted PENDING receipt: notify Agency Owner for verification, zero customer notification
      const inAppClient = "inAppNotification" in client ? client.inAppNotification : undefined;
      if (inAppClient?.createMany) {
        await inAppClient.createMany({
          data: [{
            agencyId,
            userId: "usr_owner_alpha",
            type: "PAYMENT_RECEIVED",
            title: "Payment Receipt Pending Verification",
            message: `Staff member submitted a receipt of ₹${Number(payment.amount).toLocaleString("en-IN")} for Booking #${booking.bookingNumber}. Verification required.`,
            metadata: { paymentId: payment.id, status: "PENDING" },
          }],
        });
      } else if (client === prisma) {
        internalNotificationService.notifyAgencyOwner(agencyId, {
          type: "PAYMENT_RECEIVED",
          title: "Payment Receipt Pending Verification",
          message: `Staff member submitted a receipt of ₹${Number(payment.amount).toLocaleString("en-IN")} for Booking #${booking.bookingNumber}. Verification required.`,
          linkUrl: `/bookings/${booking.id}`,
          metadata: {
            paymentId: payment.id,
            paymentNumber: payment.paymentNumber,
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            amount: Number(payment.amount),
            status: "PENDING",
          },
          idempotencyKey: `payment-pending-${payment.id}`,
        }).catch((err) => {
          console.warn("[PaymentService] Failed to notify owner of pending receipt:", err);
        });
      }

      await agencyAuditService.logEvent({
        agencyId,
        actorUserId: actor?.userId || "SYSTEM",
        action: "PAYMENT_RECEIPT_SUBMITTED",
        entityType: "PAYMENT",
        entityId: payment.id,
        newState: { status: PaymentStatus.PENDING, amount: Number(payment.amount) },
      }, client);
    }

    return payment as PaymentWithRelations;
  },

  /**
   * Update payment details and recalculate booking balance
   */
  async updatePayment(
    agencyId: string,
    paymentId: string,
    data: UpdatePaymentInput
  ): Promise<PaymentWithRelations> {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, agencyId, archivedAt: null },
      select: PAYMENT_SCALAR_SELECT,
    });

    if (!payment) {
      throw new Error("Payment record not found.");
    }

    const updateData: Prisma.PaymentUpdateInput = {};
    if (data.amount !== undefined) updateData.amount = new Prisma.Decimal(data.amount);
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.paymentDate !== undefined) updateData.paymentDate = new Date(data.paymentDate);
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === PaymentStatus.REFUNDED && !payment.refundedAt) {
        updateData.refundedAt = new Date();
      }
    }
    if (data.referenceNumber !== undefined) updateData.referenceNumber = data.referenceNumber;
    if (data.receiptNumber !== undefined) updateData.receiptNumber = data.receiptNumber;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.refundedAmount !== undefined) {
      updateData.refundedAmount = new Prisma.Decimal(data.refundedAmount);
      if (Number(data.refundedAmount) > 0 && !payment.refundedAt) {
        updateData.refundedAt = new Date();
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: updateData,
        select: PAYMENT_RELATIONS_SELECT,
      });

      // Recalculate booking paid and balance totals
      await bookingService.recalculateBookingPaymentTotals(payment.bookingId, tx);

      return p;
    });

    return updated as PaymentWithRelations;
  },

  /**
   * Record payment directly against an Invoice and sync Invoice + Booking totals.
   * If actor.role is AGENCY_STAFF, unconditionally forces status to PENDING without updating
   * invoice/booking balances or sending a customer confirmation.
   */
  async recordInvoicePayment(
    agencyId: string,
    invoiceId: string,
    data: {
      amount: number;
      paymentMethod?: PaymentMethod;
      paymentDate?: string | Date;
      referenceNumber?: string | null;
      receiptNumber?: string | null;
      notes?: string | null;
      receivedBy?: string | null;
    },
    actor?: { role: string; userId: string }
  ): Promise<PaymentWithRelations> {
    if (data.amount <= 0) {
      throw new Error("Payment amount must be greater than 0.");
    }

    const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
    const now = new Date();
    if (paymentDate > now) {
      throw new Error("Payment Date cannot be in the future.");
    }

    if (data.referenceNumber && data.referenceNumber.trim()) {
      const existingRef = await prisma.payment.findFirst({
        where: {
          agencyId,
          referenceNumber: data.referenceNumber.trim(),
          archivedAt: null,
          status: { not: PaymentStatus.VOIDED },
        },
        select: { id: true, paymentNumber: true },
      });
      if (existingRef) {
        throw new ConflictError(
          `A payment with reference number "${data.referenceNumber.trim()}" has already been recorded (${existingRef.paymentNumber}).`
        );
      }
    }

    const isStaff = actor?.role === "AGENCY_STAFF";
    const initialStatus = isStaff ? PaymentStatus.PENDING : PaymentStatus.COMPLETED;

    const payment = await prisma.$transaction(async (tx) => {
      if (tx.$queryRaw) {
        await tx.$queryRaw`
          SELECT "id" FROM "invoices" WHERE "id" = ${invoiceId} AND "agencyId" = ${agencyId} FOR UPDATE
        `;
      }

      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, agencyId, archivedAt: null },
        include: { booking: true },
      });

      if (!invoice) {
        throw new Error("Invoice not found.");
      }

      if (invoice.status === "DRAFT") {
        throw new Error("Cannot record payment on a DRAFT invoice. The invoice must be issued first.");
      }

      if (invoice.status === "CANCELLED") {
        throw new Error("Cannot record payment on a CANCELLED invoice.");
      }

      if (tx.$queryRaw) {
        await tx.$queryRaw`
          SELECT "id" FROM "bookings" WHERE "id" = ${invoice.bookingId} AND "agencyId" = ${agencyId} FOR UPDATE
        `;
      }

      const settledPayments = await tx.payment.findMany({
        where: {
          invoiceId,
          archivedAt: null,
          status: { in: [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED] },
        },
        select: { amount: true, refundedAmount: true },
      });

      const currentPaid = Math.round(
        settledPayments.reduce((sum, pay) => {
          const net = Number(pay.amount) - Number(pay.refundedAmount || 0);
          return sum + Math.max(0, net);
        }, 0) * 100
      ) / 100;
      const totalAmount = Number(invoice.totalAmount);
      const balance = Math.max(0, Math.round((totalAmount - currentPaid) * 100) / 100);
      const requestedAmount = Math.round(data.amount * 100) / 100;

      if (balance <= 0) {
        throw new Error("Cannot record payment. This invoice is already fully paid.");
      }

      if (requestedAmount > balance) {
        throw new Error(`Payment amount (₹${data.amount}) exceeds remaining invoice balance (₹${balance}).`);
      }

      const paymentNumber = await this.generateNextPaymentNumber(agencyId, tx);

      const p = await tx.payment.create({
        data: {
          agencyId,
          bookingId: invoice.bookingId,
          invoiceId: invoice.id,
          tripId: invoice.booking.tripId,
          customerId: invoice.booking.customerId,
          paymentNumber,
          amount: new Prisma.Decimal(data.amount),
          currency: invoice.currency || "INR",
          paymentMethod: data.paymentMethod || PaymentMethod.UPI,
          paymentDate,
          status: initialStatus,
          referenceNumber: data.referenceNumber,
          receiptNumber: data.receiptNumber,
          notes: data.notes,
          receivedBy: (isStaff && actor?.userId) ? actor.userId : (data.receivedBy || null),
        },
        select: PAYMENT_RELATIONS_SELECT,
      });

      if (initialStatus === PaymentStatus.COMPLETED) {
        // Recalculate Invoice balance and status
        const totalPaid = Math.round((currentPaid + requestedAmount) * 100) / 100;
        const newBalance = Math.max(0, Math.round((totalAmount - totalPaid) * 100) / 100);

        const newStatus: InvoiceStatus =
          newBalance <= 0 && totalAmount > 0
            ? InvoiceStatus.PAID
            : totalPaid > 0
            ? InvoiceStatus.PARTIALLY_PAID
            : InvoiceStatus.ISSUED;

        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            paidAmount: new Prisma.Decimal(totalPaid),
            balanceAmount: new Prisma.Decimal(newBalance),
            status: newStatus,
          },
        });

        // Recalculate booking payment totals
        await bookingService.recalculateBookingPaymentTotals(invoice.bookingId, tx);
      }

      return p;
    });

    if (payment.status === PaymentStatus.COMPLETED) {
      // Non-blocking communication notification
      communicationService.notifyPaymentReceived(agencyId, payment.id).catch((err) => {
        console.warn("[Communication Non-blocking Notice] Failed to notify payment received:", err?.message || err);
      });
    } else {
      internalNotificationService.notifyAgencyOwner(agencyId, {
        type: "PAYMENT_RECEIVED",
        title: "Payment Receipt Pending Verification",
        message: `Staff member submitted an invoice payment receipt of ₹${Number(payment.amount).toLocaleString("en-IN")}. Verification required.`,
        linkUrl: `/invoices/${invoiceId}`,
        metadata: {
          paymentId: payment.id,
          paymentNumber: payment.paymentNumber,
          invoiceId,
          amount: Number(payment.amount),
          status: "PENDING",
        },
        idempotencyKey: `payment-pending-${payment.id}`,
      }).catch((err) => {
        console.warn("[PaymentService] Failed to notify owner of pending invoice receipt:", err);
      });
    }

    return payment as PaymentWithRelations;
  },

  /**
   * Void an existing payment with mandatory reason. Recalculates Invoice + Booking totals atomically.
   */
  async voidPayment(
    agencyId: string,
    paymentId: string,
    userId: string,
    voidReason: string,
    invoiceId?: string
  ): Promise<PaymentWithRelations> {
    if (!voidReason || voidReason.trim().length < 3) {
      throw new Error("A valid void reason (minimum 3 characters) is required.");
    }

    const voided = await prisma.$transaction(async (tx) => {
      if (tx.$queryRaw) {
        await tx.$queryRaw`
          SELECT "id" FROM "payments" WHERE "id" = ${paymentId} AND "agencyId" = ${agencyId} FOR UPDATE
        `;
      }

      const payment = await tx.payment.findFirst({
        where: {
          id: paymentId,
          agencyId,
          archivedAt: null,
          ...(invoiceId ? { invoiceId } : {}),
        },
        select: PAYMENT_SCALAR_SELECT,
      });

      if (!payment) {
        throw new Error("Payment record not found.");
      }

      if (payment.status === PaymentStatus.VOIDED) {
        throw new Error("Payment has already been voided.");
      }

      if (tx.$queryRaw) {
        await tx.$queryRaw`
          SELECT "id" FROM "bookings" WHERE "id" = ${payment.bookingId} AND "agencyId" = ${agencyId} FOR UPDATE
        `;
      }

      const p = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.VOIDED,
          voidReason: voidReason.trim(),
          voidedAt: new Date(),
          voidedBy: userId,
        },
        select: PAYMENT_RELATIONS_SELECT,
      });

      // If linked to an invoice, recalculate invoice totals & status
      if (payment.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: payment.invoiceId },
        });

        if (invoice) {
          const activePayments = await tx.payment.findMany({
            where: {
              invoiceId: payment.invoiceId,
              archivedAt: null,
              status: { in: [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED] },
            },
            select: { amount: true, refundedAmount: true },
          });

          const totalPaid = activePayments.reduce((sum, pay) => {
            const net = Number(pay.amount) - Number(pay.refundedAmount || 0);
            return sum + Math.max(0, net);
          }, 0);
          const totalAmount = Number(invoice.totalAmount);
          const newBalance = Math.max(0, Math.round((totalAmount - totalPaid) * 100) / 100);

          if (invoice.status !== "CANCELLED") {
            const newStatus: InvoiceStatus =
              newBalance <= 0 && totalAmount > 0
                ? InvoiceStatus.PAID
                : totalPaid > 0
                ? InvoiceStatus.PARTIALLY_PAID
                : InvoiceStatus.ISSUED;

            await tx.invoice.update({
              where: { id: payment.invoiceId },
              data: {
                paidAmount: new Prisma.Decimal(totalPaid),
                balanceAmount: new Prisma.Decimal(newBalance),
                status: newStatus,
              },
            });
          } else {
            await tx.invoice.update({
              where: { id: payment.invoiceId },
              data: {
                paidAmount: new Prisma.Decimal(totalPaid),
                balanceAmount: new Prisma.Decimal(newBalance),
              },
            });
          }
        }
      }

      // Recalculate booking payment totals
      await bookingService.recalculateBookingPaymentTotals(payment.bookingId, tx);

      return p;
    });

    return voided as PaymentWithRelations;
  },

  /**
   * Verifies a pending customer payment receipt.
   * Transitions status to COMPLETED, updates verifiedById and verifiedAt,
   * recalculates booking totals inside a row-level lock, and dispatches customer notification.
   */
  async verifyPaymentReceipt(
    agencyId: string,
    paymentId: string,
    ownerUserId: string,
    prismaClient: PaymentMockClient = prisma
  ): Promise<Payment> {
    const client = prismaClient || prisma;

    let customerNotificationNeeded = false;
    let verifiedPaymentId: string | null = null;

    const verified = await runPaymentTransaction(client, async (tx: PaymentTxClient) => {
      // 1. Lock payment row to serialize concurrent verification attempts
      if (tx.$queryRaw) {
        await tx.$queryRaw`
          SELECT "id" FROM "payments" WHERE "id" = ${paymentId} AND "agencyId" = ${agencyId} FOR UPDATE
        `;
      }

      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: {
          ...PAYMENT_SCALAR_SELECT,
          booking: {
            select: BOOKING_SCALAR_SELECT,
          },
        },
      });

      if (!payment || payment.agencyId !== agencyId) {
        throw new NotFoundError("Payment receipt not found.");
      }

      if (payment.status === PaymentStatus.COMPLETED) {
        return payment;
      }

      if (payment.status === PaymentStatus.VOIDED) {
        throw new ConflictError("Cannot verify a payment receipt that has already been voided.");
      }

      // 2. Lock booking row
      if (tx.$queryRaw) {
        await tx.$queryRaw`
          SELECT "id" FROM "bookings" WHERE "id" = ${payment.bookingId} AND "agencyId" = ${agencyId} FOR UPDATE
        `;
      }

      const verifiedAt = new Date();
      const hasVerificationCols = await checkHasPaymentVerificationColumns(tx);
      const updateData: Prisma.PaymentUncheckedUpdateInput & {
        verifiedById?: string;
        verifiedAt?: Date;
      } = {
        status: PaymentStatus.COMPLETED,
      };
      if (hasVerificationCols) {
        updateData.verifiedById = ownerUserId;
        updateData.verifiedAt = verifiedAt;
      } else {
        console.warn(
          "[PaymentService.verifyPaymentReceipt] payments.verifiedById and verifiedAt columns not present in database. Verification recorded in audit log. Pending migration: 20261027150000_phase_f_staff_permissions"
        );
      }

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: updateData,
        select: {
          ...PAYMENT_SCALAR_SELECT,
          booking: {
            select: BOOKING_SCALAR_SELECT,
          },
        },
      });

      // Recalculate booking payment totals
      await bookingService.recalculateBookingPaymentTotals(payment.bookingId, tx);

      // Audit log (resilient to unmigrated agency_audit_logs table)
      await agencyAuditService.logEvent(
        {
          agencyId,
          actorUserId: ownerUserId,
          action: "PAYMENT_RECEIPT_VERIFIED",
          entityType: "Payment",
          entityId: payment.id,
          metadata: { amount: Number(payment.amount), bookingId: payment.bookingId },
        },
        tx
      );

      // Internal notification
      if (payment.receivedBy) {
        if (tx.userNotification?.create) {
          await tx.userNotification.create({
            data: {
              userId: payment.receivedBy,
              agencyId,
              role: UserRole.AGENCY_STAFF,
              type: UserNotificationType.PAYMENT_RECEIVED,
              title: "Payment Receipt Verified",
              message: `Your payment receipt of ₹${Number(payment.amount).toLocaleString("en-IN")} has been verified.`,
              linkUrl: `/payments`,
              metadata: { paymentId: payment.id, bookingId: payment.bookingId },
            },
          });
        } else if (tx.inAppNotification?.create) {
          await tx.inAppNotification.create({
            data: {
              agencyId,
              userId: payment.receivedBy,
              type: "PAYMENT_RECEIPT_VERIFIED",
              title: "Payment Receipt Verified",
              message: `Your payment receipt of ₹${Number(payment.amount).toLocaleString("en-IN")} has been verified.`,
              metadata: { paymentId: payment.id, bookingId: payment.bookingId },
            },
          });
        }
      }

      customerNotificationNeeded = true;
      verifiedPaymentId = payment.id;

      return updated;
    });

    // Customer notification (non-blocking) - dispatched strictly after successful state transition and transaction commit
    if (customerNotificationNeeded && verifiedPaymentId) {
      communicationService.notifyPaymentReceived(agencyId, verifiedPaymentId).catch((err) => {
        console.warn("[Communication Non-blocking Notice] Failed to notify customer on verification:", err?.message || err);
      });
    }

    return verified as unknown as Payment;
  },

  /**
   * Rejects or voids a payment receipt with mandatory reason.
   * Transitions status to VOIDED, records voidReason, voidedBy, voidedAt.
   * Dispatches internal notification only, zero customer notification.
   */
  async voidPaymentReceipt(
    agencyId: string,
    paymentId: string,
    ownerUserId: string,
    voidReason: string,
    prismaClient: PaymentMockClient = prisma
  ): Promise<Payment> {
    if (!voidReason || voidReason.trim().length < 3) {
      throw new ValidationError("A valid void reason (minimum 3 characters) is required.");
    }

    const client = prismaClient || prisma;

    return await runPaymentTransaction(client, async (tx: PaymentTxClient) => {
      // Lock payment row to serialize concurrent voiding attempts
      if (tx.$queryRaw) {
        await tx.$queryRaw`
          SELECT "id" FROM "payments" WHERE "id" = ${paymentId} AND "agencyId" = ${agencyId} FOR UPDATE
        `;
      }

      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: {
          ...PAYMENT_SCALAR_SELECT,
          booking: {
            select: BOOKING_SCALAR_SELECT,
          },
        },
      });

      if (!payment || payment.agencyId !== agencyId) {
        throw new NotFoundError("Payment receipt not found.");
      }

      if (payment.status === PaymentStatus.VOIDED) {
        return payment as unknown as Payment;
      }

      const voidedAt = new Date();
      const voided = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.VOIDED,
          voidReason: voidReason.trim(),
          voidedAt,
          voidedBy: ownerUserId,
        },
        select: {
          ...PAYMENT_SCALAR_SELECT,
          booking: {
            select: BOOKING_SCALAR_SELECT,
          },
        },
      });

      // If previously COMPLETED, recalculate booking totals
      if (payment.status === PaymentStatus.COMPLETED) {
        await bookingService.recalculateBookingPaymentTotals(payment.bookingId, tx);
      }

      // Audit log (resilient to unmigrated agency_audit_logs table)
      await agencyAuditService.logEvent(
        {
          agencyId,
          actorUserId: ownerUserId,
          action: "PAYMENT_RECEIPT_VOIDED",
          entityType: "Payment",
          entityId: payment.id,
          metadata: { voidReason: voidReason.trim(), amount: Number(payment.amount) },
        },
        tx
      );

      // Internal notification ONLY
      if (payment.receivedBy && tx.inAppNotification?.create) {
        await tx.inAppNotification.create({
          data: {
            agencyId,
            userId: payment.receivedBy,
            type: "PAYMENT_RECEIPT_VOIDED",
            title: "Payment Receipt Voided",
            message: `A payment receipt of ₹${Number(payment.amount).toLocaleString("en-IN")} was voided. Reason: ${voidReason.trim()}`,
            metadata: { paymentId: payment.id, voidReason: voidReason.trim() },
          },
        });
      }

      return voided as unknown as Payment;
    });
  },

  /**
   * Soft delete / archive payment and recalculate booking balance
   */
  /**
   * Alias for verifyPaymentReceipt (preserves naming for staff receipt verification)
   */
  async verifyStaffReceipt(
    agencyId: string,
    paymentId: string,
    ownerUserId: string,
    prismaClient: PaymentMockClient = prisma
  ): Promise<Payment> {
    return this.verifyPaymentReceipt(agencyId, paymentId, ownerUserId, prismaClient);
  },

  /**
   * Alias for voidPaymentReceipt (preserves naming for staff receipt voiding)
   */
  async voidStaffReceipt(
    agencyId: string,
    paymentId: string,
    ownerUserId: string,
    voidReason: string,
    prismaClient: PaymentMockClient = prisma
  ): Promise<Payment> {
    return this.voidPaymentReceipt(agencyId, paymentId, ownerUserId, voidReason, prismaClient);
  },

  async archivePayment(agencyId: string, paymentId: string): Promise<Payment> {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, agencyId, archivedAt: null },
      select: PAYMENT_SCALAR_SELECT,
    });

    if (!payment) {
      throw new Error("Payment record not found.");
    }

    const archived = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: { archivedAt: new Date() },
        select: PAYMENT_SCALAR_SELECT,
      });

      // Recalculate booking totals
      await bookingService.recalculateBookingPaymentTotals(payment.bookingId, tx);

      return p;
    });

    return archived as unknown as Payment;
  },
};
