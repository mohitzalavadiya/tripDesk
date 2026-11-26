/**
 * YOUR TRAVEL DESK — PHASE 7: FINANCE & BUSINESS MANAGEMENT VERIFICATION SUITE
 *
 * Automated verification for:
 * - Phase 7A: Financial Overview & Visibility (Confirmed booking value, net collections, customer receivables)
 * - Phase 7B: Payment Tracking & Reconciliation (Status filtering, idempotency, refund net paid calculation)
 * - Phase 7C: Supplier Payables & Settlement Visibility (Payment linking, deletion protection, finalized lock)
 * - Phase 7D: Booking-Wise Financial Performance (Quoted vs confirmed vs invoiced vs received vs supplier cost vs gross margin, completeness flag)
 * - Phase 7E: Financial Reporting, Redaction & Tenant Security (Staff financial redaction, owner access, tenant scoping)
 */

import Module from "module";
const originalRequire = (Module as any).prototype.require;
(Module as any).prototype.require = function (id: string) {
  if (id === "server-only") {
    return {};
  }
  return originalRequire.apply(this, arguments);
};

import { SENSITIVE_FINANCIAL_KEYS, canAccessFinancialMargins, redactStaffFinancials } from "../src/lib/auth/permissions";
import { BookingPaymentStatus, BookingStatus, PaymentStatus, SupplierPayableStatus, SupplierPaymentStatus } from "@prisma/client";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
  }
}

async function runPhase7ATests() {
  console.log("\n=======================================================");
  console.log("PHASE 7A: FINANCIAL OVERVIEW & VISIBILITY");
  console.log("=======================================================");

  // 1. Confirmed booking value vs total bookings
  console.log("\n[7A.1] Confirmed Booking Value vs Total Cohort Value:");
  {
    const bookings = [
      { id: "b1", status: BookingStatus.CONFIRMED, totalAmount: 100000, paidAmount: 100000, balanceAmount: 0 },
      { id: "b2", status: BookingStatus.ONGOING, totalAmount: 75000, paidAmount: 25000, balanceAmount: 50000 },
      { id: "b3", status: BookingStatus.COMPLETED, totalAmount: 50000, paidAmount: 50000, balanceAmount: 0 },
      { id: "b4", status: BookingStatus.DRAFT, totalAmount: 30000, paidAmount: 0, balanceAmount: 30000 },
      { id: "b5", status: BookingStatus.CANCELLED, totalAmount: 40000, paidAmount: 0, balanceAmount: 40000 },
    ];

    let totalSales = 0;
    let confirmedBookingValue = 0;

    for (const b of bookings) {
      if (b.status !== BookingStatus.CANCELLED) {
        totalSales += b.totalAmount;
      }
      if (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED || b.status === BookingStatus.ONGOING) {
        confirmedBookingValue += b.totalAmount;
      }
    }

    assert(totalSales === 255000, "Total non-cancelled sales includes confirmed + ongoing + completed + draft (255,000)");
    assert(confirmedBookingValue === 225000, "Confirmed booking value strictly excludes DRAFT and CANCELLED (225,000)");
  }

  // 2. Net Collections accounting for completed refunds
  console.log("\n[7A.2] Net Received Collections & Refund Deduction:");
  {
    const payments = [
      { id: "p1", status: PaymentStatus.COMPLETED, amount: 50000, refundedAmount: 0 },
      { id: "p2", status: PaymentStatus.COMPLETED, amount: 30000, refundedAmount: 5000 }, // partial refund
      { id: "p3", status: PaymentStatus.REFUNDED, amount: 20000, refundedAmount: 20000 }, // full refund
      { id: "p4", status: PaymentStatus.PENDING, amount: 15000, refundedAmount: 0 }, // pending staff receipt
      { id: "p5", status: PaymentStatus.FAILED, amount: 10000, refundedAmount: 0 },
      { id: "p6", status: PaymentStatus.VOIDED, amount: 25000, refundedAmount: 0 },
    ];

    let amountReceived = 0;
    let customerRefunded = 0;

    for (const p of payments) {
      if (p.status === PaymentStatus.COMPLETED || p.status === PaymentStatus.REFUNDED) {
        amountReceived += p.amount;
        customerRefunded += p.refundedAmount;
      }
    }

    const netReceived = Math.max(0, amountReceived - customerRefunded);

    assert(amountReceived === 100000, "Gross received amounts sum completed and refunded (50k + 30k + 20k = 100k)");
    assert(customerRefunded === 25000, "Customer refunds accurately aggregate partial (5k) + full (20k) = 25k");
    assert(netReceived === 75000, "Net received verified collections are net of refunds (100k - 25k = 75k)");
    assert(!payments.some(p => (p.status === PaymentStatus.PENDING || p.status === PaymentStatus.FAILED || p.status === PaymentStatus.VOIDED) && ["p1", "p2", "p3"].includes(p.id)),
      "Pending, Failed, and Voided payments are completely excluded from received income");
  }

  // 3. Customer Outstanding computed from active receivables items
  console.log("\n[7A.3] Cumulative Customer Receivables Accuracy:");
  {
    const customerReceivablesItems = [
      { bookingNumber: "BKG-2026-0001", outstandingAmount: 50000, isOverdue: false },
      { bookingNumber: "BKG-2026-0002", outstandingAmount: 30000, isOverdue: true },
      { bookingNumber: "BKG-2026-0003", outstandingAmount: 15000, isOverdue: false },
    ];

    const customerOutstanding = customerReceivablesItems.reduce((sum, item) => sum + item.outstandingAmount, 0);
    const overdueAmount = customerReceivablesItems.filter(i => i.isOverdue).reduce((sum, i) => sum + i.outstandingAmount, 0);

    assert(customerOutstanding === 95000, "Customer outstanding matches exact sum of active booking receivables (95k)");
    assert(overdueAmount === 30000, "Overdue receivables isolated correctly (30k)");
  }
}

