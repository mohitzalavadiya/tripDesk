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

import { prisma } from "../src/lib/prisma";
import { financeService } from "../src/lib/services/finance-service";
import { operationsService } from "../src/lib/services/operations-service";
import {
  AgencyStatus,
  BookingPaymentStatus,
  BookingStatus,
  ExpenseCategory,
  OperationStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  SupplierPayableStatus,
  SupplierPaymentStatus,
  UserRole,
} from "@prisma/client";

async function runPhase10_14Tests() {
  console.log("\n=======================================================");
  console.log("   TRIPDESK PHASE 10.14: FINANCE & PROFITABILITY QA");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  const assert = (desc: string, condition: boolean, details?: any) => {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      if (details) console.error(`     Details:`, details);
      failed++;
    }
  };

  const testSuffix = `p14_${Date.now()}`;

  try {
    // ═════════════════════════════════════════════════════════════════
    // 1. SETUP MULTI-TENANT TEST AGENCIES & FIXTURES
    // ═════════════════════════════════════════════════════════════════
    console.log("--- 1. Multi-Tenant Fixtures Setup ---");

    const agencyA = await prisma.agency.create({
      data: {
        name: `Finance Agency A ${testSuffix}`,
        phone: "+919876543210",
        email: `agency_a_${testSuffix}@tripdesk.test`,
        status: AgencyStatus.ACTIVE,
      },
    });

    const userA = await prisma.user.create({
      data: {
        id: `usr_a_${testSuffix}`,
        agencyId: agencyA.id,
        name: "Finance Manager A",
        email: `manager_a_${testSuffix}@tripdesk.test`,
        role: UserRole.AGENCY_OWNER,
      },
    });

    const agencyB = await prisma.agency.create({
      data: {
        name: `Finance Agency B ${testSuffix}`,
        phone: "+919876543211",
        email: `agency_b_${testSuffix}@tripdesk.test`,
        status: AgencyStatus.ACTIVE,
      },
    });

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        customerNumber: `CUST-A-${testSuffix}`,
        name: "Pooja Sharma",
        phone: "+919822334455",
        email: `pooja_${testSuffix}@test.com`,
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-A-${testSuffix}`,
        title: "Kashmir Splendor Tour 6D5N",
        startDate: new Date("2026-09-10"),
        endDate: new Date("2026-09-16"),
      },
    });

    const bookingA = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA.id,
        customerId: customerA.id,
        bookingNumber: `BK-A-${testSuffix}`,
        totalAmount: 100000,
        paidAmount: 0,
        balanceAmount: 100000,
        paymentStatus: BookingPaymentStatus.UNPAID,
        status: BookingStatus.CONFIRMED,
        travelStartDate: new Date("2026-09-10"),
      },
    });

    const opA = await prisma.tripOperation.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA.id,
        bookingId: bookingA.id,
        coordinatorId: userA.id,
      },
    });

    const supplierA1 = await prisma.supplier.create({
      data: {
        agencyId: agencyA.id,
        name: "Grand Palace Hotel Srinagar",
        type: "HOTEL",
        phone: "+911942456789",
      },
    });

    const supplierA2 = await prisma.supplier.create({
      data: {
        agencyId: agencyA.id,
        name: "Himalayan Transport Fleet",
        type: "TRANSPORT",
        phone: "+911942456790",
      },
    });

    assert("Agency A & Agency B fixtures created cleanly", !!agencyA.id && !!agencyB.id);

    // ═════════════════════════════════════════════════════════════════
    // 2. CUSTOMER PAYMENTS & LIFECYCLE
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- 2. Customer Payments & Automatic Balance Recalculation ---");

    // 2.1 Advance Payment: ₹30,000
    const pay1 = await financeService.recordCustomerPayment(
      agencyA.id,
      {
        bookingId: bookingA.id,
        amount: 30000,
        paymentType: PaymentType.ADVANCE,
        paymentMethod: PaymentMethod.UPI,
        referenceNumber: "UPI/ADV/112233",
        receivedBy: userA.name,
        notes: "Advance token for Kashmir booking",
      },
      userA.id
    );

    const bAfterPay1 = await prisma.booking.findUnique({ where: { id: bookingA.id } });
    assert("Advance payment creates valid Payment record with sequential number", pay1.paymentNumber.startsWith("PAY-"));
    assert("Booking paidAmount updated to ₹30,000", Number(bAfterPay1?.paidAmount) === 30000);
    assert("Booking balanceAmount updated to ₹70,000", Number(bAfterPay1?.balanceAmount) === 70000);
    assert("Booking paymentStatus is PARTIALLY_PAID", bAfterPay1?.paymentStatus === BookingPaymentStatus.PARTIALLY_PAID);

    // Verify timeline event logged
    const event1 = await prisma.operationEvent.findFirst({
      where: { agencyId: agencyA.id, tripOperationId: opA.id, eventType: "CUSTOMER_PAYMENT_RECORDED" },
    });
    assert("CUSTOMER_PAYMENT_RECORDED audit event created in operation timeline", !!event1);

    // 2.2 Partial Payment: ₹40,000
    const pay2 = await financeService.recordCustomerPayment(
      agencyA.id,
      {
        bookingId: bookingA.id,
        amount: 40000,
        paymentType: PaymentType.PARTIAL,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        referenceNumber: "NEFT/887766",
        receivedBy: userA.name,
      },
      userA.id
    );

    const bAfterPay2 = await prisma.booking.findUnique({ where: { id: bookingA.id } });
    assert("Booking paidAmount updated to ₹70,000", Number(bAfterPay2?.paidAmount) === 70000);
    assert("Booking balanceAmount updated to ₹30,000", Number(bAfterPay2?.balanceAmount) === 30000);

    // 2.3 Final Payment: ₹30,000 (Fully Paid)
    const pay3 = await financeService.recordCustomerPayment(
      agencyA.id,
      {
        bookingId: bookingA.id,
        amount: 30000,
        paymentType: PaymentType.FINAL,
        paymentMethod: PaymentMethod.UPI,
        referenceNumber: "UPI/FINAL/9900",
      },
      userA.id
    );

    const bAfterPay3 = await prisma.booking.findUnique({ where: { id: bookingA.id } });
    assert("Booking paidAmount updated to ₹100,000", Number(bAfterPay3?.paidAmount) === 100000);
    assert("Booking balanceAmount updated to ₹0", Number(bAfterPay3?.balanceAmount) === 0);
    assert("Booking paymentStatus transitioned to PAID", bAfterPay3?.paymentStatus === BookingPaymentStatus.PAID);

    // ═════════════════════════════════════════════════════════════════
    // 3. REFUND VALIDATION & RECOVERY
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- 3. Customer Payment Refund Validations ---");

    // 3.1 Over-refund rejection
    let overRefundFailed = false;
    try {
      await financeService.refundCustomerPayment(
        agencyA.id,
        pay3.id,
        {
          amount: 50000, // Eligible is only 30000
          reason: "Excessive refund request",
        },
        userA.id
      );
    } catch (err: any) {
      overRefundFailed = true;
    }
    assert("Rejects refund exceeding eligible amount", overRefundFailed);

    // 3.2 Valid Partial Refund: ₹10,000 on pay3
    const refPay3 = await financeService.refundCustomerPayment(
      agencyA.id,
      pay3.id,
      {
        amount: 10000,
        reason: "Customer requested room downgrade credit",
        referenceNumber: "REF/BANK/001",
      },
      userA.id
    );

    const bAfterRefund = await prisma.booking.findUnique({ where: { id: bookingA.id } });
    assert("Refund recorded with updated refundedAmount", Number(refPay3.refundedAmount) === 10000);
    assert("Booking net paidAmount recalculated to ₹90,000", Number(bAfterRefund?.paidAmount) === 90000);
    assert("Booking balanceAmount recalculated to ₹10,000", Number(bAfterRefund?.balanceAmount) === 10000);
    assert("Booking paymentStatus reverted to PARTIALLY_PAID", bAfterRefund?.paymentStatus === BookingPaymentStatus.PARTIALLY_PAID);

    // ═════════════════════════════════════════════════════════════════
    // 4. SUPPLIER PAYABLES & DISBURSEMENTS
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- 4. Supplier Payables & Disbursements ---");

    // 4.1 Create Hotel Payable: ₹35,000
    const payableHotel = await financeService.createSupplierPayable(
      agencyA.id,
      {
        supplierId: supplierA1.id,
        bookingId: bookingA.id,
        tripOperationId: opA.id,
        serviceType: "HOTEL",
        description: "5 Nights Luxury Suite with Breakfast",
        plannedAmount: 35000,
        actualAmount: 35000,
        dueDate: new Date("2026-09-08").toISOString(),
      },
      userA.id
    );

    assert("Hotel supplier payable created with number", payableHotel.payableNumber.startsWith("PAYABLE-"));
    assert("Payable initial status is PENDING", payableHotel.status === SupplierPayableStatus.PENDING);
    assert("Payable outstandingAmount equals ₹35,000", Number(payableHotel.outstandingAmount) === 35000);

    // 4.2 Create Vehicle Payable: ₹20,000
    const payableTransport = await financeService.createSupplierPayable(
      agencyA.id,
      {
        supplierId: supplierA2.id,
        bookingId: bookingA.id,
        tripOperationId: opA.id,
        serviceType: "VEHICLE",
        description: "Innova Crysta 6 Days Dedicated Chauffeur",
        plannedAmount: 20000,
        actualAmount: 20000,
        dueDate: new Date("2026-09-09").toISOString(),
      },
      userA.id
    );

    assert("Transport payable created cleanly", Number(payableTransport.outstandingAmount) === 20000);

    // 4.3 Partial Disbursement to Hotel: ₹15,000
    const spay1 = await financeService.recordSupplierPayment(
      agencyA.id,
      {
        supplierId: supplierA1.id,
        payableId: payableHotel.id,
        amount: 15000,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        referenceNumber: "RTGS/HOTEL/01",
        paidBy: "Finance Admin",
      },
      userA.id
    );

    const updatedPayableHotel1 = await prisma.supplierPayable.findUnique({ where: { id: payableHotel.id } });
    assert("Supplier disbursement record created", spay1.paymentNumber.startsWith("SPAY-"));
    assert("Hotel payable paidAmount is ₹15,000", Number(updatedPayableHotel1?.paidAmount) === 15000);
    assert("Hotel payable outstanding is ₹20,000", Number(updatedPayableHotel1?.outstandingAmount) === 20000);
    assert("Hotel payable transitioned to PARTIALLY_PAID", updatedPayableHotel1?.status === SupplierPayableStatus.PARTIALLY_PAID);

    // 4.4 Full Disbursement for Transport: ₹20,000
    await financeService.recordSupplierPayment(
      agencyA.id,
      {
        supplierId: supplierA2.id,
        payableId: payableTransport.id,
        amount: 20000,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      },
      userA.id
    );

    const updatedTransportPayable = await prisma.supplierPayable.findUnique({ where: { id: payableTransport.id } });
    assert("Transport payable paidAmount is ₹20,000", Number(updatedTransportPayable?.paidAmount) === 20000);
    assert("Transport payable outstanding is ₹0", Number(updatedTransportPayable?.outstandingAmount) === 0);
    assert("Transport payable status transitioned to PAID", updatedTransportPayable?.status === SupplierPayableStatus.PAID);

    // ═════════════════════════════════════════════════════════════════
    // 5. OPERATIONAL EXPENSES
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- 5. Operational Expenses Management ---");

    // 5.1 Fuel Expense: ₹4,000
    const exp1 = await financeService.createExpense(
      agencyA.id,
      {
        bookingId: bookingA.id,
        tripOperationId: opA.id,
        category: ExpenseCategory.FUEL,
        amount: 4000,
        description: "Diesel top-up Srinagar to Gulmarg",
        paidBy: "Driver Ramesh",
        receiptNumber: "BILL-101",
      },
      userA.id
    );
    assert("Fuel expense logged with number", exp1.expenseNumber.startsWith("EXP-"));

    // 5.2 Toll Expense: ₹1,000
    const exp2 = await financeService.createExpense(
      agencyA.id,
      {
        bookingId: bookingA.id,
        tripOperationId: opA.id,
        category: ExpenseCategory.TOLL,
        amount: 1000,
        description: "Highway toll tags",
        paidBy: "Driver Ramesh",
      },
      userA.id
    );
    assert("Toll expense logged cleanly", Number(exp2.amount) === 1000);

    // 5.3 Update Expense
    const updatedExp1 = await financeService.updateExpense(
      agencyA.id,
      exp1.id,
      { amount: 4500, description: "Diesel top-up Srinagar to Gulmarg (Adjusted)" },
      userA.id
    );
    assert("Expense updated to ₹4,500", Number(updatedExp1.amount) === 4500);

    // ═════════════════════════════════════════════════════════════════
    // 6. SERVER-AUTHORITATIVE PROFITABILITY & MATHEMATICAL VALIDATION
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- 6. Server-Authoritative Profitability Calculations ---");

    // Booking A Financial Breakdown
    // Revenue: ₹100,000
    // Net Customer Received: ₹30,000 + ₹40,000 + (₹30,000 - ₹10,000) = ₹90,000
    // Customer Outstanding: ₹10,000
    // Supplier Costs: Hotel (₹35,000) + Transport (₹20,000) = ₹55,000
    // Supplier Paid: Hotel (₹15,000) + Transport (₹20,000) = ₹35,000
    // Supplier Outstanding: ₹55,000 - ₹35,000 = ₹20,000
    // Operational Expenses: ₹4,500 + ₹1,000 = ₹5,500
    // Gross Profit: ₹100,000 - ₹55,000 - ₹5,500 = ₹39,500
    // Profit Margin %: (39,500 / 100,000) * 100 = 39.5%
    // Net Cash Position: ₹90,000 (Customer Recv) - ₹35,000 (Supplier Paid) - ₹5,500 (Expenses) = ₹49,500

    const bBreakdown = await financeService.getBookingFinanceBreakdown(agencyA.id, bookingA.id);

    assert("Breakdown Revenue is ₹100,000", bBreakdown.totalBookingAmount === 100000);
    assert("Breakdown Customer Received is ₹90,000", bBreakdown.customerPaid === 90000);
    assert("Breakdown Customer Outstanding is ₹10,000", bBreakdown.customerOutstanding === 10000);
    assert("Breakdown Supplier Cost Actual is ₹55,000", bBreakdown.supplierCostActual === 55000);
    assert("Breakdown Supplier Paid is ₹35,000", bBreakdown.supplierPaid === 35000);
    assert("Breakdown Supplier Outstanding is ₹20,000", bBreakdown.supplierOutstanding === 20000);
    assert("Breakdown Operational Expenses is ₹5,500", bBreakdown.operationalExpenses === 5500);
    assert("Breakdown Gross Profit is ₹39,500", bBreakdown.grossProfit === 39500);
    assert("Breakdown Profit Margin is 39.5%", bBreakdown.profitMarginPercent === 39.5);
    assert("Breakdown Net Cash Position is ₹49,500", bBreakdown.netCashPosition === 49500);

    // Executive Dashboard Verification
    const dashboard = await financeService.getFinanceDashboard(agencyA.id, { preset: "LAST_30_DAYS" });

    assert("Dashboard Total Sales is ₹100,000", dashboard.kpis.totalSales === 100000);
    assert("Dashboard Net Amount Received is ₹90,000", dashboard.kpis.amountReceived === 90000);
    assert("Dashboard Customer Outstanding is ₹10,000", dashboard.kpis.customerOutstanding === 10000);
    assert("Dashboard Supplier Payable is ₹55,000", dashboard.kpis.supplierPayable === 55000);
    assert("Dashboard Supplier Paid is ₹35,000", dashboard.kpis.supplierPaid === 35000);
    assert("Dashboard Supplier Outstanding is ₹20,000", dashboard.kpis.supplierOutstanding === 20000);
    assert("Dashboard Operational Expenses is ₹5,500", dashboard.kpis.operationalExpenses === 5500);
    assert("Dashboard Gross Profit is ₹39,500", dashboard.kpis.grossProfit === 39500);
    assert("Dashboard Profit Margin is 39.5%", dashboard.kpis.profitMarginPercent === 39.5);
    assert("Dashboard Net Cash Position is ₹49,500", dashboard.kpis.netCashPosition === 49500);

    // ═════════════════════════════════════════════════════════════════
    // 7. MULTI-TENANT ISOLATION & IDOR PROTECTION
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- 7. Multi-Tenant Isolation & IDOR Protection ---");

    const dashB = await financeService.getFinanceDashboard(agencyB.id, { preset: "LAST_30_DAYS" });
    assert("Agency B dashboard shows zero sales (complete isolation)", dashB.kpis.totalSales === 0);
    assert("Agency B dashboard shows zero cash position", dashB.kpis.netCashPosition === 0);

    // Agency B trying to record payment on Agency A booking
    let crossAgencyPaymentFailed = false;
    try {
      await financeService.recordCustomerPayment(
        agencyB.id,
        {
          bookingId: bookingA.id,
          amount: 5000,
          paymentType: PaymentType.PARTIAL,
          paymentMethod: PaymentMethod.CASH,
        }
      );
    } catch (err: any) {
      crossAgencyPaymentFailed = true;
    }
    assert("Agency B blocked from recording payment on Agency A booking", crossAgencyPaymentFailed);

    // ═════════════════════════════════════════════════════════════════
    // 8. OPERATIONS FINALIZATION IMMUTABILITY LOCK INTEGRATION
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- 8. Operations Finalization Immutability Lock ---");

    // Set operation to COMPLETED to allow finalization
    await prisma.tripOperation.update({
      where: { id: opA.id },
      data: { status: OperationStatus.COMPLETED },
    });

    // Finalize Operation A (Phase 10.13I)
    await operationsService.finalizeOperation(agencyA.id, opA.id, {
      closureNotes: "Tour completed and audited.",
    }, userA.name);

    // Attempting to record customer payment on finalized operation
    let finalizedPaymentFailed = false;
    try {
      await financeService.recordCustomerPayment(
        agencyA.id,
        {
          bookingId: bookingA.id,
          amount: 1000,
          paymentType: PaymentType.FINAL,
          paymentMethod: PaymentMethod.UPI,
        },
        userA.id
      );
    } catch (err: any) {
      finalizedPaymentFailed = true;
    }
    assert("Modifying payment on finalized operation is BLOCKED by immutability lock", finalizedPaymentFailed);

    // Attempting to log expense on finalized operation
    let finalizedExpenseFailed = false;
    try {
      await financeService.createExpense(
        agencyA.id,
        {
          bookingId: bookingA.id,
          tripOperationId: opA.id,
          category: ExpenseCategory.MISCELLANEOUS,
          amount: 500,
          description: "Late tip",
        },
        userA.id
      );
    } catch (err: any) {
      finalizedExpenseFailed = true;
    }
    assert("Logging expense on finalized operation is BLOCKED by immutability lock", finalizedExpenseFailed);

    // Reopen operation with explicit reason
    await operationsService.reopenOperation(agencyA.id, opA.id, {
      reopenReason: "Late customer surcharge settlement approved by manager.",
    }, userA.name);

    // Mutation should now be permitted
    const reopenPay = await financeService.recordCustomerPayment(
      agencyA.id,
      {
        bookingId: bookingA.id,
        amount: 10000,
        paymentType: PaymentType.FINAL,
        paymentMethod: PaymentMethod.UPI,
        referenceNumber: "UPI/FINAL/SURCHARGE",
      },
      userA.id
    );
    assert("Financial mutation allowed after legitimate operation reopen", !!reopenPay.id);

    // ═════════════════════════════════════════════════════════════════
    // 9. UNIFIED TRANSACTIONS LEDGER & CSV EXPORT
    // ═════════════════════════════════════════════════════════════════
    console.log("\n--- 9. Unified Transaction Ledger & CSV Export ---");

    const allTxns = await financeService.getTransactions(agencyA.id, {
      page: 1,
      limit: 50,
      type: "ALL",
    });

    assert("Unified transaction ledger returns items", allTxns.data.length >= 6);
    assert("Transaction meta pagination total count matches", allTxns.meta.total >= 6);

    const csvReport = await financeService.generateFinanceCsv(agencyA.id, { preset: "LAST_30_DAYS" });
    assert("CSV export includes Executive Summary title", csvReport.includes("TRIPDESK FINANCE & PROFITABILITY REPORT"));
    assert("CSV export contains Grand Palace Hotel payable", csvReport.includes("Grand Palace Hotel"));
    assert("CSV export contains customer name Pooja Sharma", csvReport.includes("Pooja Sharma"));

  } catch (error: any) {
    console.error("\n💥 UNEXPECTED ERROR IN TEST RUNNER:", error);
    failed++;
  }

  console.log("\n=======================================================");
  console.log(`   PHASE 10.14 QA TEST RUN COMPLETE`);
  console.log(`   RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase10_14Tests();
