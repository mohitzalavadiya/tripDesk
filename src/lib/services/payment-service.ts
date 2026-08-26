import "server-only";
import { prisma } from "@/lib/prisma";
import { Payment, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { bookingService } from "./booking-service";
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
