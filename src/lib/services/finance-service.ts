import prisma from "@/lib/prisma";
import {
CreateExpenseInput,
CreateSupplierPayableInput,
FinanceFilterInput,
FinancePreset,
RecordCustomerPaymentInput,
RecordSupplierPaymentInput,
RefundCustomerPaymentInput,
TransactionQueryInput,
UpdateExpenseInput,
UpdateSupplierPayableInput,
} from "@/lib/validation/finance-schema";
import {
BookingPaymentStatus,
BookingStatus,
InvoiceStatus,
OperationalExpense,
Payment,
PaymentMethod,
PaymentStatus,
Prisma,
SupplierPayable,
SupplierPayableStatus,
SupplierPayment,
SupplierPaymentStatus,
} from "@prisma/client";
import "server-only";
import { PAYMENT_SCALAR_SELECT } from "./payment-service";
import { tripCostingService } from "./trip-costing-service";

// ═════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═════════════════════════════════════════════════════════════════════

export interface FinanceKPIOverview {
  totalSales: number;
  confirmedBookingValue?: number;
  amountReceived: number;
  customerOutstanding: number;
  customerRefunded: number;
  supplierPayable: number;
  supplierPaid: number;
  supplierOutstanding: number;
  operationalExpenses: number;
  grossProfit: number;
  profitMarginPercent: number;
  netCashPosition: number;
  totalBookingsCount: number;
  fullyPaidBookingsCount: number;
  partiallyPaidBookingsCount: number;
  unpaidBookingsCount: number;
}

export interface CustomerOutstandingItem {
  bookingId: string;
  bookingNumber: string;
  tripNumber: string;
  tripTitle: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  travelStartDate: string | null;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: BookingPaymentStatus;
  isOverdue: boolean;
}

export interface SupplierOutstandingItem {
  payableId: string;
  payableNumber: string;
  supplierId?: string | null;
  supplierName: string;
  supplierType: string;
  payeeName?: string | null;
  origin?: string;
  description: string;
  serviceType: string;
  tripId?: string | null;
  tripNumber?: string | null;
  tripTitle?: string | null;
  bookingId?: string | null;
  bookingNumber?: string | null;
  plannedAmount: number;
  actualAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  overpaidAmount?: number;
  dueDate: string | null;
  status: SupplierPayableStatus;
  isOverdue: boolean;
}

export interface FinanceDashboardResult {
  dateRange: {
    start: string;
    end: string;
    preset: FinancePreset;
  };
  kpis: FinanceKPIOverview;
  profitability: {
    revenue: number;
    supplierCost: number;
    operationalExpenses: number;
    grossProfit: number;
    profitMarginPercent: number;
    netCashPosition: number;
  };
  customerReceivables: {
    totalOutstanding: number;
    overdueCount: number;
    overdueAmount: number;
    items: CustomerOutstandingItem[];
  };
  supplierPayables: {
    totalOutstanding: number;
    overdueCount: number;
    overdueAmount: number;
    items: SupplierOutstandingItem[];
  };
  recentTransactions: UnifiedTransactionItem[];
}

export interface UnifiedTransactionItem {
  id: string;
  transactionNumber: string;
  type: "CUSTOMER_PAYMENT" | "CUSTOMER_REFUND" | "SUPPLIER_PAYMENT" | "EXPENSE";
  category?: string;
  date: string;
  amount: number;
  currency: string;
  paymentMethod?: PaymentMethod | string;
  status: string;
  referenceNumber?: string | null;
  partyName: string;
  partyType: "CUSTOMER" | "SUPPLIER" | "INTERNAL";
  bookingId?: string | null;
  bookingNumber?: string | null;
  tripId?: string | null;
  tripTitle?: string | null;
  description?: string | null;
}

export interface BookingPaymentMilestoneScheduleItem {
  id: string;
  title: string;
  percentage: number;
  plannedAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
  dueDate: string | null;
  status: "PENDING" | "PARTIALLY_PAID" | "PAID";
  isOverdue: boolean;
}

export interface BookingPaymentScheduleResult {
  bookingId: string;
  bookingNumber: string;
  totalBookingAmount: number;
  netReceivedAmount: number;
  outstandingBalance: number;
  paymentStatus: BookingPaymentStatus;
  milestones: BookingPaymentMilestoneScheduleItem[];
  totalMilestonesPlanned: number;
  totalMilestonesAllocated: number;
  overdueMilestonesCount: number;
  overdueMilestonesAmount: number;
}

export interface BookingFinanceBreakdown {
  bookingId: string;
  bookingNumber: string;
  tripId: string;
  tripNumber: string;
  tripTitle: string;
  customerName: string;
  quotedAmount?: number;
  totalBookingAmount: number;
  invoicedAmount?: number;
  customerPaid: number;
  customerRefunded: number;
  customerOutstanding: number;
  paymentStatus: BookingPaymentStatus;
  paymentSchedule: BookingPaymentMilestoneScheduleItem[];
  totalMilestonesPlanned: number;
  totalMilestonesAllocated: number;
  overdueMilestonesCount: number;
  overdueMilestonesAmount: number;
  supplierCostPlanned: number;
  supplierCostActual: number;
  supplierPaid: number;
  supplierOutstanding: number;
  operationalExpenses: number;
  grossMargin?: number;
  grossProfit: number;
  profitMarginPercent: number;
  netCashPosition: number;
  isCostComplete?: boolean;
  costCompletenessReason?: string;
  isFinalized: boolean;
  customerPayments: Array<Omit<Payment, "verifiedById" | "verifiedAt">>;
  supplierPayables: (SupplierPayable & { supplier?: { name: string; type: string | null } | null })[];
  supplierPayments: (SupplierPayment & { supplier?: { name: string } | null })[];
  expenses: OperationalExpense[];
  invoices?: {
    id: string;
    invoiceNumber: string | null;
    totalAmount: Prisma.Decimal;
    paidAmount: Prisma.Decimal;
    balanceAmount: Prisma.Decimal;
    status: string;
    dueDate: Date | null;
  }[];
}

// ═════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════

export function calculateDateRange(
  preset: FinancePreset = "LAST_30_DAYS",
  customStart?: string,
  customEnd?: string
): { start: Date; end: Date; preset: FinancePreset } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case "TODAY":
      break;
    case "LAST_7_DAYS":
      start.setDate(now.getDate() - 7);
      break;
    case "LAST_30_DAYS":
      start.setDate(now.getDate() - 30);
      break;
    case "LAST_90_DAYS":
      start.setDate(now.getDate() - 90);
      break;
    case "CURRENT_MONTH":
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case "PREVIOUS_MONTH":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end.setTime(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime());
      break;
    case "CURRENT_YEAR":
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    case "CUSTOM":
      if (customStart && customEnd) {
        start = new Date(customStart);
        start.setHours(0, 0, 0, 0);
        end.setTime(new Date(customEnd).getTime());
        end.setHours(23, 59, 59, 999);
      } else {
        start.setDate(now.getDate() - 30);
      }
      break;
  }

  return { start, end, preset };
}

// ═════════════════════════════════════════════════════════════════════
// FINANCE SERVICE
// ═════════════════════════════════════════════════════════════════════

