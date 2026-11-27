import * as fs from "fs";
import * as path from "path";

const paymentPath = path.resolve("src/lib/services/payment-service.ts");
let raw = fs.readFileSync(paymentPath, "utf8");
const isCRLF = raw.includes("\r\n");
let content = raw.replace(/\r\n/g, "\n");

// 1. Check imports and add checkHasAgencyAuditLogsTable
if (!content.includes("checkHasAgencyAuditLogsTable")) {
  content = content.replace(
    'import { agencyAuditService } from "./agency-audit-service";',
    'import { agencyAuditService, checkHasAgencyAuditLogsTable } from "./agency-audit-service";'
  );
}

// 2. Add PAYMENT_RELATIONS_SELECT and checkHasPaymentVerificationColumns after PAYMENT_SCALAR_SELECT
const scalarSelectTarget = `export const PAYMENT_SCALAR_SELECT = {
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
} as const;`;

const scalarSelectRepl = `export const PAYMENT_SCALAR_SELECT = {
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

let _hasVerificationColumnsCache: boolean | null = null;

export async function checkHasPaymentVerificationColumns(client: any = prisma): Promise<boolean> {
  if (_hasVerificationColumnsCache !== null) {
    return _hasVerificationColumnsCache;
  }
  try {
    const rawQuery = client?.$queryRaw || prisma.$queryRaw;
    if (typeof rawQuery === "function") {
      const res: any = await rawQuery\`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'verifiedById'
        LIMIT 1
      \`;
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
}`;

if (content.includes(scalarSelectTarget)) {
  content = content.replace(scalarSelectTarget, scalarSelectRepl);
  console.log("Replaced PAYMENT_SCALAR_SELECT and added PAYMENT_RELATIONS_SELECT");
} else {
  console.error("FAILED to match scalarSelectTarget");
}

// 3. Patch createPayment: remove verifiedById/verifiedAt from data, change include to select: PAYMENT_RELATIONS_SELECT
const createTarget = `          receivedBy: (isStaff && actor?.userId) ? actor.userId : ((data as any).receivedBy || null),
          verifiedById: null,
          verifiedAt: null,
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
      });`;

const createRepl = `          receivedBy: (isStaff && actor?.userId) ? actor.userId : ((data as any).receivedBy || null),
        },
        select: PAYMENT_RELATIONS_SELECT,
      });`;

if (content.includes(createTarget)) {
  content = content.replace(createTarget, createRepl);
  console.log("Patched createPayment");
} else {
  console.error("FAILED to match createTarget");
}

// 4. Patch updatePayment: change include to select: PAYMENT_RELATIONS_SELECT
const updateTarget = `      const p = await tx.payment.update({
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
      });`;

const updateRepl = `      const p = await tx.payment.update({
        where: { id: paymentId },
        data: updateData,
        select: PAYMENT_RELATIONS_SELECT,
      });`;

if (content.includes(updateTarget)) {
  content = content.replace(updateTarget, updateRepl);
  console.log("Patched updatePayment");
} else {
  console.error("FAILED to match updateTarget");
}

// 5. Patch recordInvoicePayment: change include to select: PAYMENT_RELATIONS_SELECT
const invoicePayTarget = `      const p = await tx.payment.create({
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
      });`;

const invoicePayRepl = `      const p = await tx.payment.create({
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
        select: PAYMENT_RELATIONS_SELECT,
      });`;

if (content.includes(invoicePayTarget)) {
  content = content.replace(invoicePayTarget, invoicePayRepl);
  console.log("Patched recordInvoicePayment");
} else {
  console.error("FAILED to match invoicePayTarget");
}

// 6. Patch voidPayment: change include to select: PAYMENT_RELATIONS_SELECT
const voidTarget = `      const p = await tx.payment.update({
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
      });`;

const voidRepl = `      const p = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.VOIDED,
          voidReason: voidReason.trim(),
          voidedAt: new Date(),
          voidedBy: userId,
        },
        select: PAYMENT_RELATIONS_SELECT,
      });`;

if (content.includes(voidTarget)) {
  content = content.replace(voidTarget, voidRepl);
  console.log("Patched voidPayment");
} else {
  console.error("FAILED to match voidTarget");
}

// 7. Patch verifyPaymentReceipt: resilience for unmigrated verifiedById / verifiedAt / audit table
const verifyTarget = `      const verifiedAt = new Date();
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          verifiedById: ownerUserId,
          verifiedAt,
        },
      });

      // Recalculate booking payment totals
      await bookingService.recalculateBookingPaymentTotals(payment.bookingId, tx);

      // Audit log
      if (tx.agencyAuditLog?.create) {
        await tx.agencyAuditLog.create({
          data: {
            agencyId,
            actorUserId: ownerUserId,
            action: "PAYMENT_RECEIPT_VERIFIED",
            entityType: "Payment",
            entityId: payment.id,
            details: { amount: Number(payment.amount), bookingId: payment.bookingId },
          },
        });
      }`;

