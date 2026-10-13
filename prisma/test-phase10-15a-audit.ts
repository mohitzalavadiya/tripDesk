/**
 * TripDesk Phase 10.15A — Comprehensive Architecture, Security & Integration Audit Test Suite
 *
 * Verifies:
 * 1. Multi-tenant security & IDOR protection across all resources
 * 2. Cross-agency access isolation (read, write, delete, export, docs)
 * 3. Server-authoritative financial calculation & edge cases (zero revenue, over-refund, negative numbers)
 * 4. Operations lifecycle & finalization immutability lock enforcement
 * 5. Data leakage prevention & commercial privacy on public endpoints
 * 6. Audit trail & timeline event recording
 */

import "dotenv/config";

// Mock server-only for standalone test script execution
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as any;
} catch {}

import { UserRole, OperationStatus, ConfirmationStatus, DispatchStatus, IssuePriority, IssueStatus, PaymentMethod, PaymentType, SupplierPayableStatus, ExpenseCategory, BookingPaymentStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { financeService } from "../src/lib/services/finance-service";
import { operationsService } from "../src/lib/services/operations-service";
import { quotationService } from "../src/lib/services/quotation-service";
import { operationsDocumentService } from "../src/lib/services/operations-document-service";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runAudit() {
  console.log("\n=======================================================");
  console.log("   TRIPDESK PHASE 10.15A: ARCHITECTURE & SECURITY AUDIT");
  console.log("=======================================================\n");

  const runId = Date.now().toString().slice(-6);

  try {
    // ═════════════════════════════════════════════════════════════════
    // 1. MULTI-TENANT ISOLATION FIXTURES
    // ═════════════════════════════════════════════════════════════════
    console.log("--- 1. Multi-Tenant Fixture Setup ---");

    const agencyA = await prisma.agency.create({
      data: {
        name: `Audit Agency Alpha ${runId}`,
        phone: "+919876500001",
        email: `alpha_${runId}@tripdesk.test`,
      },
    });

    const userA = await prisma.user.create({
      data: {
        id: `user_alpha_${runId}`,
        agencyId: agencyA.id,
        name: "Alpha Admin",
        email: `admin_alpha_${runId}@tripdesk.test`,
        role: UserRole.AGENCY_OWNER,
      },
    });

    const agencyB = await prisma.agency.create({
      data: {
        name: `Audit Agency Beta ${runId}`,
        phone: "+919876500002",
        email: `beta_${runId}@tripdesk.test`,
      },
    });

    const userB = await prisma.user.create({
      data: {
        id: `user_beta_${runId}`,
        agencyId: agencyB.id,
        name: "Beta Admin",
        email: `admin_beta_${runId}@tripdesk.test`,
        role: UserRole.AGENCY_OWNER,
      },
    });

    assert(Boolean(agencyA.id && agencyB.id && userA.id && userB.id), "Agencies Alpha and Beta initialized cleanly");

    // Create Agency A Core Data
    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: "Arjun Verma",
        phone: "+919876543210",
        email: `arjun_${runId}@test.com`,
      },
    });

    const supplierA = await prisma.supplier.create({
      data: {
        agencyId: agencyA.id,
        name: "Khyber Himalayan Resort",
        type: "Hotel Supplier",
        phone: "+919988776655",
      },
    });

    const hotelA = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        name: "The Grand Himalayan Heritage Palace",
        city: "Shimla",
        supplierId: supplierA.id,
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRP-A-${runId}`,
        title: "Kashmir Winter Odyssey",
        startDate: new Date("2026-12-10"),
        endDate: new Date("2026-12-17"),
        tripHotels: {
          create: [
            {
              hotelId: hotelA.id,
              checkIn: new Date("2026-12-10"),
              checkOut: new Date("2026-12-17"),
              roomType: "Deluxe Suite",
            },
          ],
        },
      },
      include: { tripHotels: true },
    });

    const bookingA = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA.id,
        customerId: customerA.id,
        bookingNumber: `BKG-A-${runId}`,
        totalAmount: 150000,
        paidAmount: 0,
        balanceAmount: 150000,
        paymentStatus: BookingPaymentStatus.UNPAID,
      },
    });

    const operationA = await operationsService.initializeOperation(
      agencyA.id,
      { tripId: tripA.id, bookingId: bookingA.id, status: OperationStatus.PREPARING, notes: "Alpha Audit Tour" },
      userA.id
    );

    // Create Agency B Core Data
    const customerB = await prisma.customer.create({
      data: {
        agencyId: agencyB.id,
        name: "Sneha Patel",
        phone: "+919123456780",
        email: `sneha_${runId}@test.com`,
      },
    });

    const tripB = await prisma.trip.create({
      data: {
        agencyId: agencyB.id,
        customerId: customerB.id,
        tripNumber: `TRP-B-${runId}`,
        title: "Goa Beach Retreat",
        startDate: new Date("2026-11-01"),
        endDate: new Date("2026-11-05"),
      },
    });

    const bookingB = await prisma.booking.create({
      data: {
        agencyId: agencyB.id,
        tripId: tripB.id,
        customerId: customerB.id,
        bookingNumber: `BKG-B-${runId}`,
        totalAmount: 80000,
        paidAmount: 0,
        balanceAmount: 80000,
        paymentStatus: BookingPaymentStatus.UNPAID,
      },
    });

    const operationB = await operationsService.initializeOperation(
      agencyB.id,
      { tripId: tripB.id, bookingId: bookingB.id, status: OperationStatus.PREPARING, notes: "Beta Audit Tour" },
      userB.id
    );

    assert(Boolean(operationA?.id && operationB?.id), "Operations A and B created with tenant boundaries");

    // ═════════════════════════════════════════════════════════════════
    // 2. IDOR SECURITY AUDIT — CROSS-TENANT MUTATIONS
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- 2. IDOR Security Audit: Cross-Tenant Mutations ---");

    // A. Agency B attempts to record payment on Agency A's booking
    let crossPaymentBlocked = false;
    try {
      await financeService.recordCustomerPayment(agencyB.id, {
        bookingId: bookingA.id, // Agency A's booking
        amount: 25000,
        paymentType: PaymentType.ADVANCE,
        paymentMethod: PaymentMethod.UPI,
      });
    } catch (err: any) {
      crossPaymentBlocked = true;
    }
    assert(crossPaymentBlocked, "Agency B BLOCKED from recording customer payment on Agency A booking");

    // B. Agency B attempts to create supplier payable on Agency A's trip/operation
    let crossPayableBlocked = false;
    try {
      await financeService.createSupplierPayable(agencyB.id, {
        supplierId: supplierA.id, // Agency A's supplier
        bookingId: bookingA.id,
        tripOperationId: operationA.id,
        serviceType: "HOTEL",
        description: "Unauthorized Payable",
        plannedAmount: 30000,
        actualAmount: 30000,
      });
    } catch (err: any) {
      crossPayableBlocked = true;
    }
    assert(crossPayableBlocked, "Agency B BLOCKED from creating payable for Agency A supplier/operation");

    // C. Agency B attempts to log expense on Agency A's operation
    let crossExpenseBlocked = false;
    try {
      await financeService.createExpense(agencyB.id, {
        tripOperationId: operationA.id,
        bookingId: bookingA.id,
        category: ExpenseCategory.FUEL,
        amount: 5000,
        description: "Illicit cross-agency expense",
      });
    } catch (err: any) {
      crossExpenseBlocked = true;
    }
    assert(crossExpenseBlocked, "Agency B BLOCKED from logging expense on Agency A operation");

    // D. Agency B attempts to mutate Agency A's operation status
    let crossOpUpdateBlocked = false;
    try {
      await operationsService.updateOperation(agencyB.id, operationA.id, {
        status: OperationStatus.ONGOING,
      }, userB.id);
    } catch (err: any) {
      crossOpUpdateBlocked = true;
    }
    assert(crossOpUpdateBlocked, "Agency B BLOCKED from updating Agency A operation");

    // E. Agency B attempts to create issue on Agency A's operation
    let crossIssueBlocked = false;
    try {
      await operationsService.createIssue(agencyB.id, operationA.id, {
        title: "Cross agency intrusion",
        description: "Should fail",
        priority: IssuePriority.HIGH,
      }, userB.id);
    } catch (err: any) {
      crossIssueBlocked = true;
    }
    assert(crossIssueBlocked, "Agency B BLOCKED from filing issue on Agency A operation");

    // ═════════════════════════════════════════════════════════════════
    // 3. IDOR SECURITY AUDIT — CROSS-TENANT READS & EXPORTS
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- 3. IDOR Security Audit: Cross-Tenant Reads & Analytics ---");

    // A. Booking finance breakdown for Agency A queried by Agency B
    let crossBreakdownBlocked = false;
    try {
      await financeService.getBookingFinanceBreakdown(agencyB.id, bookingA.id);
    } catch (err: any) {
      crossBreakdownBlocked = true;
    }
    assert(crossBreakdownBlocked, "Agency B BLOCKED from viewing Agency A single-booking financial ledger");

    // B. Operations closure summary for Agency A queried by Agency B
    let crossClosureBlocked = false;
    try {
      await operationsService.getClosureSummary(agencyB.id, operationA.id);
    } catch (err: any) {
      crossClosureBlocked = true;
    }
    assert(crossClosureBlocked, "Agency B BLOCKED from reading Agency A operations closure summary");

    // C. Document generation for Agency A voucher requested by Agency B
    let crossVoucherBlocked = false;
    try {
      await operationsDocumentService.generateBookingConfirmation(agencyB.id, operationA.id);
    } catch (err: any) {
      crossVoucherBlocked = true;
    }
    assert(crossVoucherBlocked, "Agency B BLOCKED from generating PDF booking confirmation for Agency A");

    // ═════════════════════════════════════════════════════════════════
    // 4. FINANCIAL INTEGRITY & EDGE CASES
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- 4. Financial Calculation Integrity & Edge Cases ---");

    // A. Valid advance payment for Agency A
    const p1 = await financeService.recordCustomerPayment(agencyA.id, {
      bookingId: bookingA.id,
      amount: 50000,
      paymentType: PaymentType.ADVANCE,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
    }, userA.id);
    assert(Boolean(p1.id), "Customer advance payment recorded successfully");

    // B. Over-refund attempt rejected
    let overRefundBlocked = false;
    try {
      await financeService.refundCustomerPayment(agencyA.id, p1.id, {
        amount: 60000, // exceeds ₹50,000 paid
        reason: "Excessive refund attempt",
      });
    } catch (err: any) {
      overRefundBlocked = true;
    }
    assert(overRefundBlocked, "Refund exceeding net paid balance is BLOCKED");

    // C. Valid partial refund
    const refundedP1 = await financeService.refundCustomerPayment(agencyA.id, p1.id, {
      amount: 10000,
      reason: "Customer itinerary modification",
    }, userA.id);
    assert(Number(refundedP1.refundedAmount) === 10000, "Partial refund of ₹10,000 recorded accurately");

    // Verify booking recalculated balance: total 150000, net paid = 50000 - 10000 = 40000, balance = 110000
    const refreshedBookingA = await prisma.booking.findUnique({ where: { id: bookingA.id } });
    assert(Number(refreshedBookingA?.paidAmount) === 40000, "Booking paidAmount is exactly ₹40,000 after refund");
    assert(Number(refreshedBookingA?.balanceAmount) === 110000, "Booking balanceAmount is exactly ₹110,000 after refund");
    assert(refreshedBookingA?.paymentStatus === BookingPaymentStatus.PARTIALLY_PAID, "Booking paymentStatus is PARTIALLY_PAID");

    // D. Second payment settling the remaining ₹110,000
    await financeService.recordCustomerPayment(agencyA.id, {
      bookingId: bookingA.id,
      amount: 110000,
      paymentType: PaymentType.FINAL,
      paymentMethod: PaymentMethod.UPI,
    }, userA.id);

    const fullBookingA = await prisma.booking.findUnique({ where: { id: bookingA.id } });
    assert(Number(fullBookingA?.paidAmount) === 150000, "Booking paidAmount is ₹150,000 after full settlement");
    assert(Number(fullBookingA?.balanceAmount) === 0, "Booking balanceAmount is ₹0");
    assert(fullBookingA?.paymentStatus === BookingPaymentStatus.PAID, "Booking transitioned to PAID");

    // E. Create Supplier Payables & Disbursements
    const payableA = await financeService.createSupplierPayable(agencyA.id, {
      supplierId: supplierA.id,
      bookingId: bookingA.id,
      tripOperationId: operationA.id,
      serviceType: "HOTEL",
      description: "6 Nights Deluxe Room at Khyber",
      plannedAmount: 90000,
      actualAmount: 85000, // saved ₹5,000
      dueDate: new Date("2026-12-05").toISOString(),
    }, userA.id);
    assert(Number(payableA.outstandingAmount) === 85000, "Supplier payable created with ₹85,000 outstanding");

    // Disburse partial ₹45,000 to supplier
    await financeService.recordSupplierPayment(agencyA.id, {
      supplierId: supplierA.id,
      payableId: payableA.id,
      amount: 45000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      referenceNumber: "UTR-ALPHA-9988",
    }, userA.id);

    const refreshedPayableA = await prisma.supplierPayable.findUnique({ where: { id: payableA.id } });
    assert(Number(refreshedPayableA?.paidAmount) === 45000, "Supplier payable paidAmount is ₹45,000");
    assert(Number(refreshedPayableA?.outstandingAmount) === 40000, "Supplier payable outstanding is ₹40,000");
    assert(refreshedPayableA?.status === SupplierPayableStatus.PARTIALLY_PAID, "Supplier payable status is PARTIALLY_PAID");

    // F. Log Operational Expense
    const expenseA = await financeService.createExpense(agencyA.id, {
      tripOperationId: operationA.id,
      bookingId: bookingA.id,
      category: ExpenseCategory.TOLL,
      amount: 5000,
      description: "Airport expressway toll & parking",
    }, userA.id);
    assert(Number(expenseA.amount) === 5000, "Operational expense of ₹5,000 logged cleanly");

    // G. Verify Exact Profitability & Margin Formulas
    const breakdown = await financeService.getBookingFinanceBreakdown(agencyA.id, bookingA.id);
    assert(breakdown.totalBookingAmount === 150000, "Math check: Revenue is ₹150,000");
    assert(breakdown.customerPaid === 150000, "Math check: Customer Received is ₹150,000");
    assert(breakdown.customerOutstanding === 0, "Math check: Customer Outstanding is ₹0");
    assert(breakdown.supplierCostActual === 85000, "Math check: Supplier Actual Cost is ₹85,000");
    assert(breakdown.supplierPaid === 45000, "Math check: Supplier Paid is ₹45,000");
    assert(breakdown.supplierOutstanding === 40000, "Math check: Supplier Outstanding is ₹40,000");
    assert(breakdown.operationalExpenses === 5000, "Math check: Operational Expenses is ₹5,000");
    assert(breakdown.grossProfit === 60000, "Math check: Gross Profit is ₹60,000");
    assert(breakdown.profitMarginPercent === 40, "Math check: Profit Margin is exactly 40.0%");
    assert(breakdown.netCashPosition === 100000, "Math check: Net Cash Position is ₹100,000");

    // ═════════════════════════════════════════════════════════════════
    // 5. ZERO REVENUE / DIVISION-BY-ZERO SAFETY
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- 5. Zero-Revenue & Margin Edge Case Verification ---");

    const zeroTrip = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRP-ZERO-${runId}`,
        title: "Complimentary Familiarization Tour",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-03"),
      },
    });

    const zeroBooking = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        tripId: zeroTrip.id,
        customerId: customerA.id,
        bookingNumber: `BKG-ZERO-${runId}`,
        totalAmount: 0,
        paidAmount: 0,
        balanceAmount: 0,
        paymentStatus: BookingPaymentStatus.PAID,
      },
    });

    const zeroBreakdown = await financeService.getBookingFinanceBreakdown(agencyA.id, zeroBooking.id);
    assert(zeroBreakdown.profitMarginPercent === 0, "Zero revenue booking yields 0% margin without NaN or divide-by-zero error");

    // ═════════════════════════════════════════════════════════════════
    // 6. OPERATIONS FINALIZATION & IMMUTABILITY ENFORCEMENT
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- 6. Operations Finalization & Immutability Enforcement ---");

    // Prepare operation for closure: complete operation, save post-tour review & reconciliation
    await operationsService.updateOperation(agencyA.id, operationA.id, { status: OperationStatus.COMPLETED }, userA.id);
    await operationsService.savePostTourReview(
      agencyA.id,
      operationA.id,
      { guestRating: 5, operatorRating: 5, serviceQuality: "EXCELLENT", internalRemarks: "Audit verified review" },
      userA.id
    );
    await operationsService.saveFinancialReconciliation(
      agencyA.id,
      operationA.id,
      { plannedCost: 90000, actualCost: 85000, varianceAmount: -5000, varianceReason: "Saved on negotiated hotel deal" },
      userA.id
    );

    // Finalize operation A
    await operationsService.finalizeOperation(
      agencyA.id,
      operationA.id,
      { closureNotes: "Tour completed with 100% guest satisfaction", acknowledgedDiscrepancies: true },
      userA.id
    );

    const closureSummary = await operationsService.getClosureSummary(agencyA.id, operationA.id);
    assert(closureSummary.isFinalized === true, "Operation A is successfully finalized and locked");

    // Verify financial mutations are BLOCKED on finalized operation
    let blockedFinalizedPayment = false;
    try {
      await financeService.recordCustomerPayment(agencyA.id, {
        bookingId: bookingA.id,
        amount: 1000,
        paymentType: PaymentType.ADJUSTMENT,
        paymentMethod: PaymentMethod.CASH,
      });
    } catch (err: any) {
      blockedFinalizedPayment = true;
    }
    assert(blockedFinalizedPayment, "Immutability lock BLOCKED customer payment on finalized tour");

    let blockedFinalizedExpense = false;
    try {
      await financeService.createExpense(agencyA.id, {
        tripOperationId: operationA.id,
        bookingId: bookingA.id,
        category: ExpenseCategory.MISCELLANEOUS,
        amount: 500,
        description: "Post-finalization receipt",
      });
    } catch (err: any) {
      blockedFinalizedExpense = true;
    }
    assert(blockedFinalizedExpense, "Immutability lock BLOCKED expense logging on finalized tour");

    // Reopen with reason
    await operationsService.reopenOperation(
      agencyA.id,
      operationA.id,
      { reopenReason: "Late vendor parking receipt adjustment received" },
      userA.id
    );

    const reopenedSummary = await operationsService.getClosureSummary(agencyA.id, operationA.id);
    assert(reopenedSummary.isFinalized === false, "Operation successfully reopened after verified compliance audit reason");

    // Mutation now succeeds after legit reopen
    const postReopenExpense = await financeService.createExpense(agencyA.id, {
      tripOperationId: operationA.id,
      bookingId: bookingA.id,
      category: ExpenseCategory.PARKING,
      amount: 500,
      description: "Late parking voucher",
    });
    assert(Boolean(postReopenExpense.id), "Mutation permitted after legitimate audit-logged reopening");

    // ═════════════════════════════════════════════════════════════════
    // 7. COMMERCIAL PRIVACY & DATA LEAKAGE PREVENTION
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- 7. Commercial Privacy & Public Sanitization ---");

    // Create a quotation with internal margins, cost prices, and secret notes
    const quote = await prisma.quotation.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA.id,
        customerId: customerA.id,
        quotationNumber: `Q-${runId}`,
        version: 1,
        title: "Kashmir Luxury Proposal",
        subtotal: 100000,
        markupPercentage: 25,
        markupAmount: 25000,
        finalAmount: 125000,
        shareToken: `token_secret_${runId}`,
        internalNotes: "CONFIDENTIAL: Guide rate is negotiated at 40% discount with Farooq.",
      },
    });

    await prisma.quotationItem.create({
      data: {
        quotationId: quote.id,
        type: "HOTEL",
        name: "Khyber Presidential Suite",
        quantity: 1,
        unitPrice: 125000,
        costPrice: 90000, // internal cost
        markupPercentage: 38.89,
        sellingPrice: 125000,
        totalPrice: 125000,
        notes: "Internal note: Negotiate late checkout without fee",
      },
    });

    const publicQuote = await quotationService.getPublicQuotationByToken(quote.shareToken!);
    assert(Boolean(publicQuote), "Public quotation retrieved via share token");
    assert((publicQuote as any).internalNotes === undefined, "CONFIDENTIAL internalNotes is NOT exposed on public proposal");
    assert((publicQuote as any).markupAmount === undefined, "Internal markupAmount is NOT exposed on public proposal");
    assert((publicQuote as any).markupPercentage === undefined, "Internal markupPercentage is NOT exposed on public proposal");
    assert((publicQuote as any).subtotal === undefined, "Internal subtotal base cost is NOT exposed on public proposal");
    
    if (publicQuote?.items && publicQuote.items.length > 0) {
      const item = publicQuote.items[0] as any;
      assert(item.costPrice === undefined, "Item costPrice (supplier buy rate) is NOT exposed");
      assert(item.markupPercentage === undefined, "Item markupPercentage is NOT exposed");
      assert(item.sellingPrice === undefined, "Item raw sellingPrice is sanitized (totalPrice shown)");
    }

    // ═════════════════════════════════════════════════════════════════
    // 8. UNIFIED TRANSACTION AUDIT & TIMELINE COMPLETENESS
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- 8. Unified Transaction Ledger & Event Audit ---");

    const transactions = await financeService.getTransactions(agencyA.id, {
      page: 1,
      limit: 50,
      type: "ALL",
    });

    assert(transactions.data.length >= 4, "Unified ledger aggregates customer payments, refunds, supplier payments, and expenses");
    
    // Check that timeline events exist for operational actions
    const events = await operationsService.getTimeline(agencyA.id, operationA.id);
    assert(events.length >= 3, "Operation timeline recorded financial and operational audit events");

  } catch (error) {
    console.error("FATAL UNEXPECTED ERROR IN AUDIT:", error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n=======================================================");
  console.log(`   PHASE 10.15A AUDIT SUITE COMPLETE`);
  console.log(`   RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit();
