import "server-only";
import { prisma } from "@/lib/prisma";
import { Payment, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { bookingService } from "./booking-service";
import { communicationService } from "./communication-service";
import {
  CreatePaymentInput,
  UpdatePaymentInput,
  PaymentQueryInput,
} from "@/lib/validation/payment-schema";

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
        include: {
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
      include: {
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
   * Log a new payment and automatically recalculate booking balance
   */
  async createPayment(agencyId: string, data: CreatePaymentInput): Promise<PaymentWithRelations> {
    const booking = await prisma.booking.findFirst({
      where: { id: data.bookingId, agencyId, archivedAt: null },
      include: { customer: true, trip: true },
    });

    if (!booking) {
      throw new Error("Booking not found or does not belong to this agency.");
    }

    const paymentNumber = await this.generateNextPaymentNumber(agencyId);

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          agencyId,
          bookingId: data.bookingId,
          tripId: booking.tripId,
          customerId: booking.customerId,
          paymentNumber,
          amount: new Prisma.Decimal(data.amount),
          currency: booking.currency || "INR",
          paymentMethod: data.paymentMethod || PaymentMethod.UPI,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          status: data.status || PaymentStatus.COMPLETED,
          referenceNumber: data.referenceNumber,
          receiptNumber: data.receiptNumber,
          notes: data.notes,
        },
        include: {
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

      // Recalculate booking paid and balance totals
      await bookingService.recalculateBookingPaymentTotals(booking.id, tx);

      return p;
    });

    // Non-blocking communication trigger
    communicationService.notifyPaymentReceived(agencyId, payment.id).catch((err) => {
      console.warn("[Communication Non-blocking Notice] Failed to notify payment received:", err?.message || err);
    });

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
        include: {
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

      // Recalculate booking paid and balance totals
      await bookingService.recalculateBookingPaymentTotals(payment.bookingId, tx);

      return p;
    });

    return updated as PaymentWithRelations;
  },

  /**
   * Record payment directly against an Invoice and sync Invoice + Booking totals
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
    }
  ): Promise<PaymentWithRelations> {
    if (data.amount <= 0) {
      throw new Error("Payment amount must be greater than 0.");
    }

    const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();
    const now = new Date();
    if (paymentDate > now) {
      throw new Error("Payment Date cannot be in the future.");
    }

    const payment = await prisma.$transaction(async (tx) => {
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

      const balance = Number(invoice.balanceAmount);
      if (data.amount > balance) {
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
          status: PaymentStatus.COMPLETED,
          referenceNumber: data.referenceNumber,
          receiptNumber: data.receiptNumber,
          notes: data.notes,
          receivedBy: data.receivedBy,
        },
        include: {
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

      // Recalculate Invoice balance and status
      const activePayments = await tx.payment.findMany({
        where: { invoiceId, archivedAt: null, status: { not: PaymentStatus.VOIDED } },
        select: { amount: true },
      });

      const totalPaid = activePayments.reduce((sum, pay) => sum + Number(pay.amount), 0);
      const totalAmount = Number(invoice.totalAmount);
      const newBalance = Math.max(0, Math.round((totalAmount - totalPaid) * 100) / 100);

      const newStatus =
        newBalance <= 0 ? "PAID" : totalPaid > 0 ? "PARTIALLY_PAID" : "ISSUED";

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: new Prisma.Decimal(totalPaid),
          balanceAmount: new Prisma.Decimal(newBalance),
          status: newStatus as any,
        },
      });

      // Recalculate booking payment totals
      await bookingService.recalculateBookingPaymentTotals(invoice.bookingId, tx);

      return p;
    });

    // Non-blocking communication notification
    communicationService.notifyPaymentReceived(agencyId, payment.id).catch((err) => {
      console.warn("[Communication Non-blocking Notice] Failed to notify payment received:", err?.message || err);
    });

    return payment as PaymentWithRelations;
  },

  /**
   * Void an existing payment with mandatory reason. Recalculates Invoice + Booking totals atomically.
   */
  async voidPayment(
    agencyId: string,
    paymentId: string,
    userId: string,
    voidReason: string
  ): Promise<PaymentWithRelations> {
    if (!voidReason || voidReason.trim().length < 3) {
      throw new Error("A valid void reason (minimum 3 characters) is required.");
    }

    const voided = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, agencyId, archivedAt: null },
      });

      if (!payment) {
        throw new Error("Payment record not found.");
      }

      if (payment.status === PaymentStatus.VOIDED) {
        throw new Error("Payment has already been voided.");
      }

      const p = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.VOIDED,
          voidReason: voidReason.trim(),
          voidedAt: new Date(),
          voidedBy: userId,
        },
        include: {
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
              status: { not: PaymentStatus.VOIDED },
            },
            select: { amount: true },
          });

          const totalPaid = activePayments.reduce((sum, pay) => sum + Number(pay.amount), 0);
          const totalAmount = Number(invoice.totalAmount);
          const newBalance = Math.max(0, Math.round((totalAmount - totalPaid) * 100) / 100);

          if (invoice.status !== "CANCELLED") {
            const newStatus =
              newBalance <= 0 ? "PAID" : totalPaid > 0 ? "PARTIALLY_PAID" : "ISSUED";

            await tx.invoice.update({
              where: { id: payment.invoiceId },
              data: {
                paidAmount: new Prisma.Decimal(totalPaid),
                balanceAmount: new Prisma.Decimal(newBalance),
                status: newStatus as any,
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
   * Soft delete / archive payment and recalculate booking balance
   */
  async archivePayment(agencyId: string, paymentId: string): Promise<Payment> {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, agencyId, archivedAt: null },
    });

    if (!payment) {
      throw new Error("Payment record not found.");
    }

    return prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: { archivedAt: new Date() },
      });

      // Recalculate booking totals
      await bookingService.recalculateBookingPaymentTotals(payment.bookingId, tx);

      return p;
    });
  },
};
