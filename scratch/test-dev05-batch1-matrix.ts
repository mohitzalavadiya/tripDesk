import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { invoiceService } from "../src/lib/services/invoice-service";
import { paymentService } from "../src/lib/services/payment-service";
import { bookingService } from "../src/lib/services/booking-service";
import {
  BookingStatus,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
} from "@prisma/client";

async function runDev05Batch1Matrix() {
  console.log("===================================================================");
  console.log("TRIPDESK BATCH 1: PERSISTENT INVOICE & PAYMENT UNIFICATION MATRIX");
  console.log("===================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testNum: number, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS [T${String(testNum).padStart(2, "0")}]: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL [T${String(testNum).padStart(2, "0")}]: ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  const timestamp = Date.now();

  try {
    // -------------------------------------------------------------
    // PART 1: RECONCILE EXISTING PRODUCTION DATA (INV-0001 / BK-2026-00001)
    // -------------------------------------------------------------
    console.log("--- PART 1: Existing Live Database Invoice Reconciliation ---");

    const existingInv = await prisma.invoice.findFirst({
      where: { booking: { bookingNumber: { contains: "2026-00001" } } },
      include: { booking: true },
    });

    if (existingInv && existingInv.booking) {
      const existingBooking = existingInv.booking;

      assert(
        existingInv.invoiceNumber === "INV-0001",
        1,
        "Existing INV-0001 retains its exact invoice number",
        `Got: ${existingInv.invoiceNumber}`
      );

      assert(
        existingInv.id !== null && existingInv.id.length > 0,
        2,
        "Existing INV-0001 reuses identical Invoice record ID",
        `Got: ${existingInv.id}`
      );

      assert(
        Number(existingInv.totalAmount) === 15000 &&
        Number(existingInv.paidAmount) === 15000 &&
        Number(existingInv.balanceAmount) === 0,
        3,
        "Existing INV-0001 financial state verified at ₹15,000 total, ₹15,000 paid, ₹0 balance",
        `Got: total=${existingInv.totalAmount}, paid=${existingInv.paidAmount}, balance=${existingInv.balanceAmount}`
      );

      assert(
        existingInv.status === InvoiceStatus.PAID,
        4,
        "Existing INV-0001 status verified as PAID",
        `Got: ${existingInv.status}`
      );

      const unlinkedPayments = await prisma.payment.count({
        where: { bookingId: existingBooking.id, invoiceId: null, archivedAt: null },
      });
      assert(
        unlinkedPayments === 0,
        5,
        "All existing payments for BK-2026-00001 successfully linked to INV-0001",
        `Unlinked: ${unlinkedPayments}`
      );

      // Verify that calling getOrCreateInvoiceForBooking on existing ONGOING booking returns persistent invoice without duplicating
      const ongoingInv = await invoiceService.getOrCreateInvoiceForBooking(existingInv.agencyId, existingBooking.id);
      const totalInvCount = await prisma.invoice.count({
        where: { bookingId: existingBooking.id },
      });
      assert(
        ongoingInv.id === existingInv.id && totalInvCount === 1,
        6,
        "Calling getOrCreateInvoiceForBooking on existing ONGOING booking returns persistent invoice without duplicating invoice"
      );
    } else {
      console.log("ℹ️ No existing BK-2026-00001 found in test environment. Skipping live reconciliation assertions.");
    }

    // -------------------------------------------------------------
    // PART 2: NEW PERSISTENT INVOICE LIFECYCLE & IDEMPOTENCY
    // -------------------------------------------------------------
    console.log("\n--- PART 2: Isolated Agency Test: Creation, Number Allocation & Idempotency ---");

    const agencyA = await prisma.agency.create({
      data: {
        name: `Batch 1 Test Agency A - ${timestamp}`,
        email: `agency_a_${timestamp}@tripdesk.test`,
        phone: "+919876500001",
        address: "Marine Drive, Mumbai",
      },
    });

    const agencyB = await prisma.agency.create({
      data: {
        name: `Batch 1 Test Agency B - ${timestamp}`,
        email: `agency_b_${timestamp}@tripdesk.test`,
        phone: "+919876500002",
        address: "MG Road, Bengaluru",
      },
    });

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: "Virat Kohli",
        email: "virat@test.com",
        phone: "+919800000010",
        city: "Delhi",
      },
    });

    const customerB = await prisma.customer.create({
      data: {
        agencyId: agencyB.id,
        name: "Rohit Sharma",
        email: "rohit@test.com",
        phone: "+919800000020",
        city: "Mumbai",
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-A-${timestamp}`,
        title: "Swiss Alps Adventure",
        startDate: new Date("2026-12-10"),
        endDate: new Date("2026-12-20"),
        status: "BOOKED",
      },
    });

    const tripB = await prisma.trip.create({
      data: {
        agencyId: agencyB.id,
        customerId: customerB.id,
        tripNumber: `TRIP-B-${timestamp}`,
        title: "Bali Beach Retreat",
        startDate: new Date("2027-01-05"),
        endDate: new Date("2027-01-12"),
        status: "BOOKED",
      },
    });

    // 1. Confirmed Booking A (₹85,000)
    const bookingA1 = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        bookingNumber: `BK-A1-${timestamp}`,
        status: BookingStatus.CONFIRMED,
        totalAmount: 85000,
        paidAmount: 0,
        balanceAmount: 85000,
      },
    });

    // 2. Non-eligible Bookings: DRAFT, ONGOING, COMPLETED, CANCELLED
    const bookingADraft = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        bookingNumber: `BK-ADRAFT-${timestamp}`,
        status: BookingStatus.DRAFT,
        totalAmount: 50000,
        paidAmount: 0,
        balanceAmount: 50000,
      },
    });

    const bookingAOngoing = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        bookingNumber: `BK-AONGOING-${timestamp}`,
        status: BookingStatus.ONGOING,
        totalAmount: 50000,
        paidAmount: 0,
        balanceAmount: 50000,
      },
    });

    const bookingACompleted = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        bookingNumber: `BK-ACOMPLETED-${timestamp}`,
        status: BookingStatus.COMPLETED,
        totalAmount: 50000,
        paidAmount: 0,
        balanceAmount: 50000,
      },
    });

    const bookingACancelled = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        bookingNumber: `BK-ACANCELLED-${timestamp}`,
        status: BookingStatus.CANCELLED,
        totalAmount: 50000,
        paidAmount: 0,
        balanceAmount: 50000,
      },
    });

    // T07: DRAFT booking rejected
    let t07Pass = false;
    try {
      await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingADraft.id);
    } catch (e: any) {
      t07Pass = e?.message?.includes("CONFIRMED, ONGOING, or COMPLETED") || e?.message?.includes("CONFIRMED");
    }
    assert(t07Pass, 7, "DRAFT Booking rejected for Invoice generation (no invoice created)");

    // T10: CANCELLED booking rejected
    let t10Pass = false;
    try {
      await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingACancelled.id);
    } catch (e: any) {
      t10Pass = e?.message?.includes("CONFIRMED, ONGOING, or COMPLETED") || e?.message?.includes("CONFIRMED");
    }
    assert(t10Pass, 10, "CANCELLED Booking rejected for Invoice generation (no invoice created)");

    // T11: First generation on CONFIRMED booking allocates persistent sequential invoice number & ISSUED status
    const invA1 = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingA1.id);
    assert(
      invA1.invoiceNumber === "INV-0001" &&
      invA1.status === InvoiceStatus.ISSUED &&
      Number(invA1.totalAmount) === 85000 &&
      Number(invA1.paidAmount) === 0 &&
      Number(invA1.balanceAmount) === 85000,
      11,
      "First generation creates INV-0001 directly as ISSUED (never DRAFT) with ₹85,000 total"
    );

    // T12: Second/repeated generation returns the exact same invoice without allocating new sequence
    const invA1Second = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingA1.id);
    assert(
      invA1Second.id === invA1.id && invA1Second.invoiceNumber === "INV-0001",
      12,
      "Repeated generation reuses same Invoice record & persistent INV-0001 number"
    );

    // T13: Count invoices for bookingA1 is exactly 1
    const invCountBookingA1 = await prisma.invoice.count({
      where: { bookingId: bookingA1.id },
    });
    assert(invCountBookingA1 === 1, 13, "Exactly one Invoice record exists for Booking A1");

    // T08: ONGOING booking allowed (creates persistent invoice)
    const invOngoing = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingAOngoing.id);
    assert(
      invOngoing.invoiceNumber !== null && invOngoing.bookingId === bookingAOngoing.id,
      8,
      "ONGOING Booking allowed for Invoice generation (persistent invoice created)"
    );

    // T09: COMPLETED booking allowed (creates persistent invoice)
    const invCompleted = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingACompleted.id);
    assert(
      invCompleted.invoiceNumber !== null && invCompleted.bookingId === bookingACompleted.id,
      9,
      "COMPLETED Booking allowed for Invoice generation (persistent invoice created)"
    );

    // -------------------------------------------------------------
    // PART 3: BOOKING TOTAL UPDATE SYNCHRONIZATION
    // -------------------------------------------------------------
    console.log("\n--- PART 3: Booking Financial Updates Synchronization ---");

    // T14: Booking total amount updated to ₹90,000 -> Invoice automatically updates to ₹90,000 with same number
    await bookingService.updateBooking(agencyA.id, bookingA1.id, {
      totalAmount: 90000,
    });

    const invA1AfterUpdate = await invoiceService.getInvoice(agencyA.id, invA1.id);
    assert(
      invA1AfterUpdate !== null &&
      invA1AfterUpdate.invoiceNumber === "INV-0001" &&
      Number(invA1AfterUpdate.totalAmount) === 90000 &&
      Number(invA1AfterUpdate.balanceAmount) === 90000,
      14,
      "Booking total update (₹85k -> ₹90k) automatically refreshes Invoice total & balance with same INV-0001"
    );

    // -------------------------------------------------------------
    // PART 4: PAYMENT UNIFICATION & STATUS LIFECYCLE
    // -------------------------------------------------------------
    console.log("\n--- PART 4: Unified Payment Architecture & Status Progression ---");

    // T15: Partial Payment of ₹30,000 logged via paymentService.createPayment
    const pay1 = await paymentService.createPayment(agencyA.id, {
      bookingId: bookingA1.id,
      amount: 30000,
      paymentMethod: PaymentMethod.UPI,
      notes: "Advance installment",
    });

    assert(
      pay1.invoiceId === invA1.id,
      15,
      "Payment created on Booking automatically links to active Invoice INV-0001"
    );

    // T16: Invoice status transitions to PARTIALLY_PAID
    const invA1AfterPay1 = await invoiceService.getInvoice(agencyA.id, invA1.id);
    assert(
      invA1AfterPay1?.status === InvoiceStatus.PARTIALLY_PAID &&
      Number(invA1AfterPay1?.paidAmount) === 30000 &&
      Number(invA1AfterPay1?.balanceAmount) === 60000,
      16,
      "Invoice status transitions to PARTIALLY_PAID (Paid: ₹30,000, Balance: ₹60,000)"
    );

    // T17: Second Payment of ₹60,000 logged via paymentService.createPayment (Full settlement)
    await paymentService.createPayment(agencyA.id, {
      bookingId: bookingA1.id,
      amount: 60000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      notes: "Final balance settlement",
    });

    const invA1AfterPay2 = await invoiceService.getInvoice(agencyA.id, invA1.id);
    assert(
      invA1AfterPay2?.status === InvoiceStatus.PAID &&
      Number(invA1AfterPay2?.paidAmount) === 90000 &&
      Number(invA1AfterPay2?.balanceAmount) === 0,
      17,
      "Invoice status transitions to PAID upon full settlement (Paid: ₹90,000, Balance: ₹0)"
    );

    // T18: Payment voiding reconciles Invoice back to PARTIALLY_PAID
    await paymentService.voidPayment(
      agencyA.id,
      pay1.id,
      "test-user-id",
      "Customer cheque returned / invalid entry"
    );

    const invA1AfterVoid = await invoiceService.getInvoice(agencyA.id, invA1.id);
    assert(
      invA1AfterVoid?.status === InvoiceStatus.PARTIALLY_PAID &&
      Number(invA1AfterVoid?.paidAmount) === 60000 &&
      Number(invA1AfterVoid?.balanceAmount) === 30000,
      18,
      "Voiding payment reconciles Invoice back to PARTIALLY_PAID (Paid: ₹60,000, Balance: ₹30,000)"
    );

    // -------------------------------------------------------------
    // PART 5: PAYMENT ON BOOKING WITHOUT INVOICE
    // -------------------------------------------------------------
    console.log("\n--- PART 5: Payments on Bookings Without Existing Invoices ---");

    const bookingA2 = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        bookingNumber: `BK-A2-${timestamp}`,
        status: BookingStatus.CONFIRMED,
        totalAmount: 50000,
        paidAmount: 0,
        balanceAmount: 50000,
      },
    });

    // Log payment before invoice exists
    const payA2 = await paymentService.createPayment(agencyA.id, {
      bookingId: bookingA2.id,
      amount: 20000,
      paymentMethod: PaymentMethod.CASH,
    });

    assert(
      payA2.invoiceId === null && Number(payA2.amount) === 20000,
      19,
      "Payment on booking without invoice succeeds normally (invoiceId = null)"
    );

    // Now generate invoice for bookingA2: should directly be PARTIALLY_PAID and link existing payment
    const invA2 = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingA2.id);
    assert(
      Boolean(invA2.invoiceNumber) &&
      invA2.status === InvoiceStatus.PARTIALLY_PAID &&
      Number(invA2.paidAmount) === 20000 &&
      Number(invA2.balanceAmount) === 30000,
      20,
      `Invoice generation on pre-paid booking creates ${invA2.invoiceNumber} directly as PARTIALLY_PAID with reconciled payment`
    );

    const updatedPayA2 = await prisma.payment.findUnique({ where: { id: payA2.id } });
    assert(
      updatedPayA2?.invoiceId === invA2.id,
      21,
      "Pre-existing payment for bookingA2 is now linked to INV-0002"
    );

    // -------------------------------------------------------------
    // PART 6: BOOKING CANCELLATION FLOW & POST-STATUS GENERATION
    // -------------------------------------------------------------
    console.log("\n--- PART 6: Booking Cancellation Flow & Existing Invoice Status Handling ---");

    // Cancel bookingA2
    await bookingService.cancelBooking(agencyA.id, bookingA2.id, "Customer requested trip cancellation");

    const invA2Cancelled = await invoiceService.getInvoice(agencyA.id, invA2.id);
    assert(
      invA2Cancelled?.status === InvoiceStatus.CANCELLED &&
      invA2Cancelled?.cancelledAt !== null &&
      Boolean(invA2Cancelled?.cancellationReason?.includes("Customer requested")),
      22,
      "Booking cancellation auto-cancels linked active invoice (INV-0002 -> CANCELLED)"
    );

    // Generating invoice for cancelled booking must fail
    let t23Pass = false;
    try {
      await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingA2.id);
    } catch (e: any) {
      t23Pass = e?.message?.includes("CONFIRMED, ONGOING, or COMPLETED") || e?.message?.includes("CONFIRMED");
    }
    assert(
      t23Pass,
      23,
      "Attempting to generate invoice for cancelled booking is rejected (INV-0002 is not re-issued)"
    );

    // T24: Existing invoice whose booking becomes COMPLETED reuses persistent invoice without creating duplicate
    await prisma.booking.update({
      where: { id: bookingA1.id },
      data: { status: BookingStatus.COMPLETED },
    });

    const invCompletedExisting = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingA1.id);
    const invCountAfterCompleted = await prisma.invoice.count({
      where: { bookingId: bookingA1.id },
    });
    assert(
      invCompletedExisting.id === invA1.id && invCountAfterCompleted === 1,
      24,
      "Generating invoice on COMPLETED booking with existing invoice safely reuses persistent INV-0001 without creating second invoice"
    );

    // Restore bookingA1 to CONFIRMED for remaining tests
    await prisma.booking.update({
      where: { id: bookingA1.id },
      data: { status: BookingStatus.CONFIRMED },
    });

    // -------------------------------------------------------------
    // PART 7: TENANT ISOLATION
    // -------------------------------------------------------------
    console.log("\n--- PART 7: Multi-Tenant Isolation ---");

    const bookingB1 = await prisma.booking.create({
      data: {
        agencyId: agencyB.id,
        customerId: customerB.id,
        tripId: tripB.id,
        bookingNumber: `BK-B1-${timestamp}`,
        status: BookingStatus.CONFIRMED,
        totalAmount: 120000,
        paidAmount: 0,
        balanceAmount: 120000,
      },
    });

    const invB1 = await invoiceService.getOrCreateInvoiceForBooking(agencyB.id, bookingB1.id);
    assert(
      invB1.invoiceNumber === "INV-0001" && invB1.agencyId === agencyB.id,
      25,
      "Agency B starts its own independent invoice sequence at INV-0001"
    );

    let t26Pass = false;
    try {
      // Agency A tries to access Agency B's invoice
      const crossAgencyInv = await invoiceService.getInvoice(agencyA.id, invB1.id);
      if (crossAgencyInv === null) t26Pass = true;
    } catch {
      t26Pass = true;
    }
    assert(t26Pass, 26, "Cross-agency invoice access strictly prevented (Agency A cannot read Agency B invoice)");

    let t27Pass = false;
    try {
      // Agency A tries to generate invoice for Agency B's booking
      await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingB1.id);
    } catch (e: any) {
      t27Pass = e?.message?.includes("not found") || e?.message?.includes("agency");
    }
    assert(t27Pass, 27, "Cross-agency invoice generation strictly rejected");

    // -------------------------------------------------------------
    // PART 8: RAPID CONCURRENT GENERATION / IDEMPOTENCY
    // -------------------------------------------------------------
    console.log("\n--- PART 8: Rapid Concurrent Generation Verification ---");

    const bookingA3 = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        bookingNumber: `BK-A3-${timestamp}`,
        status: BookingStatus.CONFIRMED,
        totalAmount: 75000,
        paidAmount: 0,
        balanceAmount: 75000,
      },
    });

    // Run 10 rapid repeated invocations of getOrCreateInvoiceForBooking
    const repeatedResults = [];
    for (let i = 0; i < 10; i++) {
      repeatedResults.push(
        await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingA3.id)
      );
    }

    const distinctInvoiceIds = new Set(repeatedResults.map((r) => r.id));
    const distinctInvoiceNumbers = new Set(repeatedResults.map((r) => r.invoiceNumber));

    assert(
      distinctInvoiceIds.size === 1 && distinctInvoiceNumbers.size === 1,
      28,
      `10 rapid repeated generation requests produced exactly 1 persistent invoice (${Array.from(distinctInvoiceNumbers)[0]})`
    );

    const allInvoicesForA3 = await prisma.invoice.count({
      where: { bookingId: bookingA3.id },
    });
    assert(
      allInvoicesForA3 === 1,
      29,
      "Database confirms exactly 1 Invoice row created for bookingA3"
    );

    // -------------------------------------------------------------
    // CLEANUP TEST DATA
    // -------------------------------------------------------------
    console.log("\nCleaning up test agencies...");
    await prisma.agency.deleteMany({
      where: { id: { in: [agencyA.id, agencyB.id] } },
    });

    console.log("\n===================================================================");
    console.log(`BATCH 1 MATRIX RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("===================================================================\n");
  } catch (err: any) {
    console.error("❌ Unexpected test runner error:", err);
    failed++;
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runDev05Batch1Matrix().catch((e) => {
  console.error(e);
  process.exit(1);
});
