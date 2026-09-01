import "server-only";
import prisma from "@/lib/prisma";
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  SupplierPayable,
  SupplierPayableStatus,
  SupplierPayment,
  SupplierPaymentStatus,
  OperationalExpense,
  ExpenseCategory,
  BookingStatus,
  BookingPaymentStatus,
  Prisma,
} from "@prisma/client";
import {
  FinanceFilterInput,
  FinancePreset,
  RecordCustomerPaymentInput,
  RefundCustomerPaymentInput,
  CreateSupplierPayableInput,
  UpdateSupplierPayableInput,
  RecordSupplierPaymentInput,
  CreateExpenseInput,
  UpdateExpenseInput,
  TransactionQueryInput,
  TransactionType,
} from "@/lib/validation/finance-schema";

// ═════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═════════════════════════════════════════════════════════════════════

export interface FinanceKPIOverview {
  totalSales: number;
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
  supplierId: string;
  supplierName: string;
  supplierType: string;
  description: string;
  serviceType: string;
  tripNumber?: string | null;
  plannedAmount: number;
  actualAmount: number;
  paidAmount: number;
  outstandingAmount: number;
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
  totalBookingAmount: number;
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
  grossProfit: number;
  profitMarginPercent: number;
  netCashPosition: number;
  isFinalized: boolean;
  customerPayments: Payment[];
  supplierPayables: (SupplierPayable & { supplier: { name: string; type: string | null } })[];
  supplierPayments: (SupplierPayment & { supplier: { name: string } })[];
  expenses: OperationalExpense[];
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
          where: { archivedAt: null, status: PaymentStatus.COMPLETED },
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