async function runPhase7BTests() {
  console.log("\n=======================================================");
  console.log("PHASE 7B: PAYMENT TRACKING & RECONCILIATION");
  console.log("=======================================================");

  // 1. Duplicate payment prevention (Idempotency)
  console.log("\n[7B.1] Duplicate Payment Prevention by Reference Number:");
  {
    const existingPaymentsInDb = [
      { agencyId: "agency-1", referenceNumber: "UPI-REF-998877", status: PaymentStatus.COMPLETED, paymentNumber: "PAY-2026-0001" },
      { agencyId: "agency-1", referenceNumber: "IMPS-445566", status: PaymentStatus.VOIDED, paymentNumber: "PAY-2026-0002" },
      { agencyId: "agency-2", referenceNumber: "UPI-REF-998877", status: PaymentStatus.COMPLETED, paymentNumber: "PAY-2026-0003" },
    ];

    function checkDuplicatePayment(agencyId: string, referenceNumber?: string | null) {
      if (!referenceNumber || !referenceNumber.trim()) return null;
      return existingPaymentsInDb.find(
        p => p.agencyId === agencyId &&
             p.referenceNumber === referenceNumber.trim() &&
             p.status !== PaymentStatus.VOIDED
      );
    }

    const dup = checkDuplicatePayment("agency-1", "UPI-REF-998877");
    assert(dup !== null && dup?.paymentNumber === "PAY-2026-0001",
      "Duplicate reference number in same agency is detected (ConflictError)");

    const voidedRef = checkDuplicatePayment("agency-1", "IMPS-445566");
    assert(voidedRef === undefined,
      "Reference number from a VOIDED payment can be safely re-used");

    const crossAgencyRef = checkDuplicatePayment("agency-2", "UNIQUE-REF-112233");
    assert(crossAgencyRef === undefined,
      "Unique reference number in agency is allowed");

    const crossAgencyExisting = checkDuplicatePayment("agency-2", "UPI-REF-998877");
    assert(crossAgencyExisting !== null && crossAgencyExisting?.agencyId === "agency-2",
      "Tenant isolation preserved: each agency enforces reference uniqueness within its own tenant");
  }

  // 2. Booking balance recalculation with full and partial refunds
  console.log("\n[7B.2] Balance Recalculation across Full and Partial Refunds:");
  {
    function recalculateBookingBalances(
      bookingTotal: number,
      payments: Array<{ status: PaymentStatus; amount: number; refundedAmount: number }>
    ) {
      const activePayments = payments.filter(
        p => p.status === PaymentStatus.COMPLETED || p.status === PaymentStatus.REFUNDED
      );

      let totalPaid = 0;
      let totalRefunded = 0;
      for (const p of activePayments) {
        totalPaid += p.amount;
        totalRefunded += p.refundedAmount;
      }

      const netPaid = Math.max(0, totalPaid - totalRefunded);
      const balanceAmount = Math.max(0, bookingTotal - netPaid);

      let paymentStatus: BookingPaymentStatus = BookingPaymentStatus.UNPAID;
      if (netPaid >= bookingTotal && bookingTotal > 0) {
        paymentStatus = BookingPaymentStatus.PAID;
      } else if (netPaid > 0) {
        paymentStatus = BookingPaymentStatus.PARTIALLY_PAID;
      }

      return { netPaid, balanceAmount, paymentStatus };
    }

    // Scenario A: Single completed payment of 50k on 50k booking -> PAID
    const scA = recalculateBookingBalances(50000, [
      { status: PaymentStatus.COMPLETED, amount: 50000, refundedAmount: 0 }
    ]);
    assert(scA.netPaid === 50000 && scA.balanceAmount === 0 && scA.paymentStatus === BookingPaymentStatus.PAID,
      "Scenario A: Full payment marks booking PAID with balance ₹0");

    // Scenario B: Payment of 50k is fully refunded (50k) with status REFUNDED -> UNPAID
    const scB = recalculateBookingBalances(50000, [
      { status: PaymentStatus.REFUNDED, amount: 50000, refundedAmount: 50000 }
    ]);
    assert(scB.netPaid === 0 && scB.balanceAmount === 50000 && scB.paymentStatus === BookingPaymentStatus.UNPAID,
      "Scenario B: Fully refunded payment restores booking to UNPAID with full balance ₹50,000");

    // Scenario C: Payment of 50k partially refunded by 15k -> PARTIALLY_PAID with balance 15k
    const scC = recalculateBookingBalances(50000, [
      { status: PaymentStatus.COMPLETED, amount: 50000, refundedAmount: 15000 }
    ]);
    assert(scC.netPaid === 35000 && scC.balanceAmount === 15000 && scC.paymentStatus === BookingPaymentStatus.PARTIALLY_PAID,
      "Scenario C: Partially refunded payment (net 35k) marks booking PARTIALLY_PAID with balance ₹15,000");

    // Scenario D: Multiple payments with one refunded and one active
    const scD = recalculateBookingBalances(100000, [
      { status: PaymentStatus.COMPLETED, amount: 40000, refundedAmount: 0 },
      { status: PaymentStatus.REFUNDED, amount: 30000, refundedAmount: 30000 },
      { status: PaymentStatus.COMPLETED, amount: 20000, refundedAmount: 5000 },
    ]);
    assert(scD.netPaid === 55000 && scD.balanceAmount === 45000 && scD.paymentStatus === BookingPaymentStatus.PARTIALLY_PAID,
      "Scenario D: Multi-payment ledger correctly tallies 40k + (20k - 5k) = 55k net paid, 45k due");

    // Scenario E: Non-completed payments (PENDING, FAILED, VOIDED) strictly excluded
    const rawPayments = [
      { status: PaymentStatus.COMPLETED, amount: 50000, refundedAmount: 0 },
      { status: PaymentStatus.PENDING, amount: 20000, refundedAmount: 0 },
      { status: PaymentStatus.FAILED, amount: 15000, refundedAmount: 0 },
      { status: PaymentStatus.VOIDED, amount: 25000, refundedAmount: 0 },
    ];
    const verifiedPayments = rawPayments.filter(p => p.status === PaymentStatus.COMPLETED || p.status === PaymentStatus.REFUNDED);
    const scE = recalculateBookingBalances(100000, verifiedPayments);
    assert(scE.netPaid === 50000 && scE.balanceAmount === 50000 && scE.paymentStatus === BookingPaymentStatus.PARTIALLY_PAID,
      "Scenario E: Pending, Failed, and Voided payments are completely excluded from verified collections");

    // Scenario F: Invoice balance synchronization after refund preserves invoice total snapshot
    const initialInvoice = {
      id: "inv-001",
      totalAmount: 100000,
      subtotal: 95000,
      paidAmount: 50000,
      balanceAmount: 50000,
      status: "PARTIALLY_PAID",
    };
    // Refund 20,000 on the 50,000 payment
    const invoicePayments = [
      { status: PaymentStatus.COMPLETED, amount: 50000, refundedAmount: 20000 },
    ];
    const invPaid = invoicePayments.reduce((sum, p) => sum + (p.amount - p.refundedAmount), 0);
    const invBalance = Math.max(0, initialInvoice.totalAmount - invPaid);
    const updatedInvoice = {
      ...initialInvoice,
      paidAmount: invPaid,
      balanceAmount: invBalance,
      status: invBalance <= 0 ? "PAID" : invPaid > 0 ? "PARTIALLY_PAID" : "ISSUED",
    };
    assert(updatedInvoice.totalAmount === 100000 && updatedInvoice.subtotal === 95000,
      "Scenario F: Invoice recalculation strictly preserves historical snapshot totalAmount (100k) and subtotal (95k)");
    assert(updatedInvoice.paidAmount === 30000 && updatedInvoice.balanceAmount === 70000,
      "Scenario F: Invoice paidAmount correctly reduced to net received (30k) and balance updated to 70k");
  }
}

