import "dotenv/config";

// Mock server-only before any other imports
const Module = require("module");
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === "server-only") {
    return {};
  }
  return originalRequire.apply(this, arguments);
};

import prisma from "../src/lib/prisma";
import { financeService } from "../src/lib/services/finance-service";
import { bookingService } from "../src/lib/services/booking-service";
import { quotationService } from "../src/lib/services/quotation-service";
import {
  BookingStatus,
  BookingPaymentStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  SupplierPayableStatus,
  SupplierPaymentStatus,
  ExpenseCategory,
  Prisma,
} from "@prisma/client";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, message: string) {
  totalCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runPhase12FinanceTests() {
  console.log("\n=======================================================");
  console.log("   TRIPDESK PHASE 12: PAYMENTS & FINANCE VERIFICATION");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  const agencyAId = `test-agency-fin-a-${timestamp}`;
  const agencyBId = `test-agency-fin-b-${timestamp}`;

  try {
    // ═══════════════════════════════════════════════════════════════════
    // 1. SETUP MULTI-TENANT TEST FIXTURES
    // ═══════════════════════════════════════════════════════════════════
    console.log("--- 1. Setting up multi-tenant test agencies & fixtures ---");

    const agencyA = await prisma.agency.create({
      data: {
        id: agencyAId,
        name: "Peak Explorers Agency A",
        email: `peak-a-${timestamp}@tripdesk.test`,
        phone: "+91 9876543210",
        address: "The Mall Road, Srinagar",
        status: "ACTIVE",
      },
    });

    const agencyB = await prisma.agency.create({
      data: {
        id: agencyBId,
        name: "Horizon Escapes Agency B",
        email: `horizon-b-${timestamp}@tripdesk.test`,
        phone: "+91 9876543211",
        address: "Calangute Beach Road, Goa",
        status: "ACTIVE",
      },
    });

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: "Kishan Patel",
        phone: `+9198000${timestamp.toString().slice(-5)}`,
        email: `kishan.${timestamp}@example.com`,
      },
    });

    const customerB = await prisma.customer.create({
      data: {
        agencyId: agencyB.id,
        name: "Sanjay Sharma",
        phone: `+9197000${timestamp.toString().slice(-5)}`,
        email: `sanjay.${timestamp}@example.com`,
      },
    });

    const supplierA = await prisma.supplier.create({
      data: {
        agencyId: agencyA.id,
        name: "Alpine Grand Resort & Spa",
        type: "HOTEL",
        contactPerson: "Rajesh Varma",
        phone: "+919811122334",
        email: "reservations@alpinegrand.com",
      },
    });

    const supplierTransportA = await prisma.supplier.create({
      data: {
        agencyId: agencyA.id,
        name: "Himalayan Fleet Services",
        type: "TRANSPORT",
        contactPerson: "Vikram Negi",
        phone: "+919822233445",
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-FIN-${timestamp}`,
        title: "Kashmir Luxury Odyssey",
        status: "QUOTED",
        startDate: new Date("2026-10-05"),
        endDate: new Date("2026-10-12"),
      },
    });

    // Create quotation with 3 distinct payment milestones:
    // Milestone 1: 30% Advance (Due yesterday - overdue if unpaid)
    // Milestone 2: 30% Installment 2 (Due next month)
    // Milestone 3: 40% Final Settlement (Due in 2 months)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 2);

    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    const twoMonths = new Date();
    twoMonths.setDate(twoMonths.getDate() + 60);

    const totalContractAmount = 150000; // ₹1,50,000

    const quoteA = await prisma.quotation.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA.id,
        customerId: customerA.id,
        quotationNumber: `Q-FIN-${timestamp}`,
        title: "Kashmir Luxury Experience Quote",
        status: "SENT",
        currency: "INR",
        subtotal: new Prisma.Decimal(90000),
        markupAmount: new Prisma.Decimal(60000),
        finalAmount: new Prisma.Decimal(totalContractAmount),
        paymentMilestones: {
          create: [
            {
              title: "30% Advance Booking Deposit",
              percentage: new Prisma.Decimal(30),
              amount: new Prisma.Decimal(45000),
              dueDate: yesterday,
              sortOrder: 1,
            },
            {
              title: "30% Pre-Departure Second Installment",
              percentage: new Prisma.Decimal(30),
              amount: new Prisma.Decimal(45000),
              dueDate: nextMonth,
              sortOrder: 2,
            },
            {
              title: "40% Final Settlement",
              percentage: new Prisma.Decimal(40),
              amount: new Prisma.Decimal(60000),
              dueDate: twoMonths,
              sortOrder: 3,
            },
          ],
        },
      },
    });

    // Convert quotation to booking
    const bookingA = await bookingService.convertQuotationToBooking(agencyA.id, quoteA.id);

    assert(Boolean(bookingA && bookingA.id), "Booking converted and provisioned successfully.");
    assert(Number(bookingA.totalAmount) === 150000, "Booking contract value is ₹1,50,000.");
    assert(Number(bookingA.paidAmount) === 0, "Initial paid amount is ₹0.");
    assert(bookingA.paymentStatus === BookingPaymentStatus.UNPAID, "Initial payment status is UNPAID.");

    // ═══════════════════════════════════════════════════════════════════
    // 2. PAYMENT SCHEDULE & OVERDUE DETECTION
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 2. Verifying Payment Schedule & Overdue Calculation ---");

    const initialSchedule = await financeService.getBookingPaymentSchedule(agencyA.id, bookingA.id);

    assert(initialSchedule.milestones.length === 3, "Schedule has exactly 3 payment milestones.");
    assert(initialSchedule.totalMilestonesPlanned === 150000, "SUM(milestone planned amounts) === totalBookingAmount (₹1,50,000).");
    assert(initialSchedule.totalMilestonesAllocated === 0, "Total allocated is initially ₹0.");
    assert(initialSchedule.outstandingBalance === 150000, "Outstanding balance is ₹1,50,000.");

    // Milestone 1 has dueDate in past, so should be flagged overdue
    assert(initialSchedule.milestones[0].isOverdue === true, "Milestone 1 (due yesterday) is correctly flagged overdue.");
    assert(initialSchedule.milestones[1].isOverdue === false, "Milestone 2 (due in 30 days) is not overdue.");
    assert(initialSchedule.overdueMilestonesCount === 1, "Exactly 1 milestone is overdue.");
    assert(initialSchedule.overdueMilestonesAmount === 45000, "Overdue amount is ₹45,000.");

    // ═══════════════════════════════════════════════════════════════════
    // 3. RECORD CUSTOMER PAYMENT & WATERFALL ALLOCATION
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 3. Recording Customer Payments & Waterfall Allocation ---");

    // Pay ₹70,000:
    // Should fully cover Milestone 1 (₹45,000 -> PAID)
    // Should partially cover Milestone 2 (₹25,000 of ₹45,000 -> PARTIALLY_PAID, remaining ₹20,000)
    // Milestone 3 remains PENDING (₹0 of ₹60,000)
    const payment1 = await financeService.recordCustomerPayment(agencyA.id, {
      bookingId: bookingA.id,
      amount: 70000,
      paymentMethod: PaymentMethod.UPI,
      referenceNumber: `UPI-REF-${timestamp}-1`,
      notes: "Advance + partial second installment",
    });

    assert(payment1.paymentNumber.startsWith("PAY-"), "Sequential payment number generated (PAY-YYYY-XXXXX).");
    assert(Number(payment1.amount) === 70000, "Payment 1 recorded for ₹70,000.");

    const updatedBooking1 = await prisma.booking.findUnique({ where: { id: bookingA.id } });
    assert(Number(updatedBooking1?.paidAmount) === 70000, "Booking paidAmount updated to ₹70,000.");
    assert(Number(updatedBooking1?.balanceAmount) === 80000, "Booking balanceAmount updated to ₹80,000.");
    assert(updatedBooking1?.paymentStatus === BookingPaymentStatus.PARTIALLY_PAID, "Payment status updated to PARTIALLY_PAID.");

    const scheduleAfterP1 = await financeService.getBookingPaymentSchedule(agencyA.id, bookingA.id);

    assert(scheduleAfterP1.milestones[0].allocatedAmount === 45000, "Milestone 1 allocated ₹45,000 (100%).");
    assert(scheduleAfterP1.milestones[0].remainingAmount === 0, "Milestone 1 remaining is ₹0.");
    assert(scheduleAfterP1.milestones[0].status === "PAID", "Milestone 1 status is PAID.");
    assert(scheduleAfterP1.milestones[0].isOverdue === false, "Milestone 1 is no longer overdue because it is fully paid.");

    assert(scheduleAfterP1.milestones[1].allocatedAmount === 25000, "Milestone 2 allocated ₹25,000.");
    assert(scheduleAfterP1.milestones[1].remainingAmount === 20000, "Milestone 2 remaining is ₹20,000.");
    assert(scheduleAfterP1.milestones[1].status === "PARTIALLY_PAID", "Milestone 2 status is PARTIALLY_PAID.");

    assert(scheduleAfterP1.milestones[2].allocatedAmount === 0, "Milestone 3 allocated ₹0.");
    assert(scheduleAfterP1.milestones[2].status === "PENDING", "Milestone 3 status is PENDING.");

    assert(scheduleAfterP1.overdueMilestonesCount === 0, "No milestones are currently overdue.");

    // Test Idempotency on Customer Payment
    console.log("\n--- 4. Verifying Payment Idempotency Guard ---");
    const duplicatePaymentAttempt = await financeService.recordCustomerPayment(agencyA.id, {
      bookingId: bookingA.id,
      amount: 70000,
      paymentMethod: PaymentMethod.UPI,
      referenceNumber: `UPI-REF-${timestamp}-1`, // Identical reference
      notes: "Duplicate click attempt",
    });

    assert(duplicatePaymentAttempt.id === payment1.id, "Duplicate payment request returned existing payment idempotently without creating duplicate.");

    const paymentsCount = await prisma.payment.count({
      where: { bookingId: bookingA.id, archivedAt: null },
    });
    assert(paymentsCount === 1, "Exactly 1 payment record exists in the database.");

    // ═══════════════════════════════════════════════════════════════════
    // 5. CUSTOMER PAYMENT REFUND WORKFLOW
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 5. Verifying Customer Payment Refund Lifecycle ---");

    // Attempt refund of ₹100,000 on a ₹70,000 payment -> MUST FAIL
    let excessRefundBlocked = false;
    try {
      await financeService.refundCustomerPayment(agencyA.id, payment1.id, {
        amount: 100000,
        reason: "Excess refund attempt",
      });
    } catch (err: any) {
      excessRefundBlocked = true;
    }
    assert(excessRefundBlocked, "Excess refund (> payment eligible amount) was strictly blocked.");

    // Process valid partial refund of ₹20,000
    const refundRes = await financeService.refundCustomerPayment(agencyA.id, payment1.id, {
      amount: 20000,
      reason: "Client downgraded room category",
      idempotencyKey: `REF-IDEM-${timestamp}`,
    });

    assert(Number(refundRes.refundedAmount) === 20000, "Refund of ₹20,000 recorded on payment.");

    const bookingAfterRefund = await prisma.booking.findUnique({ where: { id: bookingA.id } });
    assert(Number(bookingAfterRefund?.paidAmount) === 50000, "Net paidAmount adjusted down to ₹50,000 (₹70,000 - ₹20,000).");
    assert(Number(bookingAfterRefund?.balanceAmount) === 100000, "Balance adjusted up to ₹1,00,000.");

    // Re-check schedule after refund: Milestone 1 has ₹45k, Milestone 2 has ₹5k allocated
    const scheduleAfterRefund = await financeService.getBookingPaymentSchedule(agencyA.id, bookingA.id);
    assert(scheduleAfterRefund.milestones[0].allocatedAmount === 45000, "Milestone 1 remains fully paid (₹45,000).");
    assert(scheduleAfterRefund.milestones[1].allocatedAmount === 5000, "Milestone 2 allocation adjusted to ₹5,000.");
    assert(scheduleAfterRefund.milestones[1].remainingAmount === 40000, "Milestone 2 remaining is ₹40,000.");

    // ═══════════════════════════════════════════════════════════════════
    // 6. SUPPLIER PAYABLES & DISBURSEMENTS
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 6. Verifying Supplier Payables & Disbursements ---");

    const payableHotel = await financeService.createSupplierPayable(agencyA.id, {
      supplierId: supplierA.id,
      bookingId: bookingA.id,
      serviceType: "HOTEL",
      description: "5 Nights Luxury Suite at Alpine Grand",
      plannedAmount: 50000,
      actualAmount: 50000,
      dueDate: nextMonth.toISOString(),
      notes: "Direct hotel settlement",
    });

    assert(payableHotel.payableNumber.startsWith("PAYABLE-"), "Sequential payable number generated (PAYABLE-YYYY-XXXXX).");
    assert(Number(payableHotel.actualAmount) === 50000, "Payable actual amount is ₹50,000.");
    assert(payableHotel.status === SupplierPayableStatus.PENDING, "Initial payable status is PENDING.");

    const payableTransport = await financeService.createSupplierPayable(agencyA.id, {
      supplierId: supplierTransportA.id,
      bookingId: bookingA.id,
      serviceType: "VEHICLE",
      description: "Innova Crysta Dedicated 6 Days",
      plannedAmount: 25000,
      actualAmount: 25000,
      dueDate: nextMonth.toISOString(),
    });

    // Record partial supplier payment to Hotel (₹30,000 of ₹50,000)
    const spay1 = await financeService.recordSupplierPayment(agencyA.id, {
      supplierId: supplierA.id,
      payableId: payableHotel.id,
      bookingId: bookingA.id,
      amount: 30000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      referenceNumber: `NEFT-${timestamp}-1`,
      paidBy: "Accounts Team",
    });

    assert(spay1.paymentNumber.startsWith("SPAY-"), "Sequential supplier disbursement number generated (SPAY-YYYY-XXXXX).");
    assert(Number(spay1.amount) === 30000, "Supplier payment recorded for ₹30,000.");

    const updatedPayableHotel = await prisma.supplierPayable.findUnique({ where: { id: payableHotel.id } });
    assert(Number(updatedPayableHotel?.paidAmount) === 30000, "Payable paidAmount updated to ₹30,000.");
    assert(Number(updatedPayableHotel?.outstandingAmount) === 20000, "Payable outstandingAmount updated to ₹20,000.");
    assert(updatedPayableHotel?.status === SupplierPayableStatus.PARTIALLY_PAID, "Payable status transitioned to PARTIALLY_PAID.");

    // Log Operational Expense
    const expense1 = await financeService.createExpense(agencyA.id, {
      bookingId: bookingA.id,
      category: ExpenseCategory.TOLL,
      amount: 2500,
      description: "State border permits and express toll charges",
      paidBy: "Chauffeur",
    });

    assert(expense1.expenseNumber.startsWith("EXP-"), "Sequential expense number generated (EXP-YYYY-XXXXX).");
    assert(Number(expense1.amount) === 2500, "Expense recorded for ₹2,500.");

    // ═══════════════════════════════════════════════════════════════════
    // 7. SERVER-AUTHORITATIVE PROFITABILITY & BREAKDOWN
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 7. Verifying Server-Authoritative Profitability & Reconciliation ---");

    const breakdown = await financeService.getBookingFinanceBreakdown(agencyA.id, bookingA.id);

    // Revenue = ₹1,50,000
    // Supplier Costs = Hotel (₹50,000) + Transport (₹25,000) = ₹75,000
    // Operational Expenses = ₹2,500
    // Gross Profit = 150000 - 75000 - 2500 = ₹72,500
    // Profit Margin % = (72500 / 150000) * 100 = 48.3%
    // Net Cash Position = Net Customer Received (₹50,000) - Supplier Paid (₹30,000) - Expenses (₹2,500) = ₹17,500
    assert(breakdown.totalBookingAmount === 150000, "Total booking contract is ₹1,50,000.");
    assert(breakdown.customerPaid === 50000, "Net customer received is ₹50,000.");
    assert(breakdown.customerRefunded === 20000, "Customer refunded is ₹20,000.");
    assert(breakdown.customerOutstanding === 100000, "Customer outstanding is ₹1,00,000.");
    assert(breakdown.supplierCostActual === 75000, "Actual supplier cost is ₹75,000.");
    assert(breakdown.supplierPaid === 30000, "Supplier paid is ₹30,000.");
    assert(breakdown.supplierOutstanding === 45000, "Supplier outstanding is ₹45,000.");
    assert(breakdown.operationalExpenses === 2500, "Operational expenses total is ₹2,500.");
    assert(breakdown.grossProfit === 72500, "Gross profit is server-authoritatively ₹72,500.");
    assert(breakdown.profitMarginPercent === 48.3, "Profit margin is exactly 48.3%.");
    assert(breakdown.netCashPosition === 17500, "Net cash position is exactly ₹17,500.");

    // Verify schedule attached to breakdown
    assert(breakdown.paymentSchedule.length === 3, "Payment schedule attached to booking financial breakdown.");
    assert(breakdown.totalMilestonesPlanned === 150000, "Breakdown includes totalMilestonesPlanned: ₹1,50,000.");
    assert(breakdown.totalMilestonesAllocated === 50000, "Breakdown includes totalMilestonesAllocated: ₹50,000.");

    // ═══════════════════════════════════════════════════════════════════
    // 8. FINALIZATION IMMUTABILITY LOCK
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 8. Verifying Financial Immutability Lock upon Operation Finalization ---");

    const operation = await prisma.tripOperation.findFirst({
      where: { bookingId: bookingA.id, agencyId: agencyA.id },
    });

    assert(Boolean(operation), "TripOperation found for booking.");

    // Finalize operation
    await prisma.operationEvent.create({
      data: {
        agencyId: agencyA.id,
        tripOperationId: operation!.id,
        eventType: "OPERATION_FINALIZED",
        description: "Tour concluded and financial accounts audited and locked.",
      },
    });

    // Attempting to record payment on finalized operation MUST throw
    let paymentOnFinalizedBlocked = false;
    try {
      await financeService.recordCustomerPayment(agencyA.id, {
        bookingId: bookingA.id,
        amount: 10000,
        paymentMethod: PaymentMethod.UPI,
      });
    } catch (err: any) {
      paymentOnFinalizedBlocked = true;
    }
    assert(paymentOnFinalizedBlocked, "Recording payment on finalized operation is strictly blocked.");

    // Attempting to create payable on finalized operation MUST throw
    let payableOnFinalizedBlocked = false;
    try {
      await financeService.createSupplierPayable(agencyA.id, {
        supplierId: supplierA.id,
        tripOperationId: operation!.id,
        description: "Post-finalization payable attempt",
        plannedAmount: 5000,
      });
    } catch (err: any) {
      payableOnFinalizedBlocked = true;
    }
    assert(payableOnFinalizedBlocked, "Creating payable on finalized operation is strictly blocked.");

    // Reopen operation with explicit reason
    await prisma.operationEvent.create({
      data: {
        agencyId: agencyA.id,
        tripOperationId: operation!.id,
        eventType: "OPERATION_REOPENED",
        description: "Reopened by Agency Finance Director for final settlement.",
      },
    });

    // Recording payment should now succeed again
    const finalPayment = await financeService.recordCustomerPayment(agencyA.id, {
      bookingId: bookingA.id,
      amount: 100000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      referenceNumber: `FINAL-SETTLE-${timestamp}`,
      notes: "Full settlement upon tour completion",
    });

    assert(Number(finalPayment.amount) === 100000, "Payment successfully recorded after reopening operation.");

    const finalBookingState = await prisma.booking.findUnique({ where: { id: bookingA.id } });
    assert(Number(finalBookingState?.paidAmount) === 150000, "Booking is now 100% paid (₹1,50,000).");
    assert(Number(finalBookingState?.balanceAmount) === 0, "Booking balance is ₹0.");
    assert(finalBookingState?.paymentStatus === BookingPaymentStatus.PAID, "Payment status updated to PAID.");

    // ═══════════════════════════════════════════════════════════════════
    // 9. MULTI-TENANT ISOLATION & IDOR SECURITY
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 9. Verifying Multi-Tenant Isolation & IDOR Protection ---");

    let crossAgencyPaymentBlocked = false;
    try {
      await financeService.recordCustomerPayment(agencyB.id, {
        bookingId: bookingA.id, // Agency A's booking
        amount: 5000,
        paymentMethod: PaymentMethod.CASH,
      });
    } catch (err: any) {
      crossAgencyPaymentBlocked = true;
    }
    assert(crossAgencyPaymentBlocked, "Agency B blocked from recording payment on Agency A's booking.");

    let crossAgencyBreakdownBlocked = false;
    try {
      await financeService.getBookingFinanceBreakdown(agencyB.id, bookingA.id);
    } catch (err: any) {
      crossAgencyBreakdownBlocked = true;
    }
    assert(crossAgencyBreakdownBlocked, "Agency B blocked from viewing Agency A's financial breakdown.");

    let crossAgencyScheduleBlocked = false;
    try {
      await financeService.getBookingPaymentSchedule(agencyB.id, bookingA.id);
    } catch (err: any) {
      crossAgencyScheduleBlocked = true;
    }
    assert(crossAgencyScheduleBlocked, "Agency B blocked from viewing Agency A's payment schedule.");

    // ═══════════════════════════════════════════════════════════════════
    // 10. EXECUTIVE DASHBOARD SUMMARY & AUDIT RECONCILIATION
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- 10. Verifying Executive Dashboard KPIs & Reconciliation ---");

    const dashboard = await financeService.getFinanceDashboard(agencyA.id, { preset: "LAST_30_DAYS" });

    assert(dashboard.kpis.totalSales >= 150000, "Dashboard totalSales captures booking value.");
    assert(dashboard.kpis.amountReceived >= 150000, "Dashboard net received reflects all completed collections.");
    assert(dashboard.kpis.supplierPayable >= 75000, "Dashboard supplierPayable reflects all payables.");
    assert(dashboard.kpis.grossProfit >= 72500, "Dashboard grossProfit matches authoritative ledger.");

    console.log("\n=======================================================");
    console.log(`  ALL PHASE 12 FINANCE TESTS PASSED: ${passedCount} / ${totalCount} (100%)`);
    console.log("=======================================================\n");
  } finally {
    // Cleanup fixtures
    console.log("--- Cleaning up test fixtures ---");
    await prisma.operationEvent.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.operationalExpense.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.supplierPayment.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.supplierPayable.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.payment.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.tripOperation.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.booking.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.quotationPaymentMilestone.deleteMany({ where: { quotation: { agencyId: { in: [agencyAId, agencyBId] } } } }).catch(() => {});
    await prisma.quotation.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.trip.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.supplier.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.customer.deleteMany({ where: { agencyId: { in: [agencyAId, agencyBId] } } }).catch(() => {});
    await prisma.agency.deleteMany({ where: { id: { in: [agencyAId, agencyBId] } } }).catch(() => {});
  }
}

runPhase12FinanceTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution error:", err);
    process.exit(1);
  });