    const netPaid = Math.max(0, totalPaid - totalRefunded);
    const totalAmount = Number(booking.totalAmount);
    const balanceAmount = Math.max(0, totalAmount - netPaid);

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
    userId?: string
  ): Promise<Payment> {
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

    // 3. Idempotency Check: if referenceNumber or idempotencyKey provided, prevent double recording
    if (input.referenceNumber || input.idempotencyKey) {
      const existingPayment = await prisma.payment.findFirst({
        where: {
          agencyId,
          bookingId: input.bookingId,
          archivedAt: null,
          ...(input.referenceNumber ? { referenceNumber: input.referenceNumber } : {}),
          ...(input.idempotencyKey
            ? { notes: { contains: `[idempotency:${input.idempotencyKey}]` } }
            : {}),
        },
      });
      if (existingPayment) {
        return existingPayment;
      }
    }

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
      const p = await tx.payment.create({
        data: {
          agencyId,
          bookingId: input.bookingId,
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

    return payment;
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
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, agencyId, archivedAt: null },
      include: { booking: { include: { tripOperation: true } } },
    });

    if (!payment) {
      throw new Error("Payment record not found.");
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new Error("Only completed payments can be refunded.");
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
      await this.verifyOperationNotFinalized(agencyId, payment.booking.tripOperation.id);
    }

    // Check for idempotency on refund
    if (input.idempotencyKey && payment.notes?.includes(`[refund-idempotency:${input.idempotencyKey}]`)) {
      return payment;
    }

    const newRefundedAmount = currentRefunded + input.amount;
    const isFullyRefunded = Math.abs(newRefundedAmount - Number(payment.amount)) < 0.01;

    const refundNoteTag = input.idempotencyKey ? ` [refund-idempotency:${input.idempotencyKey}]` : "";
    const refundNoteText = `Refund: ₹${input.amount} (${input.reason})${refundNoteTag}`;

    const updated = await prisma.$transaction(async (tx) => {
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
      });

      // Recalculate booking balance
      await this.recalculateBookingBalances(payment.bookingId, tx);

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

    return updated;
  },

  // ═════════════════════════════════════════════════════════════════════
  // SUPPLIER PAYABLES & DISBURSEMENTS WORKFLOWS
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Create Supplier Payable
   */
  async createSupplierPayable(
    agencyId: string,
    input: CreateSupplierPayableInput,
    userId?: string
  ): Promise<SupplierPayable> {
    const supplier = await prisma.supplier.findFirst({
      where: { id: input.supplierId, agencyId, archivedAt: null },
    });
    if (!supplier) throw new Error("Supplier not found or does not belong to your agency.");

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

    // Idempotency check for supplier payable
    if (input.idempotencyKey) {
      const existing = await prisma.supplierPayable.findFirst({
        where: {
          agencyId,
          supplierId: input.supplierId,
          archivedAt: null,
          notes: { contains: `[idempotency:${input.idempotencyKey}]` },
        },
      });
      if (existing) return existing;
    }

    const payableNumber = await this.generateNextPayableNumber(agencyId);
    const actual = input.actualAmount > 0 ? input.actualAmount : input.plannedAmount;

    const notesWithIdempotency = input.idempotencyKey
      ? `${input.notes || ""} [idempotency:${input.idempotencyKey}]`.trim()
      : input.notes;

    return prisma.supplierPayable.create({
      data: {
        agencyId,
        supplierId: input.supplierId,
        bookingId: input.bookingId,
        tripOperationId: input.tripOperationId,
        tripId: input.tripId,
        payableNumber,
        serviceType: input.serviceType,
        serviceReferenceId: input.serviceReferenceId,
        description: input.description,
        currency: input.currency || "INR",
        plannedAmount: new Prisma.Decimal(input.plannedAmount),
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
   * Record Supplier Payment (Disbursement)
   */
  async recordSupplierPayment(
    agencyId: string,
    input: RecordSupplierPaymentInput,
    userId?: string
  ): Promise<SupplierPayment> {
    const supplier = await prisma.supplier.findFirst({
      where: { id: input.supplierId, agencyId, archivedAt: null },
    });
    if (!supplier) throw new Error("Supplier not found.");

    let payable: SupplierPayable | null = null;
    if (input.payableId) {
      payable = await prisma.supplierPayable.findFirst({
        where: { id: input.payableId, agencyId, archivedAt: null },
      });
      if (!payable) throw new Error("Supplier payable record not found.");
      if (payable.tripOperationId) {
        await this.verifyOperationNotFinalized(agencyId, payable.tripOperationId);
      }
    }

    // Idempotency check for supplier payment
    if (input.referenceNumber || input.idempotencyKey) {
      const existing = await prisma.supplierPayment.findFirst({
        where: {
          agencyId,
          supplierId: input.supplierId,
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
      const payment = await tx.supplierPayment.create({
        data: {
          agencyId,
          supplierId: input.supplierId,
          payableId: input.payableId,
          bookingId: input.bookingId || payable?.bookingId,
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
      if (payable) {
        const newPaid = Number(payable.paidAmount) + input.amount;
        const actualAmt = Number(payable.actualAmount);
        const newOutstanding = Math.max(0, actualAmt - newPaid);

        let newStatus: SupplierPayableStatus = payable.status;
        if (newPaid >= actualAmt && actualAmt > 0) {
          newStatus = SupplierPayableStatus.PAID;
        } else if (newPaid > 0) {
          newStatus = SupplierPayableStatus.PARTIALLY_PAID;
        }

        await tx.supplierPayable.update({
          where: { id: payable.id },
          data: {
            paidAmount: new Prisma.Decimal(newPaid),
            outstandingAmount: new Prisma.Decimal(newOutstanding),
            status: newStatus,
          },
        });

        // If tied to an operation, log audit event
        if (payable.tripOperationId) {
          await tx.operationEvent.create({
            data: {
              agencyId,
              tripOperationId: payable.tripOperationId,
              eventType: "SUPPLIER_PAYMENT_RECORDED",
              description: `Disbursed supplier payment ${paymentNumber} of ₹${input.amount.toLocaleString(
                "en-IN"
              )} to ${supplier.name}.`,
              metadata: {
                paymentId: payment.id,
                paymentNumber,
                payableId: payable.id,
                supplierName: supplier.name,
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
          booking: { select: { id: true, bookingNumber: true, trip: { select: { id: true, title: true } } } },
        },
        orderBy: { paymentDate: "desc" },
      });

      for (const sp of supplierPayments) {
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
          partyName: sp.supplier.name,
          partyType: "SUPPLIER",
          bookingId: sp.booking?.id,
          bookingNumber: sp.booking?.bookingNumber,
          tripId: sp.booking?.trip?.id,
          tripTitle: sp.booking?.trip?.title,
          description: sp.notes,
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
        payments: { where: { archivedAt: null } },
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
      }),
      prisma.supplierPayable.findMany({
        where: {
          agencyId,
          archivedAt: null,
          createdAt: { gte: start, lte: end },
        },
        include: { supplier: true, trip: true },
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
    let fullyPaidCount = 0;
    let partiallyPaidCount = 0;
    let unpaidCount = 0;

    const customerReceivablesItems: CustomerOutstandingItem[] = [];

    for (const b of bookings) {
      const bTotal = Number(b.totalAmount);
      const bPaid = Number(b.paidAmount);
      const bBalance = Number(b.balanceAmount);

      totalSales += bTotal;

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
    const customerOutstanding = Math.max(0, totalSales - netReceived);

    // Supplier payables & disbursements
    let supplierPayable = 0;
    let supplierPaid = 0;

    const supplierPayableItems: SupplierOutstandingItem[] = [];

    for (const sp of allPayables) {
      const actual = Number(sp.actualAmount);
      const paid = Number(sp.paidAmount);
      const outstanding = Number(sp.outstandingAmount);

      supplierPayable += actual;
      supplierPaid += paid;

      if (outstanding > 0) {
        const isOverdue = sp.dueDate ? new Date(sp.dueDate).getTime() < Date.now() : false;
        supplierPayableItems.push({
          payableId: sp.id,
          payableNumber: sp.payableNumber,
          supplierId: sp.supplierId,
          supplierName: sp.supplier?.name || "Supplier",
          supplierType: sp.supplier?.type || "General Supplier",
          description: sp.description,
          serviceType: sp.serviceType,
          tripNumber: sp.trip?.tripNumber,
          plannedAmount: Number(sp.plannedAmount),
          actualAmount: actual,
          paidAmount: paid,
          outstandingAmount: outstanding,
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

    const grossProfit = totalBookingAmount - supplierCostActual - operationalExpenses;
    const profitMarginPercent =
      totalBookingAmount > 0 ? Math.round((grossProfit / totalBookingAmount) * 100 * 10) / 10 : 0;
    const netCashPosition = netReceived - supplierPaid - operationalExpenses;

    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      tripId: booking.tripId,
      tripNumber: booking.trip?.tripNumber || "N/A",
      tripTitle: booking.trip?.title || "Tour Itinerary",
      customerName: booking.customer?.name || "Customer",
      totalBookingAmount,
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
      grossProfit,
      profitMarginPercent,
      netCashPosition,
      isFinalized,
      customerPayments: booking.payments,
      supplierPayables: booking.supplierPayables,
      supplierPayments: booking.supplierPayments,
      expenses: booking.expenses,
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

    let rawMilestones = (booking.quotation?.paymentMilestones || []).map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      percentage: m.percentage ? Number(m.percentage) : null,
      amount: m.amount ? Number(m.amount) : null,
      dueDate: m.dueDate,
      sortOrder: m.sortOrder,
    }));

    // If no quotation milestones exist, generate standard default schedule
    if (rawMilestones.length === 0 && totalBookingAmount > 0) {
      const advanceAmt = Math.round(totalBookingAmount * 0.3 * 100) / 100;
      const finalAmt = Math.round((totalBookingAmount - advanceAmt) * 100) / 100;

      const departureDate = booking.travelStartDate ? new Date(booking.travelStartDate) : null;
      let finalDueDate: Date | null = null;
      if (departureDate) {
        const d = new Date(departureDate);
        d.setDate(d.getDate() - 7);
        finalDueDate = d;
      }

      rawMilestones = [
        {
          id: `default-milestone-1-${booking.id}`,
          title: "Advance Booking Deposit",
          description: "Initial booking confirmation deposit",
          percentage: 30,
          amount: advanceAmt,
          dueDate: booking.bookingDate || new Date(),
          sortOrder: 1,
        },
        {
          id: `default-milestone-2-${booking.id}`,
          title: "Final Tour Balance",
          description: "Remaining balance prior to tour commencement",
          percentage: 70,
          amount: finalAmt,
          dueDate: finalDueDate,
          sortOrder: 2,
        },
      ];
    }

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

    const escape = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows: string[] = [];

    rows.push(escape("TRIPDESK FINANCE & PROFITABILITY REPORT"));
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