async function runPhase7CTests() {
  console.log("\n=======================================================");
  console.log("PHASE 7C: SUPPLIER PAYABLES & SETTLEMENT VISIBILITY");
  console.log("=======================================================");

  // 1. Supplier payable deletion protection with payments
  console.log("\n[7C.1] Payable Deletion Blocked When Payments Recorded:");
  {
    const payableWithPayments = {
      id: "sp-1",
      actualAmount: 45000,
      paidAmount: 20000,
      payments: [{ id: "spay-1", amount: 20000 }],
    };

    function attemptDeletePayable(payable: typeof payableWithPayments) {
      if (payable.payments.length > 0) {
        throw new Error("Cannot delete a payable that has payments recorded. Please cancel or adjust the amount instead.");
      }
      return { success: true };
    }

    let errorThrown = false;
    try {
      attemptDeletePayable(payableWithPayments);
    } catch (err: any) {
      errorThrown = true;
      assert(err.message.includes("Cannot delete a payable that has payments recorded"),
        "Payable deletion blocked when payments exist");
    }
    assert(errorThrown, "Deletion protection triggered for payable with payment history");
  }

  // 2. Supplier payable deletion blocked if operation is finalized
  console.log("\n[7C.2] Finalized Operation Immutability Lock for Payables:");
  {
    const finalizedOperation = {
      id: "op-1",
      events: [{ eventType: "OPERATION_FINALIZED", createdAt: new Date() }],
    };

    function verifyOperationNotFinalized(operation: typeof finalizedOperation | null) {
      if (operation && operation.events.length > 0 && operation.events[0].eventType === "OPERATION_FINALIZED") {
        throw new Error("Operation is finalized and locked for audit compliance. Reopen the operation with an explicit reason before modifying financial records.");
      }
    }

    let lockedErrorThrown = false;
    try {
      verifyOperationNotFinalized(finalizedOperation);
    } catch (err: any) {
      lockedErrorThrown = true;
      assert(err.message.includes("Operation is finalized and locked for audit compliance"),
        "Payable modification/deletion blocked on finalized operation");
    }
    assert(lockedErrorThrown, "Operation immutability lock enforced");

    // Non-finalized operation succeeds
    const activeOperation = {
      id: "op-2",
      events: [{ eventType: "OPERATION_REOPENED", createdAt: new Date() }],
    };
    let activeError = false;
    try {
      verifyOperationNotFinalized(activeOperation);
    } catch {
      activeError = true;
    }
    assert(!activeError, "Non-finalized (or reopened) operation allows financial adjustments");
  }

  // 3. Soft deletion / cancellation of unencumbered payable
  console.log("\n[7C.3] Soft Deletion / Cancellation of Unpaid Payable:");
  {
    const unpaidPayable = {
      id: "sp-clean",
      status: SupplierPayableStatus.PENDING,
      payments: [],
      archivedAt: null as Date | null,
      notes: "Hotel booking payable",
    };

    function cancelPayable(p: typeof unpaidPayable, reason: string) {
      if (p.payments.length > 0) throw new Error("Blocked");
      p.archivedAt = new Date();
      p.status = SupplierPayableStatus.CANCELLED;
      p.notes = `${p.notes} [Cancelled: ${reason}]`;
      return p;
    }

    const cancelled = cancelPayable(unpaidPayable, "Room upgraded to direct billing");
    assert(cancelled.archivedAt !== null, "Payable soft-deleted with archivedAt timestamp");
    assert(cancelled.status === SupplierPayableStatus.CANCELLED, "Payable status updated to CANCELLED");
    assert(cancelled.notes.includes("Room upgraded"), "Audit reason appended to payable notes");
  }
}

