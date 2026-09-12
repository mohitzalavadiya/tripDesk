import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { invoiceService } from "../src/lib/services/invoice-service";
import { bookingService } from "../src/lib/services/booking-service";
import { paymentService } from "../src/lib/services/payment-service";
import { invoicePdfService } from "../src/lib/services/invoice-pdf-service";
import { BookingStatus, PaymentMethod, InvoiceStatus } from "@prisma/client";

async function runConsolidationMatrix() {
  console.log("===================================================================");
  console.log("TRIPDESK: INVOICE UI CONSOLIDATION & ELIGIBILITY VERIFICATION SUITE");
  console.log("===================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, num: number, description: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS [T${String(num).padStart(2, "0")}]: ${description}`);
      passed++;
    } else {
      console.error(`❌ FAIL [T${String(num).padStart(2, "0")}]: ${description}${detail ? ` -> ${detail}` : ""}`);
      failed++;
    }
  }

  const timestamp = Date.now();

  try {
    // Setup test agencies
    const agencyA = await prisma.agency.create({
      data: {
        name: `Consolidation Agency A - ${timestamp}`,
        email: `agency_cons_a_${timestamp}@tripdesk.test`,
        phone: "+919876543210",
        address: "Nariman Point, Mumbai",
      },
    });

    const agencyB = await prisma.agency.create({
      data: {
        name: `Consolidation Agency B - ${timestamp}`,
        email: `agency_cons_b_${timestamp}@tripdesk.test`,
        phone: "+919876543220",
        address: "Connaught Place, New Delhi",
      },
    });

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: "Aarav Mehta",
        email: "aarav@test.com",
        phone: "+919900000001",
        city: "Mumbai",
      },
    });

    const customerB = await prisma.customer.create({
      data: {
        agencyId: agencyB.id,
        name: "Diya Patel",
        email: "diya@test.com",
        phone: "+919900000002",
        city: "Ahmedabad",
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-CONS-A-${timestamp}`,
        title: "Kashmir Paradise Tour",
        startDate: new Date("2026-11-01"),
        endDate: new Date("2026-11-10"),
        status: "BOOKED",
      },
    });

    // ─── PART 1: ELIGIBILITY MATRIX (CONFIRMED, ONGOING, COMPLETED ALLOWED; DRAFT, CANCELLED REJECTED) ───
    console.log("--- PART 1: Status Eligibility Matrix ---");

    // 1. CONFIRMED Booking with no invoice -> Generate Invoice allowed
    const bookingConfirmed = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        bookingNumber: `BK-CONF-${timestamp}`,
        status: BookingStatus.CONFIRMED,
        totalAmount: 100000,
        paidAmount: 0,
        balanceAmount: 100000,
      },
    });

    const invConfirmed = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingConfirmed.id);
    assert(
      invConfirmed.invoiceNumber !== null && invConfirmed.bookingId === bookingConfirmed.id,
      1,
      "CONFIRMED booking successfully generates persistent invoice (INV-0001)"
    );

    // 2. Calling Generate Invoice again reuses identical invoice (Decision #18)
    const invConfirmed2 = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingConfirmed.id);
    assert(
      invConfirmed2.id === invConfirmed.id && invConfirmed2.invoiceNumber === invConfirmed.invoiceNumber,
      2,
      "Subsequent invoice generation call reuses identical persistent invoice without duplicate rows"
    );

    // 3. ONGOING Booking with no invoice -> Generate Invoice allowed
    const bookingOngoing = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        bookingNumber: `BK-ONG-${timestamp}`,
        status: BookingStatus.ONGOING,
        totalAmount: 75000,
        paidAmount: 0,
        balanceAmount: 75000,
      },
    });

    const invOngoing = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingOngoing.id);
    assert(
      invOngoing.invoiceNumber !== null && invOngoing.bookingId === bookingOngoing.id,
      3,
      "ONGOING booking successfully generates persistent invoice"
    );

    // 4. COMPLETED Booking with no invoice -> Generate Invoice allowed
    const bookingCompleted = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        bookingNumber: `BK-COMP-${timestamp}`,
        status: BookingStatus.COMPLETED,
        totalAmount: 60000,
        paidAmount: 0,
        balanceAmount: 60000,
      },
    });

    const invCompleted = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingCompleted.id);
    assert(
      invCompleted.invoiceNumber !== null && invCompleted.bookingId === bookingCompleted.id,
      4,
      "COMPLETED booking successfully generates persistent invoice"
    );

    // 5. DRAFT Booking -> Invoice generation strictly rejected
    const bookingDraft = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        bookingNumber: `BK-DRF-${timestamp}`,
        status: BookingStatus.DRAFT,
        totalAmount: 40000,
        paidAmount: 0,
        balanceAmount: 40000,
      },
    });

    let draftRejectionPass = false;
    try {
      await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingDraft.id);
    } catch (e: any) {
      draftRejectionPass = e?.message?.includes("CONFIRMED, ONGOING, or COMPLETED") || e?.message?.includes("CONFIRMED");
    }
    assert(draftRejectionPass, 5, "DRAFT booking is strictly rejected for invoice generation");

    // 6. CANCELLED Booking -> New invoice generation strictly rejected
    const bookingCancelled = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        bookingNumber: `BK-CANC-${timestamp}`,
        status: BookingStatus.CANCELLED,
        totalAmount: 40000,
        paidAmount: 0,
        balanceAmount: 40000,
      },
    });

    let cancelledRejectionPass = false;
    try {
      await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingCancelled.id);
    } catch (e: any) {
      cancelledRejectionPass = e?.message?.includes("CONFIRMED, ONGOING, or COMPLETED") || e?.message?.includes("CONFIRMED");
    }
    assert(cancelledRejectionPass, 6, "CANCELLED booking is strictly rejected for new invoice generation");

    // ─── PART 2: BOOKING SERVICE INVOICE RELATIONS & DETAIL INTEGRITY ───
    console.log("\n--- PART 2: Booking Detail Live Query & Relations ---");

    // 7. Booking Detail query returns invoices array
    const bookingDetails = await bookingService.getBooking(agencyA.id, bookingConfirmed.id);
    assert(
      Array.isArray(bookingDetails?.invoices) && bookingDetails!.invoices!.length === 1,
      7,
      "bookingService.getBooking returns invoices array with active invoice relation"
    );

    // 8. Financial values match live booking state
    assert(
      Number(bookingDetails?.invoices?.[0]?.totalAmount) === 100000 &&
      Number(bookingDetails?.invoices?.[0]?.balanceAmount) === 100000,
      8,
      "Active invoice relation reflects authoritative booking totals"
    );

    // 9. Payment synchronization
    const payment = await paymentService.createPayment(agencyA.id, {
      bookingId: bookingConfirmed.id,
      amount: 40000,
      paymentMethod: PaymentMethod.UPI,
      notes: "Advance installment",
    });

    const refreshedInvoice = await invoiceService.getInvoice(agencyA.id, invConfirmed.id);
    assert(
      refreshedInvoice?.status === InvoiceStatus.PARTIALLY_PAID &&
      Number(refreshedInvoice?.paidAmount) === 40000 &&
      Number(refreshedInvoice?.balanceAmount) === 60000,
      9,
      "Payment creation synchronizes persistent invoice status (PARTIALLY_PAID, Balance: ₹60,000)"
    );

    // 10. PDF generation on persistent invoice
    const pdfBuffer = await invoicePdfService.generateInvoicePdf(refreshedInvoice!);
    assert(
      Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 500,
      10,
      "invoicePdfService generates valid high-resolution PDF for persistent invoice"
    );

    // ─── PART 3: TENANT ISOLATION ───
    console.log("\n--- PART 3: Tenant Security Isolation ---");

    // 11. Cross-agency invoice access strictly prevented
    const crossAgencyInv = await invoiceService.getInvoice(agencyB.id, invConfirmed.id);
    assert(crossAgencyInv === null, 11, "Agency B cannot read Agency A invoice (returns null)");

    // 12. Cross-agency invoice generation strictly rejected
    let crossGenBlocked = false;
    try {
      await invoiceService.getOrCreateInvoiceForBooking(agencyB.id, bookingConfirmed.id);
    } catch {
      crossGenBlocked = true;
    }
    assert(crossGenBlocked, 12, "Agency B cannot generate invoice for Agency A booking");

    // Clean up test data
    console.log("\nCleaning up test agencies...");
    await prisma.agency.deleteMany({
      where: { id: { in: [agencyA.id, agencyB.id] } },
    });

    console.log("\n===================================================================");
    console.log(`CONSOLIDATION MATRIX RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("===================================================================\n");
  } catch (err: any) {
    console.error("❌ Unexpected test runner error:", err);
    failed++;
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runConsolidationMatrix().catch((e) => {
  console.error(e);
  process.exit(1);
});