const verifyRepl = `      const verifiedAt = new Date();
      const hasVerificationCols = await checkHasPaymentVerificationColumns(tx);
      const updateData: any = {
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
      const hasAuditLogsTable = await checkHasAgencyAuditLogsTable(tx);
      if (hasAuditLogsTable && tx.agencyAuditLog?.create) {
        await tx.agencyAuditLog.create({
          data: {
            agencyId,
            actorUserId: ownerUserId,
            action: "PAYMENT_RECEIPT_VERIFIED",
            entityType: "Payment",
            entityId: payment.id,
            details: { amount: Number(payment.amount), bookingId: payment.bookingId },
          },
        });
      }`;

if (content.includes(verifyTarget)) {
  content = content.replace(verifyTarget, verifyRepl);
  console.log("Patched verifyPaymentReceipt");
} else {
  console.error("FAILED to match verifyTarget");
}

// 8. Patch voidPaymentReceipt: resilience for select and audit table
const voidReceiptTarget = `      const voidedAt = new Date();
      const voided = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.VOIDED,
          voidReason: voidReason.trim(),
          voidedAt,
          voidedBy: ownerUserId,
        },
      });

      // If previously COMPLETED, recalculate booking totals
      if (payment.status === PaymentStatus.COMPLETED) {
        await bookingService.recalculateBookingPaymentTotals(payment.bookingId, tx);
      }

      // Audit log
      if (tx.agencyAuditLog?.create) {
        await tx.agencyAuditLog.create({
          data: {
            agencyId,
            actorUserId: ownerUserId,
            action: "PAYMENT_RECEIPT_VOIDED",
            entityType: "Payment",
            entityId: payment.id,
            details: { voidReason: voidReason.trim(), amount: Number(payment.amount) },
          },
        });
      }`;

const voidReceiptRepl = `      const voidedAt = new Date();
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
      const hasAuditLogsTable = await checkHasAgencyAuditLogsTable(tx);
      if (hasAuditLogsTable && tx.agencyAuditLog?.create) {
        await tx.agencyAuditLog.create({
          data: {
            agencyId,
            actorUserId: ownerUserId,
            action: "PAYMENT_RECEIPT_VOIDED",
            entityType: "Payment",
            entityId: payment.id,
            details: { voidReason: voidReason.trim(), amount: Number(payment.amount) },
          },
        });
      }`;

if (content.includes(voidReceiptTarget)) {
  content = content.replace(voidReceiptTarget, voidReceiptRepl);
  console.log("Patched voidPaymentReceipt");
} else {
  console.error("FAILED to match voidReceiptTarget");
}

// 9. Patch archivePayment: add select: PAYMENT_SCALAR_SELECT
const archiveTarget = `    return prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: { archivedAt: new Date() },
      });

      // Recalculate booking totals
      await bookingService.recalculateBookingPaymentTotals(payment.bookingId, tx);

      return p;
    });`;

const archiveRepl = `    return prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: paymentId },
        data: { archivedAt: new Date() },
        select: PAYMENT_SCALAR_SELECT,
      });

      // Recalculate booking totals
      await bookingService.recalculateBookingPaymentTotals(payment.bookingId, tx);

      return p;
    });`;

if (content.includes(archiveTarget)) {
  content = content.replace(archiveTarget, archiveRepl);
  console.log("Patched archivePayment");
} else {
  console.error("FAILED to match archiveTarget");
}

// 10. Add method aliases at bottom of paymentService
const bottomTarget = `  async archivePayment(agencyId: string, paymentId: string): Promise<Payment> {`;

const bottomRepl = `  /**
   * Alias for verifyPaymentReceipt (preserves naming for staff receipt verification)
   */
  async verifyStaffReceipt(
    agencyId: string,
    paymentId: string,
    ownerUserId: string,
    prismaClient: any = prisma
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
    prismaClient: any = prisma
  ): Promise<Payment> {
    return this.voidPaymentReceipt(agencyId, paymentId, ownerUserId, voidReason, prismaClient);
  },

  async archivePayment(agencyId: string, paymentId: string): Promise<Payment> {`;

if (content.includes(bottomTarget)) {
  content = content.replace(bottomTarget, bottomRepl);
  console.log("Added verifyStaffReceipt and voidStaffReceipt aliases");
} else {
  console.error("FAILED to match bottomTarget");
}

if (isCRLF) {
  content = content.replace(/\n/g, "\r\n");
}
fs.writeFileSync(paymentPath, content, "utf8");
console.log("Saved payment-service.ts");