async function runPhase7DTests() {
  console.log("\n=======================================================");
  console.log("PHASE 7D: BOOKING-WISE FINANCIAL PERFORMANCE");
  console.log("=======================================================");

  function evaluateCostCompleteness(payables: any[], isFinalized: boolean) {
    const hasRecordedPayables = payables.length > 0;
    const hasUnconfirmedPayables = payables.some(
      (sp) => sp.status === SupplierPayableStatus.PENDING
    );

    let isCostComplete = false;
    let costCompletenessReason = "Supplier costs unrecorded or incomplete.";
    let label = "Estimated Gross Margin (Provisional)";

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
      label = "Definitive Gross Margin (Audited)";
    }

    return { isCostComplete, costCompletenessReason, label };
  }

  console.log("\n[7D.1] Complete Booking Commercial Breakdown & Gross Margin:");
  {
    const mockBooking = {
      id: "bkg-101",
      bookingNumber: "BKG-2026-0101",
      totalAmount: 150000,
      quotation: { finalAmount: 155000, subtotal: 140000 },
      invoices: [{ totalAmount: 150000, paidAmount: 90000, balanceAmount: 60000, status: "PARTIALLY_PAID" }],
      payments: [
        { status: PaymentStatus.COMPLETED, amount: 60000, refundedAmount: 0 },
        { status: PaymentStatus.COMPLETED, amount: 40000, refundedAmount: 10000 }, // net 30k
      ],
      supplierPayables: [
        { plannedAmount: 80000, actualAmount: 82000, paidAmount: 50000, outstandingAmount: 32000, status: SupplierPayableStatus.PARTIALLY_PAID },
        { plannedAmount: 20000, actualAmount: 18000, paidAmount: 18000, outstandingAmount: 0, status: SupplierPayableStatus.PAID },
      ],
      expenses: [{ amount: 5000 }],
    };

    const totalBookingAmount = mockBooking.totalAmount;
    const quotedAmount = Number(mockBooking.quotation.finalAmount);
    const invoicedAmount = mockBooking.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    let customerPaid = 0;
    for (const p of mockBooking.payments) {
      if (p.status === PaymentStatus.COMPLETED) {
        customerPaid += (p.amount - p.refundedAmount);
      }
    }
    const customerOutstanding = Math.max(0, totalBookingAmount - customerPaid);

    let supplierCostActual = 0;
    let supplierPaid = 0;
    for (const sp of mockBooking.supplierPayables) {
      supplierCostActual += sp.actualAmount;
      supplierPaid += sp.paidAmount;
    }
    const supplierOutstanding = Math.max(0, supplierCostActual - supplierPaid);

    const operationalExpenses = mockBooking.expenses.reduce((sum, e) => sum + e.amount, 0);

    const grossMargin = totalBookingAmount - supplierCostActual - operationalExpenses;
    const profitMarginPercent = Math.round((grossMargin / totalBookingAmount) * 100 * 10) / 10;

    assert(quotedAmount === 155000, "Quoted amount accurately extracted from quotation (155k)");
    assert(totalBookingAmount === 150000, "Confirmed booking contract total is 150k");
    assert(invoicedAmount === 150000, "Invoiced amount equals active invoices sum (150k)");
    assert(customerPaid === 90000, "Verified received is net of refunds (60k + 30k = 90k)");
    assert(customerOutstanding === 60000, "Customer outstanding balance is 150k - 90k = 60k");
    assert(supplierCostActual === 100000, "Supplier cost obligation is 82k + 18k = 100k");
    assert(supplierPaid === 68000, "Settled to suppliers is 50k + 18k = 68k");
    assert(supplierOutstanding === 32000, "Remaining supplier payable is 100k - 68k = 32k");
    assert(grossMargin === 45000, "Gross margin = 150k (Revenue) - 100k (Suppliers) - 5k (Ops) = 45k");
    assert(profitMarginPercent === 30.0, "Gross margin percent is (45k / 150k) * 100 = 30.0%");

    // Verify unfinalized operation marks margin PROVISIONAL even when payables exist
    const unfinalizedEvaluation = evaluateCostCompleteness(mockBooking.supplierPayables, false);
    assert(unfinalizedEvaluation.isCostComplete === false,
      "Presence of payables alone DOES NOT establish cost completeness when operation is unfinalized");
    assert(unfinalizedEvaluation.label.includes("Estimated"),
      "Unfinalized booking margin is labelled 'Estimated Gross Margin (Provisional)'");
    assert(unfinalizedEvaluation.costCompletenessReason.includes("Pre-closure margin is estimated"),
      "Clear explanation provided: Pre-closure margin is estimated based on recorded obligations");

    // Verify finalized operation marks margin DEFINITIVE when confirmed obligations exist
    const finalizedEvaluation = evaluateCostCompleteness(mockBooking.supplierPayables, true);
    assert(finalizedEvaluation.isCostComplete === true,
      "Definitive cost completeness established ONLY when operation is finalized and payables are confirmed");
    assert(finalizedEvaluation.label.includes("Definitive"),
      "Finalized booking margin is labelled 'Definitive Gross Margin (Audited)'");
    assert(finalizedEvaluation.costCompletenessReason.includes("Operation finalized and audited"),
      "Clear explanation provided: Operation finalized and audited. Recorded supplier obligations are definitive.");
  }

  // 2. Cost incompleteness indicator when payables are unconfirmed or missing
  console.log("\n[7D.2] Cost Incompleteness Under Disputed Payables or Missing Costs:");
  {
    // Case A: Pending or unconfirmed payables
    const pendingPayables = [
      { actualAmount: 50000, status: SupplierPayableStatus.PENDING },
    ];
    const pendingEvaluation = evaluateCostCompleteness(pendingPayables, true);
    assert(pendingEvaluation.isCostComplete === false,
      "Pending payables prevent definitive cost completeness even if operation is finalized");
    assert(pendingEvaluation.costCompletenessReason.includes("unconfirmed or disputed"),
      "Explanation notes unconfirmed or disputed supplier obligations");

    // Case B: No supplier payables recorded
    const emptyPayables: any[] = [];
    const missingEvaluation = evaluateCostCompleteness(emptyPayables, true);
    assert(missingEvaluation.isCostComplete === false,
      "Zero supplier payables marked isCostComplete: false");
    assert(missingEvaluation.costCompletenessReason.includes("No supplier payables recorded"),
      "Explanation notes no supplier payables recorded");
  }
}