export const financeService = {
  /**
   * Sequential numbering generators
   */
  async generateNextPayableNumber(agencyId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const db = tx || prisma;
    const year = new Date().getFullYear();
    const prefix = `PAYABLE-${year}-`;
    const last = await db.supplierPayable.findFirst({
      where: { agencyId, payableNumber: { startsWith: prefix } },
      orderBy: { payableNumber: "desc" },
      select: { payableNumber: true },
    });
    let seq = 1;
    if (last?.payableNumber) {
      const parts = last.payableNumber.split("-");
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) seq = num + 1;
    }
    return `${prefix}${String(seq).padStart(5, "0")}`;
  },

  async generateNextSupplierPaymentNumber(agencyId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const db = tx || prisma;
    const year = new Date().getFullYear();
    const prefix = `SPAY-${year}-`;
    const last = await db.supplierPayment.findFirst({
      where: { agencyId, paymentNumber: { startsWith: prefix } },
      orderBy: { paymentNumber: "desc" },
      select: { paymentNumber: true },
    });
    let seq = 1;
    if (last?.paymentNumber) {
      const parts = last.paymentNumber.split("-");
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) seq = num + 1;
    }
    return `${prefix}${String(seq).padStart(5, "0")}`;
  },

  async generateNextExpenseNumber(agencyId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const db = tx || prisma;
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;
    const last = await db.operationalExpense.findFirst({
      where: { agencyId, expenseNumber: { startsWith: prefix } },
      orderBy: { expenseNumber: "desc" },
      select: { expenseNumber: true },
    });
    let seq = 1;
    if (last?.expenseNumber) {
      const parts = last.expenseNumber.split("-");
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) seq = num + 1;
    }
    return `${prefix}${String(seq).padStart(5, "0")}`;
  },

  /**
   * Verify whether an operation is finalized (Immutability Lock)
   */
  async verifyOperationNotFinalized(
    agencyId: string,
    operationIdOrBookingId: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const db = tx || prisma;
    const operation = await db.tripOperation.findFirst({
      where: {
        agencyId,
        OR: [{ id: operationIdOrBookingId }, { bookingId: operationIdOrBookingId }],
      },
      include: {
        events: {
          where: { eventType: { in: ["OPERATION_FINALIZED", "OPERATION_REOPENED"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (operation && operation.events.length > 0 && operation.events[0].eventType === "OPERATION_FINALIZED") {
      throw new Error(
        "Operation is finalized and locked for audit compliance. Reopen the operation with an explicit reason before modifying financial records."
      );
    }
  },

  /**
   * Recalculate Booking payment balance & status
   */
  async recalculateBookingBalances(bookingId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          where: { archivedAt: null, status: { in: [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED] } },
          select: { id: true, amount: true, refundedAmount: true },
        },
      },
    });

    if (!booking) return;

    let totalPaid = 0;
    let totalRefunded = 0;

    for (const p of booking.payments) {
      totalPaid += Number(p.amount);
      totalRefunded += Number(p.refundedAmount || 0);
    }

    const netPaid = Math.max(0, Math.round((totalPaid - totalRefunded) * 100) / 100);
    const totalAmount = Number(booking.totalAmount);
    const balanceAmount = Math.max(0, Math.round((totalAmount - netPaid) * 100) / 100);

    let paymentStatus: BookingPaymentStatus = BookingPaymentStatus.UNPAID;
    if (netPaid >= totalAmount && totalAmount > 0) {
      paymentStatus = BookingPaymentStatus.PAID;
    } else if (netPaid > 0) {
      paymentStatus = BookingPaymentStatus.PARTIALLY_PAID;
    }

    await db.booking.update({
      where: { id: bookingId },
      data: {
        paidAmount: new Prisma.Decimal(netPaid),
        balanceAmount: new Prisma.Decimal(balanceAmount),
        paymentStatus,
      },
    });

    // Keep linked non-cancelled invoice paid/balance/status synchronized without altering historical totals
    const activeInvoice = await db.invoice.findFirst({
      where: {
        bookingId,
        status: { not: InvoiceStatus.CANCELLED },
        archivedAt: null,
      },
      select: { id: true, totalAmount: true, status: true },
    });

    if (activeInvoice) {
      const invPayments = await db.payment.findMany({
        where: {
          invoiceId: activeInvoice.id,
          archivedAt: null,
          status: { in: [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED] },
        },
        select: { amount: true, refundedAmount: true },
      });
      const invPaid =
        invPayments.length > 0
          ? Math.max(
              0,
              Math.round(
                invPayments.reduce(
                  (sum, pay) => sum + Math.max(0, Number(pay.amount) - Number(pay.refundedAmount || 0)),
                  0
                ) * 100
              ) / 100
            )
          : netPaid;
      const invTotal = Number(activeInvoice.totalAmount);
      const invBalance = Math.max(0, Math.round((invTotal - invPaid) * 100) / 100);
      let newInvStatus: InvoiceStatus = InvoiceStatus.ISSUED;
      if (invBalance <= 0 && invTotal > 0) {
        newInvStatus = InvoiceStatus.PAID;
      } else if (invPaid > 0) {
        newInvStatus = InvoiceStatus.PARTIALLY_PAID;
      }

      await db.invoice.update({
        where: { id: activeInvoice.id },
        data: {
          paidAmount: new Prisma.Decimal(invPaid),
          balanceAmount: new Prisma.Decimal(invBalance),
          ...(activeInvoice.status !== InvoiceStatus.DRAFT ? { status: newInvStatus } : {}),
        },
      });
    }
  },

  // ═════════════════════════════════════════════════════════════════════
  // CUSTOMER PAYMENT & REFUND WORKFLOWS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Record Customer Payment
   */
  async recordCustomerPayment(
    agencyId: string,
    input: RecordCustomerPaymentInput,
    userId?: string,
    actor?: { role: string; userId: string }
  ): Promise<Payment> {
    if (actor?.role === "AGENCY_STAFF") {
      const { enforceStaffPermission } = await import("./staff-permission-service");
      await enforceStaffPermission(
        actor.role,
        agencyId,
        actor.userId,
        "PAYMENTS",
        "recordReceipt",
        "You do not have permission to record customer payments."
      );
    }

    // 1. Verify booking exists and belongs to agency
    const booking = await prisma.booking.findFirst({
      where: { id: input.bookingId, agencyId, archivedAt: null },
      include: { tripOperation: true },
    });

    if (!booking) {
      throw new Error("Booking not found or does not belong to your agency.");
    }

    // 2. Check operation finalization lock
    if (booking.tripOperation) {
      await this.verifyOperationNotFinalized(agencyId, booking.tripOperation.id);
    }

    // 3. Idempotency & duplicate-reference Check (excludes VOIDED payments so voided references are reusable)
    if (input.idempotencyKey) {
      const existingByKey = await prisma.payment.findFirst({
        where: {
          agencyId,
          bookingId: input.bookingId,
          archivedAt: null,
          status: { not: PaymentStatus.VOIDED },
          notes: { contains: `[idempotency:${input.idempotencyKey}]` },
        },
        select: PAYMENT_SCALAR_SELECT,
      });
      if (existingByKey) {
        return existingByKey as unknown as Payment;
      }
    }

    if (input.referenceNumber && input.referenceNumber.trim()) {
      const ref = input.referenceNumber.trim();
      const existingByRef = await prisma.payment.findFirst({
        where: {
          agencyId,
          referenceNumber: ref,
          archivedAt: null,
          status: { not: PaymentStatus.VOIDED },
        },
        select: PAYMENT_SCALAR_SELECT,
      });
      if (existingByRef) {
        if (existingByRef.bookingId === input.bookingId) {
          return existingByRef as unknown as Payment;
        }
        throw new Error(
          `A payment with reference number "${ref}" has already been recorded (${existingByRef.paymentNumber}).`
        );
      }
    }

    const activeInvoice = await prisma.invoice.findFirst({
      where: {
        agencyId,
        bookingId: input.bookingId,
        status: { not: InvoiceStatus.CANCELLED },
        archivedAt: null,
      },
      select: { id: true },
    });

    // 4. Generate sequential payment number
    const year = new Date().getFullYear();
    const prefix = `PAY-${year}-`;
    const last = await prisma.payment.findFirst({
      where: { agencyId, paymentNumber: { startsWith: prefix } },
      orderBy: { paymentNumber: "desc" },
      select: { paymentNumber: true },
    });
    let seq = 1;
    if (last?.paymentNumber) {
      const parts = last.paymentNumber.split("-");
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) seq = num + 1;
    }
    const paymentNumber = `${prefix}${String(seq).padStart(5, "0")}`;

    const notesWithIdempotency = input.idempotencyKey
      ? `${input.notes || ""} [idempotency:${input.idempotencyKey}]`.trim()
      : input.notes;

    const payment = await prisma.$transaction(async (tx) => {
      // 1. Acquire row lock on the Booking record to serialize concurrent payment submissions
      await tx.$queryRaw`
        SELECT "id" FROM "bookings" WHERE "id" = ${booking.id} AND "agencyId" = ${agencyId} FOR UPDATE
      `;

      // 2. Fetch fresh active completed payments inside transaction to calculate real-time authoritative balance
      const freshBooking = await tx.booking.findUnique({
        where: { id: booking.id },
        select: { totalAmount: true },
      });

      const activePayments = await tx.payment.findMany({
        where: {
          bookingId: booking.id,
          archivedAt: null,
          status: { in: [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED] },
        },
        select: { amount: true, refundedAmount: true },
      });

      let totalPaid = 0;
      let totalRefunded = 0;
      for (const p of activePayments) {
        totalPaid += Number(p.amount);
        totalRefunded += Number(p.refundedAmount || 0);
      }
      const netPaid = Math.max(0, Math.round((totalPaid - totalRefunded) * 100) / 100);
      const totalAmount = freshBooking ? Number(freshBooking.totalAmount) : Number(booking.totalAmount);
      const currentOutstanding = Math.max(0, Math.round((totalAmount - netPaid) * 100) / 100);
      const requestedAmount = Math.round(input.amount * 100) / 100;

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

      const p = await tx.payment.create({
        data: {
          agencyId,
          bookingId: input.bookingId,
          invoiceId: activeInvoice?.id || null,
          tripId: booking.tripId,
          customerId: booking.customerId,
          paymentNumber,
          paymentType: input.paymentType,
          amount: new Prisma.Decimal(input.amount),
          currency: booking.currency || "INR",
          paymentMethod: input.paymentMethod,
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
          status: PaymentStatus.COMPLETED,
          referenceNumber: input.referenceNumber,
          receiptNumber: input.receiptNumber,
          receivedBy: input.receivedBy,
          notes: notesWithIdempotency,
        },
        select: PAYMENT_SCALAR_SELECT,
      });

      // Recalculate booking totals
      await this.recalculateBookingBalances(booking.id, tx);

      // Log timeline audit event if linked to an operation
      if (booking.tripOperation) {
        await tx.operationEvent.create({
          data: {
            agencyId,
            tripOperationId: booking.tripOperation.id,
            eventType: "CUSTOMER_PAYMENT_RECORDED",
            description: `Recorded customer payment ${paymentNumber} of ₹${input.amount.toLocaleString(
              "en-IN"
            )} via ${input.paymentMethod}.`,
            metadata: {
              paymentId: p.id,
              paymentNumber,
              amount: input.amount,
              paymentType: input.paymentType,
              paymentMethod: input.paymentMethod,
            },
            createdBy: userId,
          },
        });
      }

      return p;
    });

    return payment as unknown as Payment;
  },

  /**
   * Refund Customer Payment
   */
  async refundCustomerPayment(
    agencyId: string,
    paymentId: string,
    input: RefundCustomerPaymentInput,
    userId?: string
  ): Promise<Payment> {
    const updated = await prisma.$transaction(async (tx) => {
      if (tx.$queryRaw) {
        await tx.$queryRaw`
          SELECT "id" FROM "payments" WHERE "id" = ${paymentId} AND "agencyId" = ${agencyId} FOR UPDATE
        `;
      }

      const payment = await tx.payment.findFirst({
        where: { id: paymentId, agencyId, archivedAt: null },
        include: { booking: { include: { tripOperation: true } } },
      });

      if (!payment) {
        throw new Error("Payment record not found.");
      }

      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new Error("Only completed payments can be refunded.");
      }

      // Check for idempotency on refund under row lock
      if (input.idempotencyKey && payment.notes?.includes(`[refund-idempotency:${input.idempotencyKey}]`)) {
        return payment;
      }

      const currentRefunded = Number(payment.refundedAmount || 0);
      const eligibleAmount = Number(payment.amount) - currentRefunded;

      if (input.amount > eligibleAmount + 0.001) {
        throw new Error(
          `Refund amount (₹${input.amount}) exceeds eligible balance (₹${eligibleAmount.toFixed(2)}).`
        );
      }

      // Check operation finalization lock
      if (payment.booking?.tripOperation) {
        await this.verifyOperationNotFinalized(agencyId, payment.booking.tripOperation.id, tx);
      }

      if (tx.$queryRaw) {
        await tx.$queryRaw`
          SELECT "id" FROM "bookings" WHERE "id" = ${payment.bookingId} AND "agencyId" = ${agencyId} FOR UPDATE
        `;
      }

      const newRefundedAmount = Math.round((currentRefunded + input.amount) * 100) / 100;
      const isFullyRefunded = Math.abs(newRefundedAmount - Number(payment.amount)) < 0.01;

      const refundNoteTag = input.idempotencyKey ? ` [refund-idempotency:${input.idempotencyKey}]` : "";
      const refundNoteText = `Refund: ₹${input.amount} (${input.reason})${refundNoteTag}`;

      const p = await tx.payment.update({
        where: { id: paymentId },
        data: {
          refundedAmount: new Prisma.Decimal(newRefundedAmount),
          refundedAt: input.refundDate ? new Date(input.refundDate) : new Date(),
          status: isFullyRefunded ? PaymentStatus.REFUNDED : PaymentStatus.COMPLETED,
          notes: payment.notes
            ? `${payment.notes} | ${refundNoteText}`
            : refundNoteText,
        },
        select: PAYMENT_SCALAR_SELECT,
      });

      // Recalculate booking balance (and linked invoice if present)
      await this.recalculateBookingBalances(payment.bookingId, tx);

      // Synchronize linked invoice if present and not already synced with all payments
      if (payment.invoiceId) {
        const invPayments = await tx.payment.findMany({
          where: {
            invoiceId: payment.invoiceId,
            archivedAt: null,
            status: { in: [PaymentStatus.COMPLETED, PaymentStatus.REFUNDED] },
          },
          select: { amount: true, refundedAmount: true },
        });
        const invPaid = Math.max(
          0,
          Math.round(
            invPayments.reduce((sum, pay) => {
              const net = Number(pay.amount) - Number(pay.refundedAmount || 0);
              return sum + Math.max(0, net);
            }, 0) * 100
          ) / 100
        );
        const invoice = await tx.invoice.findUnique({
          where: { id: payment.invoiceId },
          select: { totalAmount: true, status: true },
        });
        if (invoice) {
          const invTotal = Number(invoice.totalAmount);
          const invBalance = Math.max(0, Math.round((invTotal - invPaid) * 100) / 100);
          const newInvStatus =
            invBalance <= 0 && invTotal > 0 ? "PAID" : invPaid > 0 ? "PARTIALLY_PAID" : "ISSUED";
          await tx.invoice.update({
            where: { id: payment.invoiceId },
            data: {
              paidAmount: new Prisma.Decimal(invPaid),
              balanceAmount: new Prisma.Decimal(invBalance),
              ...(invoice.status !== "CANCELLED" ? { status: newInvStatus as InvoiceStatus } : {}),
            },
          });
        }
      }

      // Audit event
      if (payment.booking?.tripOperation) {
        await tx.operationEvent.create({
          data: {
            agencyId,
            tripOperationId: payment.booking.tripOperation.id,
            eventType: "CUSTOMER_PAYMENT_REFUNDED",
            description: `Processed refund of ₹${input.amount.toLocaleString(
              "en-IN"
            )} for payment ${payment.paymentNumber}. Reason: ${input.reason}`,
            metadata: {
              paymentId,
              paymentNumber: payment.paymentNumber,
              refundAmount: input.amount,
              reason: input.reason,
              idempotencyKey: input.idempotencyKey,
            },
            createdBy: userId,
          },
        });
      }

      return p;
    });

    return updated as unknown as Payment;
  },

  // ═════════════════════════════════════════════════════════════════════
  // SUPPLIER / UNIFIED PAYABLES & DISBURSEMENTS WORKFLOWS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Create Supplier / Unified Payable (Manual or Service-Origin)
   */
  async createSupplierPayable(
    agencyId: string,
    input: CreateSupplierPayableInput,
    userId?: string
  ): Promise<SupplierPayable> {
    void userId;
    let supplierName: string | null = null;
    if (input.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: input.supplierId, agencyId, archivedAt: null },
      });
      if (!supplier) throw new Error("Supplier not found or does not belong to your agency.");
      supplierName = supplier.name;
    }

    const resolvedPayee = input.payeeName || supplierName;
    if (!resolvedPayee) {
      throw new Error("Payee Name is required.");
    }

    let linkedTripId: string | null = null;
    let linkedBookingId: string | null = null;

    if (input.bookingId) {
      const booking = await prisma.booking.findFirst({
        where: { id: input.bookingId, agencyId, archivedAt: null },
      });
      if (!booking) throw new Error("Booking not found or does not belong to your agency.");
      if (input.tripId && input.tripId !== booking.tripId) {
        throw new Error("Mismatched booking and trip relationship.");
      }
      linkedBookingId = booking.id;
      linkedTripId = booking.tripId;
    } else if (input.tripId) {
      const trip = await prisma.trip.findFirst({
        where: { id: input.tripId, agencyId, archivedAt: null },
      });
      if (!trip) throw new Error("Trip not found or does not belong to your agency.");
      linkedTripId = trip.id;
      linkedBookingId = null;
    } else {
      throw new Error("Payable must be linked to a Trip or Booking.");
    }

    if (input.tripOperationId) {
      const operation = await prisma.tripOperation.findFirst({
        where: { id: input.tripOperationId, agencyId },
      });
      if (!operation) throw new Error("Trip operation not found or does not belong to your agency.");
      await this.verifyOperationNotFinalized(agencyId, input.tripOperationId);
    }

    // Idempotency check for supplier payable
    if (input.idempotencyKey) {
      const existing = await prisma.supplierPayable.findFirst({
        where: {
          agencyId,
          archivedAt: null,
          notes: { contains: `[idempotency:${input.idempotencyKey}]` },
        },
      });
      if (existing) return existing;
    }

    const payableNumber = await this.generateNextPayableNumber(agencyId);
    const actual = input.actualAmount > 0 ? input.actualAmount : input.plannedAmount;
    const planned = input.plannedAmount > 0 ? input.plannedAmount : actual;

    const notesWithIdempotency = input.idempotencyKey
      ? `${input.notes || ""} [idempotency:${input.idempotencyKey}]`.trim()
      : input.notes;

    return prisma.supplierPayable.create({
      data: {
        agencyId,
        supplierId: input.supplierId || null,
        payeeName: resolvedPayee,
        origin: input.origin || "MANUAL",
        bookingId: linkedBookingId,
        tripOperationId: input.tripOperationId || null,
        tripId: linkedTripId,
        payableNumber,
        serviceType: input.serviceType || "MANUAL",
        serviceReferenceId: input.serviceReferenceId || null,
        description: input.description,
        currency: input.currency || "INR",
        plannedAmount: new Prisma.Decimal(planned),
        actualAmount: new Prisma.Decimal(actual),
        paidAmount: new Prisma.Decimal(0),
        outstandingAmount: new Prisma.Decimal(actual),
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        status: SupplierPayableStatus.PENDING,
        notes: notesWithIdempotency,
      },
    });
  },

  /**
   * Update Payable (Automatic or Manual - Editable!)
   * Preserves plannedAmount (original generated snapshot) while modifying actualAmount.
   * Tracks edit audit history in notes and OperationEvent.
   */
  async updateSupplierPayable(
    agencyId: string,
    id: string,
    input: UpdateSupplierPayableInput,
    userId?: string
  ): Promise<SupplierPayable> {
    return prisma.$transaction(async (tx) => {
      // 1. Acquire row lock on SupplierPayable record to serialize concurrent edits/disbursements
      await tx.$queryRaw`
        SELECT "id" FROM "supplier_payables" WHERE "id" = ${id} AND "agencyId" = ${agencyId} FOR UPDATE
      `;

      const payable = await tx.supplierPayable.findFirst({
        where: { id, agencyId, archivedAt: null },
      });
      if (!payable) throw new Error("Payable record not found.");

      if (payable.tripOperationId) {
        await this.verifyOperationNotFinalized(agencyId, payable.tripOperationId);
      }

      // Fetch fresh active completed disbursements to calculate authoritative paid amount
      const activePayments = await tx.supplierPayment.findMany({
        where: { payableId: payable.id, archivedAt: null, status: SupplierPaymentStatus.COMPLETED },
        select: { amount: true },
      });
      let freshPaid = 0;
      for (const p of activePayments) {
        freshPaid += Number(p.amount);
      }

      const currentActual = Number(payable.actualAmount);
      const currentPaid = Math.round(freshPaid * 100) / 100;
      const newActual = input.actualAmount !== undefined ? Math.round(input.actualAmount * 100) / 100 : currentActual;
      const newPlanned = input.plannedAmount !== undefined ? input.plannedAmount : Number(payable.plannedAmount);

      if (newActual < currentPaid - 0.001) {
        const formattedNew = newActual.toLocaleString("en-IN", { minimumFractionDigits: 2 });
        const formattedPaid = currentPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 });
        throw new Error(
          `Payable amount (₹${formattedNew}) cannot be less than the amount already paid of ₹${formattedPaid}.`
        );
      }

      const newOutstanding = Math.max(0, Math.round((newActual - currentPaid) * 100) / 100);

      let newStatus = input.status || payable.status;
      if (!input.status) {
        if (currentPaid >= newActual && newActual > 0) {
          newStatus = SupplierPayableStatus.PAID;
        } else if (currentPaid > 0) {
          newStatus = SupplierPayableStatus.PARTIALLY_PAID;
        } else if (payable.status !== SupplierPayableStatus.CANCELLED) {
          newStatus = SupplierPayableStatus.PENDING;
        }
      }

      let updatedNotes = input.notes !== undefined ? input.notes : payable.notes;
      if (input.actualAmount !== undefined && Math.abs(input.actualAmount - currentActual) > 0.001) {
        const nowStr = new Date().toISOString().split("T")[0];
        const editLog = `[Edited ${nowStr}: Amount changed from ₹${currentActual.toLocaleString("en-IN")} to ₹${newActual.toLocaleString("en-IN")}${input.reason ? ` (${input.reason})` : ""}${userId ? ` by ${userId}` : ""}]`;
        updatedNotes = updatedNotes ? `${updatedNotes} | ${editLog}` : editLog;
      }

      const updated = await tx.supplierPayable.update({
        where: { id: payable.id },
        data: {
          payeeName: input.payeeName !== undefined ? input.payeeName : payable.payeeName,
          description: input.description !== undefined ? input.description : payable.description,
          plannedAmount: new Prisma.Decimal(newPlanned),
          actualAmount: new Prisma.Decimal(newActual),
          paidAmount: new Prisma.Decimal(currentPaid),
          outstandingAmount: new Prisma.Decimal(newOutstanding),
          dueDate: input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : null) : payable.dueDate,
          status: newStatus,
          notes: updatedNotes,
        },
      });

      if (payable.tripOperationId && input.actualAmount !== undefined && Math.abs(input.actualAmount - currentActual) > 0.001) {
        try {
          await tx.operationEvent.create({
            data: {
              agencyId,
              tripOperationId: payable.tripOperationId,
              eventType: "SUPPLIER_PAYABLE_UPDATED",
              description: `Updated payable ${payable.payableNumber} (${payable.description}) amount from ₹${currentActual.toLocaleString("en-IN")} to ₹${newActual.toLocaleString("en-IN")}.${input.reason ? ` Reason: ${input.reason}` : ""}`,
              metadata: {
                payableId: payable.id,
                previousActualAmount: currentActual,
                newActualAmount: newActual,
                plannedAmount: Number(payable.plannedAmount),
                reason: input.reason,
                userId,
              },
              createdBy: userId,
            },
          });
        } catch {
          // Non-blocking
        }
      }

      return updated;
    });
  },

  /**
   * Delete / Soft-Cancel Payable (Preserves History)
   */
  async deleteSupplierPayable(
    agencyId: string,
    id: string,
    reason?: string,
    userId?: string
  ): Promise<{ success: boolean }> {
    const payable = await prisma.supplierPayable.findFirst({
      where: { id, agencyId, archivedAt: null },
      include: { payments: { where: { archivedAt: null } } },
    });
    if (!payable) throw new Error("Payable not found.");

    const targetOpOrBookingId = payable.tripOperationId || payable.bookingId;
    if (targetOpOrBookingId) {
      await this.verifyOperationNotFinalized(agencyId, targetOpOrBookingId);
    }

    if (payable.payments.length > 0) {
      throw new Error("Cannot delete a payable that has payments recorded. Please cancel or adjust the amount instead.");
    }

    const cancellationNote = reason ? ` [Cancelled: ${reason}]` : " [Cancelled]";
    const updatedNotes = payable.notes ? `${payable.notes}${cancellationNote}` : cancellationNote.trim();

    await prisma.supplierPayable.update({
      where: { id: payable.id },
      data: { archivedAt: new Date(), status: SupplierPayableStatus.CANCELLED, notes: updatedNotes },
    });

    if (payable.tripOperationId) {
      try {
        await prisma.operationEvent.create({
          data: {
            agencyId,
            tripOperationId: payable.tripOperationId,
            eventType: "SUPPLIER_PAYABLE_CANCELLED",
            description: `Cancelled payable ${payable.payableNumber} (${payable.description}). ${reason ? `Reason: ${reason}` : ""}`,
            metadata: {
              payableId: payable.id,
              payableNumber: payable.payableNumber,
              amount: Number(payable.actualAmount),
              reason,
            },
            createdBy: userId,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    return { success: true };
  },

  /**
   * Record Supplier / Payable Payment (Disbursement)
   */
  async recordSupplierPayment(
    agencyId: string,
    input: RecordSupplierPaymentInput,
    userId?: string
  ): Promise<SupplierPayment> {
    let supplierName: string | null = null;
    if (input.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: input.supplierId, agencyId, archivedAt: null },
      });
      if (supplier) {
        supplierName = supplier.name;
      }
    }

    let payable: (SupplierPayable & { supplier?: { name: string } | null }) | null = null;
    if (input.payableId) {
      payable = await prisma.supplierPayable.findFirst({
        where: { id: input.payableId, agencyId, archivedAt: null },
        include: { supplier: true },
      });
      if (!payable) throw new Error("Payable record not found.");
      if (payable.tripOperationId) {
        await this.verifyOperationNotFinalized(agencyId, payable.tripOperationId);
      }
      if (!supplierName) {
        supplierName = payable.supplier?.name || null;
      }
    }

    const resolvedPayee = input.payeeName || payable?.payeeName || supplierName || "Payee";

    // Idempotency check for supplier payment
    if (input.referenceNumber || input.idempotencyKey) {
      const existing = await prisma.supplierPayment.findFirst({
        where: {
          agencyId,
          archivedAt: null,
          ...(input.referenceNumber ? { referenceNumber: input.referenceNumber } : {}),
          ...(input.idempotencyKey
            ? { notes: { contains: `[idempotency:${input.idempotencyKey}]` } }
            : {}),
        },
      });
      if (existing) return existing;
    }

    const paymentNumber = await this.generateNextSupplierPaymentNumber(agencyId);

    const notesWithIdempotency = input.idempotencyKey
      ? `${input.notes || ""} [idempotency:${input.idempotencyKey}]`.trim()
      : input.notes;

    return prisma.$transaction(async (tx) => {
      let activePayable: SupplierPayable | null = payable;

      if (input.payableId) {
        // 1. Acquire row lock on SupplierPayable record to serialize concurrent disbursements
        await tx.$queryRaw`
          SELECT "id" FROM "supplier_payables" WHERE "id" = ${input.payableId} AND "agencyId" = ${agencyId} FOR UPDATE
        `;

        // 2. Fetch fresh supplier payable inside transaction to calculate real-time authoritative balance
        const freshPayable = await tx.supplierPayable.findFirst({
          where: { id: input.payableId, agencyId, archivedAt: null },
        });

        if (!freshPayable) {
          throw new Error("Payable record not found.");
        }
        activePayable = freshPayable;

        const actualAmt = Number(freshPayable.actualAmount);
        const paidAmt = Number(freshPayable.paidAmount);
        const currentOutstanding = Math.max(0, Math.round((actualAmt - paidAmt) * 100) / 100);
        const requestedAmount = Math.round(input.amount * 100) / 100;

        if (currentOutstanding <= 0) {
          throw new Error("Cannot record disbursement. The payable is already fully settled with ₹0.00 outstanding.");
        }

        if (requestedAmount > currentOutstanding) {
          const formattedReq = requestedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 });
          const formattedOut = currentOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 });
          throw new Error(
            `Payment amount cannot exceed the current outstanding payable of ₹${formattedOut}. (Requested: ₹${formattedReq})`
          );
        }
      }

      const payment = await tx.supplierPayment.create({
        data: {
          agencyId,
          supplierId: input.supplierId || activePayable?.supplierId || null,
          payeeName: resolvedPayee,
          payableId: input.payableId || null,
          bookingId: input.bookingId || activePayable?.bookingId || null,
          paymentNumber,
          amount: new Prisma.Decimal(input.amount),
          currency: input.currency || "INR",
          paymentMethod: input.paymentMethod,
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
          referenceNumber: input.referenceNumber,
          status: SupplierPaymentStatus.COMPLETED,
          notes: notesWithIdempotency,
          paidBy: input.paidBy,
        },
      });

      // If tied to payable, update payable balances and status
      if (activePayable) {
        const newPaid = Number(activePayable.paidAmount) + input.amount;
        const actualAmt = Number(activePayable.actualAmount);
        const newOutstanding = Math.max(0, Math.round((actualAmt - newPaid) * 100) / 100);

        let newStatus: SupplierPayableStatus = activePayable.status;
        if (newPaid >= actualAmt && actualAmt > 0) {
          newStatus = SupplierPayableStatus.PAID;
        } else if (newPaid > 0) {
          newStatus = SupplierPayableStatus.PARTIALLY_PAID;
        }

        await tx.supplierPayable.update({
          where: { id: activePayable.id },
          data: {
            paidAmount: new Prisma.Decimal(newPaid),
            outstandingAmount: new Prisma.Decimal(newOutstanding),
            status: newStatus,
          },
        });

        // If tied to an operation, log audit event
        if (activePayable.tripOperationId) {
          await tx.operationEvent.create({
            data: {
              agencyId,
              tripOperationId: activePayable.tripOperationId,
              eventType: "SUPPLIER_PAYMENT_RECORDED",
              description: `Disbursed payment ${paymentNumber} of ₹${input.amount.toLocaleString(
                "en-IN"
              )} to ${resolvedPayee}.`,
              metadata: {
                paymentId: payment.id,
                paymentNumber,
                payableId: activePayable.id,
                payeeName: resolvedPayee,
                amount: input.amount,
              },
              createdBy: userId,
            },
          });
        }
      }

      return payment;
    });
  },

  /**
   * Automatically generate service payables for a Booking from its Trip's hotels & vehicles.
   * Authoritative Costing: Reuses tripCostingService for exact RateSheet & snapshot resolution.
   * Strict Idempotency: Multiple invocations will not duplicate existing payables for the same service items.
   * Activities: Strictly remain non-priced (₹0) and are skipped.
   */
  async generateBookingServicePayables(
    agencyId: string,
    bookingId: string,
    txClient?: Prisma.TransactionClient
  ): Promise<SupplierPayable[]> {
    const db = txClient || prisma;
    const booking = await db.booking.findFirst({
      where: { id: bookingId, agencyId, archivedAt: null },
      include: {
        trip: {
          include: {
            tripHotels: {
              include: { hotel: true },
            },
            tripVehicles: {
              include: { vehicle: true },
            },
          },
        },
      },
    });

    if (!booking || !booking.trip) {
      return [];
    }

    // Authoritative Costing Calculation
    let costing = null;
    try {
      costing = await tripCostingService.calculateTripCosting(agencyId, booking.tripId);
    } catch {
      // Fallback if trip costing calculation fails
    }

    const createdPayables: SupplierPayable[] = [];

    // 1. Hotel Service Payables
    for (const th of booking.trip.tripHotels) {
      const checkInTime = new Date(th.checkIn).getTime();
      const checkOutTime = new Date(th.checkOut).getTime();
      const diffDays = Math.max(1, Math.ceil((checkOutTime - checkInTime) / (1000 * 60 * 60 * 24)));
      const rooms = th.rooms || 1;

      // Authoritative cost lookup from costing service
      const matchedHotelCost = costing?.hotels.find((h) => h.id === th.id);
      let cost = matchedHotelCost ? matchedHotelCost.totalCost : 0;

      // Fallback to snapshot
      if (cost === 0) {
        cost = th.totalAmount ? Number(th.totalAmount) : 0;
      }
      if (cost === 0 && th.nightlyRate) {
        cost = Number(th.nightlyRate) * rooms * diffDays;
      }

      if (cost > 0) {
        // Strict Idempotency Check
        const existing = await db.supplierPayable.findFirst({
          where: {
            agencyId,
            bookingId: booking.id,
            serviceReferenceId: th.id,
            archivedAt: null,
          },
        });

        if (!existing) {
          const payableNumber = await this.generateNextPayableNumber(agencyId);
          const hotelName = matchedHotelCost?.hotelName || th.hotel?.name || "Hotel Provider";
          const desc = `Hotel: ${hotelName} (${th.roomType || "Room"}, ${diffDays} night(s), ${rooms} room(s))`;

          const p = await db.supplierPayable.create({
            data: {
              agencyId,
              bookingId: booking.id,
              tripId: booking.tripId,
              supplierId: th.hotel?.supplierId || null,
              payeeName: hotelName,
              origin: "AUTOMATIC",
              serviceType: "HOTEL",
              serviceReferenceId: th.id,
              description: desc,
              payableNumber,
              currency: booking.currency || "INR",
              plannedAmount: new Prisma.Decimal(cost),
              actualAmount: new Prisma.Decimal(cost),
              paidAmount: new Prisma.Decimal(0),
              outstandingAmount: new Prisma.Decimal(cost),
              dueDate: th.checkIn ? new Date(th.checkIn) : null,
              status: SupplierPayableStatus.PENDING,
            },
          });
          createdPayables.push(p);
        }
      }
    }

    // 2. Vehicle Service Payables
    for (const tv of booking.trip.tripVehicles) {
      // Authoritative cost lookup from costing service
      const matchedVehicleCost = costing?.vehicles.find((v) => v.id === tv.id);
      let cost = matchedVehicleCost ? matchedVehicleCost.totalCost : 0;

      // Fallback to snapshot
      if (cost === 0) {
        cost = tv.totalRate ? Number(tv.totalRate) : 0;
      }
      if (cost === 0 && tv.ratePerKm && tv.estimatedKm) {
        cost = Number(tv.ratePerKm) * Number(tv.estimatedKm);
      }

      if (cost > 0) {
        // Strict Idempotency Check
        const existing = await db.supplierPayable.findFirst({
          where: {
            agencyId,
            bookingId: booking.id,
            serviceReferenceId: tv.id,
            archivedAt: null,
          },
        });

        if (!existing) {
          const payableNumber = await this.generateNextPayableNumber(agencyId);
          const vehicleName = matchedVehicleCost?.vehicleName || tv.vehicle?.name || tv.vehicleType || "Vehicle Provider";
          const desc = `Vehicle: ${vehicleName} (${tv.pricingType || "Standard"})`;

          const p = await db.supplierPayable.create({
            data: {
              agencyId,
              bookingId: booking.id,
              tripId: booking.tripId,
              supplierId: tv.vehicle?.supplierId || null,
              payeeName: vehicleName,
              origin: "AUTOMATIC",
              serviceType: "VEHICLE",
              serviceReferenceId: tv.id,
              description: desc,
              payableNumber,
              currency: booking.currency || "INR",
              plannedAmount: new Prisma.Decimal(cost),
              actualAmount: new Prisma.Decimal(cost),
              paidAmount: new Prisma.Decimal(0),
              outstandingAmount: new Prisma.Decimal(cost),
              dueDate: tv.startDate ? new Date(tv.startDate) : (booking.travelStartDate || null),
              status: SupplierPayableStatus.PENDING,
            },
          });
          createdPayables.push(p);
        }
      }
    }

    // 3. Activities: Strictly ₹0, skipped.

    return createdPayables;
  },

  // ═════════════════════════════════════════════════════════════════════
  // OPERATIONAL EXPENSES WORKFLOWS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Record Operational Expense
   */
  async createExpense(
    agencyId: string,
    input: CreateExpenseInput,
    userId?: string
  ): Promise<OperationalExpense> {
    if (input.bookingId) {
      const booking = await prisma.booking.findFirst({
        where: { id: input.bookingId, agencyId, archivedAt: null },
      });
      if (!booking) throw new Error("Booking not found or does not belong to your agency.");
    }

    if (input.tripOperationId) {
      const operation = await prisma.tripOperation.findFirst({
        where: { id: input.tripOperationId, agencyId },
      });
      if (!operation) throw new Error("Trip operation not found or does not belong to your agency.");
      await this.verifyOperationNotFinalized(agencyId, input.tripOperationId);
    }

    if (input.tripId) {
      const trip = await prisma.trip.findFirst({
        where: { id: input.tripId, agencyId, archivedAt: null },
      });
      if (!trip) throw new Error("Trip not found or does not belong to your agency.");
    }

    const expenseNumber = await this.generateNextExpenseNumber(agencyId);

    const expense = await prisma.operationalExpense.create({
      data: {
        agencyId,
        tripOperationId: input.tripOperationId,
        tripId: input.tripId,
        bookingId: input.bookingId,
        expenseNumber,
        category: input.category,
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency || "INR",
        expenseDate: input.expenseDate ? new Date(input.expenseDate) : new Date(),
        description: input.description,
        receiptNumber: input.receiptNumber,
        receiptUrl: input.receiptUrl,
        paidBy: input.paidBy,
        createdBy: userId,
      },
    });

    if (input.tripOperationId) {
      await prisma.operationEvent.create({
        data: {
          agencyId,
          tripOperationId: input.tripOperationId,
          eventType: "EXPENSE_CREATED",
          description: `Logged ${input.category} expense of ₹${input.amount.toLocaleString("en-IN")}: ${
            input.description
          }`,
          metadata: {
            expenseId: expense.id,
            expenseNumber,
            category: input.category,
            amount: input.amount,
          },
          createdBy: userId,
        },
      });
    }

    return expense;
  },

  /**
   * Update Operational Expense
   */
  async updateExpense(
    agencyId: string,
    expenseId: string,
    input: UpdateExpenseInput,
    userId?: string
  ): Promise<OperationalExpense> {
    void userId;
    const expense = await prisma.operationalExpense.findFirst({
      where: { id: expenseId, agencyId, archivedAt: null },
    });
    if (!expense) throw new Error("Expense not found.");

    if (expense.tripOperationId) {
      await this.verifyOperationNotFinalized(agencyId, expense.tripOperationId);
    }

    const updateData: Prisma.OperationalExpenseUpdateInput = {};
    if (input.category !== undefined) updateData.category = input.category;
    if (input.amount !== undefined) updateData.amount = new Prisma.Decimal(input.amount);
    if (input.expenseDate !== undefined) updateData.expenseDate = new Date(input.expenseDate);
    if (input.description !== undefined) updateData.description = input.description;
    if (input.receiptNumber !== undefined) updateData.receiptNumber = input.receiptNumber;
    if (input.receiptUrl !== undefined) updateData.receiptUrl = input.receiptUrl;
    if (input.paidBy !== undefined) updateData.paidBy = input.paidBy;

    return prisma.operationalExpense.update({
      where: { id: expenseId },
      data: updateData,
    });
  },

  /**
   * Delete / Archive Operational Expense
   */
  async deleteExpense(agencyId: string, expenseId: string, userId?: string): Promise<OperationalExpense> {
    void userId;
    const expense = await prisma.operationalExpense.findFirst({
      where: { id: expenseId, agencyId, archivedAt: null },
    });
    if (!expense) throw new Error("Expense not found.");

    if (expense.tripOperationId) {
      await this.verifyOperationNotFinalized(agencyId, expense.tripOperationId);
    }

    return prisma.operationalExpense.update({
      where: { id: expenseId },
      data: { archivedAt: new Date() },
    });
  },

  // ═════════════════════════════════════════════════════════════════════
  // UNIFIED TRANSACTIONS LEDGER
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Get paginated unified transaction list
   */
  async getTransactions(
    agencyId: string,
    query: TransactionQueryInput
  ): Promise<{ data: UnifiedTransactionItem[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const { page = 1, limit = 20, type = "ALL", paymentMethod, search, startDate, endDate, sortBy = "date", sortOrder = "desc" } = query;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    if (end) end.setHours(23, 59, 59, 999);

    const items: UnifiedTransactionItem[] = [];

    // 1. Customer Payments & Refunds
    if (type === "ALL" || type === "CUSTOMER_PAYMENT" || type === "CUSTOMER_REFUND") {
      const payments = await prisma.payment.findMany({
        where: {
          agencyId,
          archivedAt: null,
          ...(paymentMethod ? { paymentMethod } : {}),
          ...(start && end ? { paymentDate: { gte: start, lte: end } } : {}),
        },
        include: {
          customer: { select: { name: true } },
          booking: { select: { id: true, bookingNumber: true, trip: { select: { id: true, title: true } } } },
        },
        orderBy: { paymentDate: "desc" },
      });

      for (const p of payments) {
        const netPaid = Number(p.amount);
        const refunded = Number(p.refundedAmount || 0);

        if (type !== "CUSTOMER_REFUND") {
          items.push({
            id: p.id,
            transactionNumber: p.paymentNumber,
            type: "CUSTOMER_PAYMENT",
            category: p.paymentType,
            date: p.paymentDate.toISOString(),
            amount: netPaid,
            currency: p.currency,
            paymentMethod: p.paymentMethod,
            status: p.status,
            referenceNumber: p.referenceNumber,
            partyName: p.customer?.name || "Customer",
            partyType: "CUSTOMER",
            bookingId: p.booking?.id,
            bookingNumber: p.booking?.bookingNumber,
            tripId: p.booking?.trip?.id,
            tripTitle: p.booking?.trip?.title,
            description: p.notes,
          });
        }

        if ((type === "ALL" || type === "CUSTOMER_REFUND") && refunded > 0) {
          items.push({
            id: `${p.id}-refund`,
            transactionNumber: `${p.paymentNumber}-REF`,
            type: "CUSTOMER_REFUND",
            category: "REFUND",
            date: (p.refundedAt || p.paymentDate).toISOString(),
            amount: refunded,
            currency: p.currency,
            paymentMethod: p.paymentMethod,
            status: "REFUNDED",
            referenceNumber: p.referenceNumber,
            partyName: p.customer?.name || "Customer",
            partyType: "CUSTOMER",
            bookingId: p.booking?.id,
            bookingNumber: p.booking?.bookingNumber,
            tripId: p.booking?.trip?.id,
            tripTitle: p.booking?.trip?.title,
            description: `Refund on payment ${p.paymentNumber}`,
          });
        }
      }
    }

    // 2. Supplier Disbursements
    if (type === "ALL" || type === "SUPPLIER_PAYMENT") {
      const supplierPayments = await prisma.supplierPayment.findMany({
        where: {
          agencyId,
          archivedAt: null,
          ...(paymentMethod ? { paymentMethod } : {}),
          ...(start && end ? { paymentDate: { gte: start, lte: end } } : {}),
        },
        include: {
          supplier: { select: { name: true } },
          payable: { select: { id: true, payableNumber: true, payeeName: true, description: true } },
          booking: { select: { id: true, bookingNumber: true, trip: { select: { id: true, title: true } } } },
        },
        orderBy: { paymentDate: "desc" },
      });

      for (const sp of supplierPayments) {
        const partyName = sp.payeeName || sp.payable?.payeeName || sp.supplier?.name || "Payee";
        items.push({
          id: sp.id,
          transactionNumber: sp.paymentNumber,
          type: "SUPPLIER_PAYMENT",
          category: "SUPPLIER_DISBURSEMENT",
          date: sp.paymentDate.toISOString(),
          amount: Number(sp.amount),
          currency: sp.currency,
          paymentMethod: sp.paymentMethod,
          status: sp.status,
          referenceNumber: sp.referenceNumber,
          partyName,
          partyType: "SUPPLIER",
          bookingId: sp.booking?.id,
          bookingNumber: sp.booking?.bookingNumber,
          tripId: sp.booking?.trip?.id,
          tripTitle: sp.booking?.trip?.title,
          description: sp.notes || sp.payable?.description || "Payable disbursement",
        });
      }
    }

    // 3. Operational Expenses
    if (type === "ALL" || type === "EXPENSE") {
      const expenses = await prisma.operationalExpense.findMany({
        where: {
          agencyId,
          archivedAt: null,
          ...(start && end ? { expenseDate: { gte: start, lte: end } } : {}),
        },
        include: {
          trip: { select: { id: true, title: true } },
          booking: { select: { id: true, bookingNumber: true } },
        },
        orderBy: { expenseDate: "desc" },
      });

      for (const exp of expenses) {
        items.push({
          id: exp.id,
          transactionNumber: exp.expenseNumber,
          type: "EXPENSE",
          category: exp.category,
          date: exp.expenseDate.toISOString(),
          amount: Number(exp.amount),
          currency: exp.currency,
          paymentMethod: "CASH_OR_DIRECT",
          status: "RECORDED",
          referenceNumber: exp.receiptNumber,
          partyName: exp.paidBy || "Operations Team",
          partyType: "INTERNAL",
          bookingId: exp.booking?.id,
          bookingNumber: exp.booking?.bookingNumber,
          tripId: exp.trip?.id,
          tripTitle: exp.trip?.title,
          description: exp.description,
        });
      }
    }

    // Search filter
    let filtered = items;
    if (search) {
      const s = search.toLowerCase();
      filtered = items.filter(
        (i) =>
          i.transactionNumber.toLowerCase().includes(s) ||
          i.partyName.toLowerCase().includes(s) ||
          (i.bookingNumber && i.bookingNumber.toLowerCase().includes(s)) ||
          (i.tripTitle && i.tripTitle.toLowerCase().includes(s)) ||
          (i.referenceNumber && i.referenceNumber.toLowerCase().includes(s)) ||
          (i.description && i.description.toLowerCase().includes(s))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "amount") {
        return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount;
      }
      return sortOrder === "asc"
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const data = filtered.slice(skip, skip + limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // EXECUTIVE FINANCE DASHBOARD SUMMARY
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Generate Executive Finance Dashboard KPIs, Profitability, and Balances
   */
  async getFinanceDashboard(
    agencyId: string,
    filters: FinanceFilterInput = { preset: "LAST_30_DAYS" }
  ): Promise<FinanceDashboardResult> {
    const { start, end, preset } = calculateDateRange(filters.preset, filters.startDate, filters.endDate);

    // 1. Fetch Bookings in date range
    const bookings = await prisma.booking.findMany({
      where: {
        agencyId,
        archivedAt: null,
        status: { not: BookingStatus.CANCELLED },
        createdAt: { gte: start, lte: end },
      },
      include: {
        customer: true,
        trip: true,
        payments: { where: { archivedAt: null }, select: PAYMENT_SCALAR_SELECT },
        supplierPayables: { where: { archivedAt: null } },
        supplierPayments: { where: { archivedAt: null } },
        expenses: { where: { archivedAt: null } },
      },
    });

    // 2. Fetch all agency payments, payables, and expenses in range
    const [allPayments, allPayables, allSupplierPayments, allExpenses] = await Promise.all([
      prisma.payment.findMany({
        where: {
          agencyId,
          archivedAt: null,
          paymentDate: { gte: start, lte: end },
        },
        select: PAYMENT_SCALAR_SELECT,
      }),
      prisma.supplierPayable.findMany({
        where: {
          agencyId,
          archivedAt: null,
          createdAt: { gte: start, lte: end },
        },
        include: { supplier: true, trip: true, booking: true },
      }),
      prisma.supplierPayment.findMany({
        where: {
          agencyId,
          archivedAt: null,
          paymentDate: { gte: start, lte: end },
        },
      }),
      prisma.operationalExpense.findMany({
        where: {
          agencyId,
          archivedAt: null,
          expenseDate: { gte: start, lte: end },
        },
      }),
    ]);

    // 3. Compute Executive KPIs
    let totalSales = 0;
    let confirmedBookingValue = 0;
    let fullyPaidCount = 0;
    let partiallyPaidCount = 0;
    let unpaidCount = 0;

    const customerReceivablesItems: CustomerOutstandingItem[] = [];

    for (const b of bookings) {
      const bTotal = Number(b.totalAmount);
      const bPaid = Number(b.paidAmount);
      const bBalance = Number(b.balanceAmount);

      totalSales += bTotal;
      if (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED || b.status === BookingStatus.ONGOING) {
        confirmedBookingValue += bTotal;
      }

      if (b.paymentStatus === BookingPaymentStatus.PAID) fullyPaidCount++;
      else if (b.paymentStatus === BookingPaymentStatus.PARTIALLY_PAID) partiallyPaidCount++;
      else unpaidCount++;

      if (bBalance > 0) {
        const isOverdue = b.travelStartDate ? new Date(b.travelStartDate).getTime() < Date.now() : false;
        customerReceivablesItems.push({
          bookingId: b.id,
          bookingNumber: b.bookingNumber,
          tripNumber: b.trip?.tripNumber || "N/A",
          tripTitle: b.trip?.title || "Tour Itinerary",
          customerName: b.customer?.name || "Customer",
          customerPhone: b.customer?.phone || "N/A",
          customerEmail: b.customer?.email,
          travelStartDate: b.travelStartDate ? b.travelStartDate.toISOString() : null,
          totalAmount: bTotal,
          paidAmount: bPaid,
          outstandingAmount: bBalance,
          paymentStatus: b.paymentStatus,
          isOverdue,
        });
      }
    }

    // Customer payments
    let amountReceived = 0;
    let customerRefunded = 0;
    for (const p of allPayments) {
      if (p.status === PaymentStatus.COMPLETED || p.status === PaymentStatus.REFUNDED) {
        amountReceived += Number(p.amount);
        customerRefunded += Number(p.refundedAmount || 0);
      }
    }
    const netReceived = Math.max(0, amountReceived - customerRefunded);
    const customerOutstanding = customerReceivablesItems.reduce((sum, item) => sum + item.outstandingAmount, 0);

    // Supplier payables & disbursements
    let supplierPayable = 0;
    let supplierPaid = 0;

    const supplierPayableItems: SupplierOutstandingItem[] = [];

    for (const sp of allPayables) {
      const actual = Number(sp.actualAmount);
      const paid = Number(sp.paidAmount);
      const outstanding = Number(sp.outstandingAmount);
      const overpaid = Math.max(0, paid - actual);

      supplierPayable += actual;
      supplierPaid += paid;

      if (outstanding > 0 || sp.status !== SupplierPayableStatus.PAID) {
        const isOverdue = sp.dueDate && sp.status !== SupplierPayableStatus.CANCELLED
          ? new Date(sp.dueDate).getTime() < Date.now() && outstanding > 0
          : false;
        const resolvedName = sp.payeeName || sp.supplier?.name || "Payee";
        supplierPayableItems.push({
          payableId: sp.id,
          payableNumber: sp.payableNumber,
          supplierId: sp.supplierId,
          supplierName: resolvedName,
          supplierType: sp.supplier?.type || sp.serviceType || "General Supplier",
          payeeName: resolvedName,
          origin: sp.origin || "AUTOMATIC",
          description: sp.description,
          serviceType: sp.serviceType,
          tripId: sp.tripId,
          tripNumber: sp.trip?.tripNumber || "N/A",
          tripTitle: sp.trip?.title,
          bookingId: sp.bookingId,
          bookingNumber: sp.booking?.bookingNumber,
          plannedAmount: Number(sp.plannedAmount),
          actualAmount: actual,
          paidAmount: paid,
          outstandingAmount: outstanding,
          overpaidAmount: overpaid,
          dueDate: sp.dueDate ? sp.dueDate.toISOString() : null,
          status: sp.status,
          isOverdue,
        });
      }
    }

    // Also include direct supplier payments in total supplier paid if any exist without payable
    for (const sp of allSupplierPayments) {
      if (!sp.payableId && sp.status === SupplierPaymentStatus.COMPLETED) {
        supplierPaid += Number(sp.amount);
      }
    }

    const supplierOutstanding = Math.max(0, supplierPayable - supplierPaid);

    // Operational expenses
    let operationalExpenses = 0;
    for (const exp of allExpenses) {
      operationalExpenses += Number(exp.amount);
    }

    // Profitability metrics
    const grossProfit = totalSales - supplierPayable - operationalExpenses;
    const profitMarginPercent =
      totalSales > 0 ? Math.round((grossProfit / totalSales) * 100 * 10) / 10 : 0;
    const netCashPosition = netReceived - supplierPaid - operationalExpenses;

    // Overdue calculations
    const overdueCustomerReceivables = customerReceivablesItems.filter((i) => i.isOverdue);
    const totalOverdueReceivables = overdueCustomerReceivables.reduce((sum, i) => sum + i.outstandingAmount, 0);

    const overdueSupplierPayables = supplierPayableItems.filter((i) => i.isOverdue);
    const totalOverduePayables = overdueSupplierPayables.reduce((sum, i) => sum + i.outstandingAmount, 0);

    // Recent transactions (latest 10)
    const recentTx = await this.getTransactions(agencyId, {
      page: 1,
      limit: 10,
      type: "ALL",
      sortBy: "date",
      sortOrder: "desc",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    return {
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
        preset,
      },
      kpis: {
        totalSales,
        confirmedBookingValue,
        amountReceived: netReceived,
        customerOutstanding,
        customerRefunded,
        supplierPayable,
        supplierPaid,
        supplierOutstanding,
        operationalExpenses,
        grossProfit,
        profitMarginPercent,
        netCashPosition,
        totalBookingsCount: bookings.length,
        fullyPaidBookingsCount: fullyPaidCount,
        partiallyPaidBookingsCount: partiallyPaidCount,
        unpaidBookingsCount: unpaidCount,
      },
      profitability: {
        revenue: totalSales,
        supplierCost: supplierPayable,
        operationalExpenses,
        grossProfit,
        profitMarginPercent,
        netCashPosition,
      },
      customerReceivables: {
        totalOutstanding: customerOutstanding,
        overdueCount: overdueCustomerReceivables.length,
        overdueAmount: totalOverdueReceivables,
        items: customerReceivablesItems.slice(0, 10),
      },
      supplierPayables: {
        totalOutstanding: supplierOutstanding,
        overdueCount: overdueSupplierPayables.length,
        overdueAmount: totalOverduePayables,
        items: supplierPayableItems.slice(0, 10),
      },
      recentTransactions: recentTx.data,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // BOOKING-LEVEL FINANCE BREAKDOWN
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Get complete financial breakdown for a single Booking
   */
  async getBookingFinanceBreakdown(
    agencyId: string,
    bookingId: string
  ): Promise<BookingFinanceBreakdown> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId, archivedAt: null },
      include: {
        customer: true,
        trip: true,
        quotation: {
          select: {
            id: true,
            quotationNumber: true,
            finalAmount: true,
            subtotal: true,
          },
        },
        invoices: {
          where: { archivedAt: null, status: { not: InvoiceStatus.CANCELLED } },
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            status: true,
            dueDate: true,
          },
        },
        tripOperation: {
          include: {
            events: {
              where: { eventType: { in: ["OPERATION_FINALIZED", "OPERATION_REOPENED"] } },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "desc" },
          select: PAYMENT_SCALAR_SELECT,
        },
        supplierPayables: {
          where: { archivedAt: null },
          include: { supplier: { select: { name: true, type: true } } },
          orderBy: { createdAt: "desc" },
        },
        supplierPayments: {
          where: { archivedAt: null },
          include: { supplier: { select: { name: true } } },
          orderBy: { paymentDate: "desc" },
        },
        expenses: {
          where: { archivedAt: null },
          orderBy: { expenseDate: "desc" },
        },
      },
    });

    if (!booking) {
      throw new Error("Booking not found.");
    }

    const isFinalized =
      booking.tripOperation?.events[0]?.eventType === "OPERATION_FINALIZED";

    const totalBookingAmount = Number(booking.totalAmount);
    const quotedAmount = booking.quotation
      ? Number(booking.quotation.finalAmount ?? booking.quotation.subtotal)
      : totalBookingAmount;
    const invoicedAmount = booking.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

    let customerPaid = 0;
    let customerRefunded = 0;

    for (const p of booking.payments) {
      if (p.status === PaymentStatus.COMPLETED || p.status === PaymentStatus.REFUNDED) {
        customerPaid += Number(p.amount);
        customerRefunded += Number(p.refundedAmount || 0);
      }
    }
    const netReceived = Math.max(0, customerPaid - customerRefunded);
    const customerOutstanding = Math.max(0, totalBookingAmount - netReceived);

    // Fetch live booking payment schedule with waterfall milestone allocation
    const schedule = await this.getBookingPaymentSchedule(agencyId, bookingId);

    let supplierCostPlanned = 0;
    let supplierCostActual = 0;
    let supplierPaid = 0;

    for (const sp of booking.supplierPayables) {
      supplierCostPlanned += Number(sp.plannedAmount);
      supplierCostActual += Number(sp.actualAmount);
      supplierPaid += Number(sp.paidAmount);
    }

    // Direct supplier payments if any
    for (const sp of booking.supplierPayments) {
      if (!sp.payableId && sp.status === SupplierPaymentStatus.COMPLETED) {
        supplierPaid += Number(sp.amount);
      }
    }

    const supplierOutstanding = Math.max(0, supplierCostActual - supplierPaid);

    let operationalExpenses = 0;
    for (const exp of booking.expenses) {
      operationalExpenses += Number(exp.amount);
    }

    const grossMargin = totalBookingAmount - supplierCostActual - operationalExpenses;
    const grossProfit = grossMargin;
    const profitMarginPercent =
      totalBookingAmount > 0 ? Math.round((grossProfit / totalBookingAmount) * 100 * 10) / 10 : 0;
    const netCashPosition = netReceived - supplierPaid - operationalExpenses;

    const hasRecordedPayables = booking.supplierPayables.length > 0;
    const hasUnconfirmedPayables = booking.supplierPayables.some(
      (sp) => sp.status === SupplierPayableStatus.PENDING
    );

    let isCostComplete = false;
    let costCompletenessReason = "Supplier costs unrecorded or incomplete.";

    if (!hasRecordedPayables) {
      isCostComplete = false;
      costCompletenessReason = "No supplier payables recorded. Gross margin is unverified.";
    } else if (hasUnconfirmedPayables) {
      isCostComplete = false;
      costCompletenessReason = "Contains unconfirmed or disputed supplier obligations. Gross margin is estimated.";
    } else if (!isFinalized) {
      isCostComplete = false;
      costCompletenessReason = "Trip operation not finalized. Pre-closure margin is estimated based on recorded obligations.";
    } else {
      isCostComplete = true;
      costCompletenessReason = "Operation finalized and audited. Recorded supplier obligations are definitive.";
    }

    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      tripId: booking.tripId,
      tripNumber: booking.trip?.tripNumber || "N/A",
      tripTitle: booking.trip?.title || "Tour Itinerary",
      customerName: booking.customer?.name || "Customer",
      quotedAmount,
      totalBookingAmount,
      invoicedAmount,
      customerPaid: netReceived,
      customerRefunded,
      customerOutstanding,
      paymentStatus: booking.paymentStatus,
      paymentSchedule: schedule.milestones,
      totalMilestonesPlanned: schedule.totalMilestonesPlanned,
      totalMilestonesAllocated: schedule.totalMilestonesAllocated,
      overdueMilestonesCount: schedule.overdueMilestonesCount,
      overdueMilestonesAmount: schedule.overdueMilestonesAmount,
      supplierCostPlanned,
      supplierCostActual,
      supplierPaid,
      supplierOutstanding,
      operationalExpenses,
      grossMargin,
      grossProfit,
      profitMarginPercent,
      netCashPosition,
      isCostComplete,
      costCompletenessReason,
      isFinalized,
      customerPayments: booking.payments,
      supplierPayables: booking.supplierPayables,
      supplierPayments: booking.supplierPayments,
      expenses: booking.expenses,
      invoices: booking.invoices,
    };
  },

  /**
   * Get payment milestone schedule and waterfall allocation for a Booking
   */
  async getBookingPaymentSchedule(
    agencyId: string,
    bookingId: string
  ): Promise<BookingPaymentScheduleResult> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, agencyId, archivedAt: null },
      include: {
        quotation: {
          include: {
            paymentMilestones: { orderBy: { sortOrder: "asc" } },
          },
        },
        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "asc" },
          select: PAYMENT_SCALAR_SELECT,
        },
      },
    });

    if (!booking) {
      throw new Error("Booking not found.");
    }

    const totalBookingAmount = Number(booking.totalAmount);
    let netReceivedAmount = 0;

    for (const p of booking.payments) {
      if (p.status === PaymentStatus.COMPLETED || p.status === PaymentStatus.REFUNDED) {
        netReceivedAmount += Number(p.amount) - Number(p.refundedAmount || 0);
      }
    }
    netReceivedAmount = Math.max(0, netReceivedAmount);
    const outstandingBalance = Math.max(0, totalBookingAmount - netReceivedAmount);

    const rawMilestones = (booking.quotation?.paymentMilestones || []).map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      percentage: m.percentage ? Number(m.percentage) : null,
      amount: m.amount ? Number(m.amount) : null,
      dueDate: m.dueDate,
      sortOrder: m.sortOrder,
    }));

    // If no quotation milestones exist, do NOT invent or persist an artificial 30/70 schedule.
    // The UI gracefully handles empty milestones by displaying standard booking terms.


    // Process deterministic waterfall allocation across milestones
    let remainingNetPaid = netReceivedAmount;
    const now = new Date();
    const milestoneItems: BookingPaymentMilestoneScheduleItem[] = [];

    let totalMilestonesPlanned = 0;
    let totalMilestonesAllocated = 0;
    let overdueMilestonesCount = 0;
    let overdueMilestonesAmount = 0;

    for (let i = 0; i < rawMilestones.length; i++) {
      const m = rawMilestones[i];
      let plannedAmount = m.amount ? m.amount : 0;
      if (plannedAmount === 0 && m.percentage) {
        plannedAmount = (m.percentage / 100) * totalBookingAmount;
      }
      plannedAmount = Math.round(plannedAmount * 100) / 100;
      totalMilestonesPlanned += plannedAmount;

      const allocated = Math.min(plannedAmount, Math.max(0, remainingNetPaid));
      remainingNetPaid = Math.max(0, remainingNetPaid - allocated);
      const remainingMilestone = Math.max(0, plannedAmount - allocated);
      totalMilestonesAllocated += allocated;

      let status: "PENDING" | "PARTIALLY_PAID" | "PAID" = "PENDING";
      if (allocated >= plannedAmount && plannedAmount > 0) {
        status = "PAID";
      } else if (allocated > 0) {
        status = "PARTIALLY_PAID";
      }

      const isOverdue = Boolean(m.dueDate && new Date(m.dueDate) < now && remainingMilestone > 0);
      if (isOverdue) {
        overdueMilestonesCount++;
        overdueMilestonesAmount += remainingMilestone;
      }

      const percentage = m.percentage
        ? m.percentage
        : totalBookingAmount > 0
        ? Math.round((plannedAmount / totalBookingAmount) * 100 * 10) / 10
        : 0;

      milestoneItems.push({
        id: m.id,
        title: m.title,
        percentage,
        plannedAmount,
        allocatedAmount: allocated,
        remainingAmount: remainingMilestone,
        dueDate: m.dueDate ? new Date(m.dueDate).toISOString() : null,
        status,
        isOverdue,
      });
    }

    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      totalBookingAmount,
      netReceivedAmount,
      outstandingBalance,
      paymentStatus: booking.paymentStatus,
      milestones: milestoneItems,
      totalMilestonesPlanned,
      totalMilestonesAllocated,
      overdueMilestonesCount,
      overdueMilestonesAmount,
    };
  },

  // ═════════════════════════════════════════════════════════════════════
  // CSV EXPORT GENERATOR
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Generate sanitized financial CSV export
   */
  async generateFinanceCsv(agencyId: string, filters: FinanceFilterInput = { preset: "LAST_30_DAYS" }): Promise<string> {
    const dashboard = await this.getFinanceDashboard(agencyId, filters);

    const escape = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows: string[] = [];

    rows.push(escape("YOUR TRAVEL DESK FINANCE & PROFITABILITY REPORT"));
    rows.push(escape(`Date Range: ${dashboard.dateRange.start.slice(0, 10)} to ${dashboard.dateRange.end.slice(0, 10)} (${dashboard.dateRange.preset})`));
    rows.push(escape(`Generated At: ${new Date().toISOString()}`));
    rows.push("");

    // Section 1: Executive KPIs
    rows.push(escape("=== EXECUTIVE FINANCIAL SUMMARY ==="));
    rows.push([
      escape("Metric"),
      escape("Amount (INR)"),
    ].join(","));
    rows.push([escape("Total Sales / Revenue"), escape(dashboard.kpis.totalSales)].join(","));
    rows.push([escape("Amount Received (Net)"), escape(dashboard.kpis.amountReceived)].join(","));
    rows.push([escape("Customer Outstanding"), escape(dashboard.kpis.customerOutstanding)].join(","));
    rows.push([escape("Supplier Payable"), escape(dashboard.kpis.supplierPayable)].join(","));
    rows.push([escape("Supplier Paid"), escape(dashboard.kpis.supplierPaid)].join(","));
    rows.push([escape("Supplier Outstanding"), escape(dashboard.kpis.supplierOutstanding)].join(","));
    rows.push([escape("Operational Expenses"), escape(dashboard.kpis.operationalExpenses)].join(","));
    rows.push([escape("Gross Profit"), escape(dashboard.kpis.grossProfit)].join(","));
    rows.push([escape("Profit Margin %"), escape(`${dashboard.kpis.profitMarginPercent}%`)].join(","));
    rows.push([escape("Net Cash Position"), escape(dashboard.kpis.netCashPosition)].join(","));
    rows.push("");

    // Section 2: Customer Receivables
    rows.push(escape("=== CUSTOMER RECEIVABLES ==="));
    rows.push([
      escape("Booking Number"),
      escape("Customer Name"),
      escape("Phone"),
      escape("Total Value"),
      escape("Paid Amount"),
      escape("Outstanding Amount"),
      escape("Status"),
      escape("Overdue"),
    ].join(","));

    for (const cr of dashboard.customerReceivables.items) {
      rows.push([
        escape(cr.bookingNumber),
        escape(cr.customerName),
        escape(cr.customerPhone),
        escape(cr.totalAmount),
        escape(cr.paidAmount),
        escape(cr.outstandingAmount),
        escape(cr.paymentStatus),
        escape(cr.isOverdue ? "YES" : "NO"),
      ].join(","));
    }
    rows.push("");

    // Section 3: Supplier Payables
    rows.push(escape("=== SUPPLIER PAYABLES ==="));
    rows.push([
      escape("Payable Number"),
      escape("Supplier Name"),
      escape("Category"),
      escape("Description"),
      escape("Actual Amount"),
      escape("Paid Amount"),
      escape("Outstanding"),
      escape("Status"),
      escape("Due Date"),
    ].join(","));

    for (const sp of dashboard.supplierPayables.items) {
      rows.push([
        escape(sp.payableNumber),
        escape(sp.supplierName),
        escape(sp.serviceType),
        escape(sp.description),
        escape(sp.actualAmount),
        escape(sp.paidAmount),
        escape(sp.outstandingAmount),
        escape(sp.status),
        escape(sp.dueDate ? sp.dueDate.slice(0, 10) : "N/A"),
      ].join(","));
    }
    rows.push("");

    // Section 4: Transactions Ledger
    rows.push(escape("=== TRANSACTIONS LEDGER ==="));
    rows.push([
      escape("Transaction #"),
      escape("Type"),
      escape("Party Name"),
      escape("Booking / Reference"),
      escape("Payment Method"),
      escape("Date"),
      escape("Amount"),
      escape("Status"),
    ].join(","));

    for (const tx of dashboard.recentTransactions) {
      rows.push([
        escape(tx.transactionNumber),
        escape(tx.type),
        escape(tx.partyName),
        escape(tx.bookingNumber || tx.referenceNumber || "N/A"),
        escape(tx.paymentMethod || "Direct"),
        escape(tx.date ? tx.date.slice(0, 10) : ""),
        escape(tx.amount),
        escape(tx.status),
      ].join(","));
    }

    return rows.join("\n");
  },
};