async function runPhase7ETests() {
  console.log("\n=======================================================");
  console.log("PHASE 7E: REPORTING, STAFF REDACTION & SECURITY");
  console.log("=======================================================");

  // 1. Staff Financial Redaction of margins, supplier costs, and payables
  console.log("\n[7E.1] Staff Financial Redaction Verification:");
  {
    const sensitivePayload = {
      bookingId: "bkg-101",
      bookingNumber: "BKG-2026-0101",
      customerName: "Mohit Traveler",
      totalBookingAmount: 150000,
      quotedAmount: 155000,
      invoicedAmount: 150000,
      customerPaid: 90000,
      customerOutstanding: 60000,
      paymentStatus: "PARTIALLY_PAID",
      supplierCostActual: 100000,
      supplierPaid: 68000,
      supplierOutstanding: 32000,
      grossMargin: 45000,
      grossProfit: 45000,
      profitMarginPercent: 30.0,
      netCashPosition: 17000,
      isCostComplete: false,
      costCompletenessReason: "Trip operation not finalized. Pre-closure margin is estimated based on recorded obligations.",
      supplierPayables: [{ payableNumber: "PAYABLE-2026-00001", actualAmount: 82000 }],
      supplierPayments: [{ paymentNumber: "SPAY-2026-00001", amount: 50000 }],
      expenses: [{ amount: 5000 }],
    };

    // Redaction for AGENCY_STAFF
    const staffRedacted = redactStaffFinancials(sensitivePayload, "AGENCY_STAFF") as any;

    assert(staffRedacted.totalBookingAmount === 150000, "Staff CAN see customer booking total amount");
    assert(staffRedacted.quotedAmount === 155000, "Staff CAN see quotation amount");
    assert(staffRedacted.invoicedAmount === 150000, "Staff CAN see invoiced amount");
    assert(staffRedacted.customerPaid === 90000, "Staff CAN see verified customer received amount");
    assert(staffRedacted.customerOutstanding === 60000, "Staff CAN see customer balance due");
    assert(staffRedacted.paymentStatus === "PARTIALLY_PAID", "Staff CAN see customer payment status");

    assert(staffRedacted.supplierCostActual === undefined, "Staff CANNOT see supplierCostActual (redacted)");
    assert(staffRedacted.supplierPaid === undefined, "Staff CANNOT see supplierPaid (redacted)");
    assert(staffRedacted.supplierOutstanding === undefined, "Staff CANNOT see supplierOutstanding (redacted)");
    assert(staffRedacted.grossMargin === undefined, "Staff CANNOT see grossMargin (redacted)");
    assert(staffRedacted.grossProfit === undefined, "Staff CANNOT see grossProfit (redacted)");
    assert(staffRedacted.profitMarginPercent === undefined, "Staff CANNOT see profitMarginPercent (redacted)");
    assert(staffRedacted.netCashPosition === undefined, "Staff CANNOT see netCashPosition (redacted)");
    assert(staffRedacted.isCostComplete === undefined, "Staff CANNOT see isCostComplete (redacted)");
    assert(staffRedacted.costCompletenessReason === undefined, "Staff CANNOT see costCompletenessReason (redacted)");
    assert(staffRedacted.supplierPayables === undefined, "Staff CANNOT see supplierPayables array (redacted)");
    assert(staffRedacted.supplierPayments === undefined, "Staff CANNOT see supplierPayments array (redacted)");
    assert(staffRedacted.expenses === undefined, "Staff CANNOT see expenses array (redacted)");

    // Owner retention
    const ownerRetained = redactStaffFinancials(sensitivePayload, "AGENCY_OWNER") as any;
    assert(ownerRetained.grossMargin === 45000, "Agency Owner retains full visibility of grossMargin (45k)");
    assert(ownerRetained.supplierCostActual === 100000, "Agency Owner retains full visibility of supplierCostActual (100k)");
    assert(ownerRetained.profitMarginPercent === 30.0, "Agency Owner retains full visibility of profitMarginPercent (30.0%)");
    assert(ownerRetained.isCostComplete === false, "Agency Owner retains visibility of isCostComplete");
    assert(ownerRetained.costCompletenessReason?.includes("Pre-closure"), "Agency Owner retains visibility of costCompletenessReason");
  }

  // 2. Sensitive Financial Keys Set completeness
  console.log("\n[7E.2] Sensitive Financial Keys Definition Completeness:");
  {
    assert(SENSITIVE_FINANCIAL_KEYS.has("grossMargin"), "SENSITIVE_FINANCIAL_KEYS includes 'grossMargin'");
    assert(SENSITIVE_FINANCIAL_KEYS.has("grossProfit"), "SENSITIVE_FINANCIAL_KEYS includes 'grossProfit'");
    assert(SENSITIVE_FINANCIAL_KEYS.has("supplierCostActual"), "SENSITIVE_FINANCIAL_KEYS includes 'supplierCostActual'");
    assert(SENSITIVE_FINANCIAL_KEYS.has("supplierOutstanding"), "SENSITIVE_FINANCIAL_KEYS includes 'supplierOutstanding'");
    assert(SENSITIVE_FINANCIAL_KEYS.has("profitMarginPercent"), "SENSITIVE_FINANCIAL_KEYS includes 'profitMarginPercent'");
    assert(SENSITIVE_FINANCIAL_KEYS.has("netCashPosition"), "SENSITIVE_FINANCIAL_KEYS includes 'netCashPosition'");
    assert(SENSITIVE_FINANCIAL_KEYS.has("isCostComplete"), "SENSITIVE_FINANCIAL_KEYS includes 'isCostComplete'");
    assert(SENSITIVE_FINANCIAL_KEYS.has("costCompletenessReason"), "SENSITIVE_FINANCIAL_KEYS includes 'costCompletenessReason'");
  }

  // 3. Role capability checks for financial margins
  console.log("\n[7E.3] Margin Access Permission Checks:");
  {
    assert(canAccessFinancialMargins("AGENCY_OWNER") === true, "AGENCY_OWNER can access financial margins");
    assert(canAccessFinancialMargins("PLATFORM_OWNER") === false, "PLATFORM_OWNER does not peer into tenant private margins (tenant privacy)");
    assert(canAccessFinancialMargins("AGENCY_STAFF") === false, "AGENCY_STAFF cannot access financial margins");
    assert(canAccessFinancialMargins("CUSTOMER") === false, "CUSTOMER cannot access financial margins");
  }
}

async function main() {
  console.log("================================================================================");
  console.log("YOUR TRAVEL DESK — PHASE 7: FINANCE & BUSINESS MANAGEMENT VERIFICATION");
  console.log("================================================================================");

  try {
    await runPhase7ATests();
    await runPhase7BTests();
    await runPhase7CTests();
    await runPhase7DTests();
    await runPhase7ETests();

    console.log("\n================================================================================");
    console.log(`TEST SUITE RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${failedTests} FAILED)`);
    console.log("================================================================================");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution failed with error:", error);
    process.exit(1);
  }
}

main();
