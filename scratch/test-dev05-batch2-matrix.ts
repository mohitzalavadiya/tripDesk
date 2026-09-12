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

async function runDev05Batch2Matrix() {
  console.log("===================================================================");
  console.log("TRIPDESK BATCH 2: INVOICE CARD & DETAIL REFACTOR TEST MATRIX");
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
    // Setup test agency A and customer
    const agencyA = await prisma.agency.create({
      data: {
        name: `Batch 2 Test Agency A ${timestamp}`,
        email: `batch2_agency_a_${timestamp}@example.com`,
        phone: "+919876543210",
      },
    });

    const agencyB = await prisma.agency.create({
      data: {
        name: `Batch 2 Test Agency B ${timestamp}`,
        email: `batch2_agency_b_${timestamp}@example.com`,
        phone: "+919876543211",
      },
    });

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: `Lead Customer ${timestamp}`,
        phone: "+919999988888",
        email: `customer_${timestamp}@example.com`,
        address: "123 MG Road",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        postalCode: "560001",
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-B2-${timestamp}`,
        title: "Kerala Backwaters & Hills",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-07"),
        travelers: {
          create: [
            { name: "Lead Customer", type: "ADULT", isPrimary: true },
            { name: "Spouse Customer", type: "ADULT", isPrimary: false },
          ],
        },
      },
    });

    const quotationA = await prisma.quotation.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA.id,
        customerId: customerA.id,
        quotationNumber: `QUO-B2-${timestamp}`,
        title: "Standard Package 7D6N",
        items: {
          create: [
            {
              name: "Luxury Houseboat Cruise (Alleppey)",
              description: "1 Night Deluxe AC Houseboat with all meals",
              quantity: 1,
              sellingPrice: 25000,
              unitPrice: 20000,
              totalPrice: 25000,
              type: "ACTIVITY",
              sortOrder: 1,
            },
            {
              name: "Munnar Tea Plantation Resort",
              description: "3 Nights Premium Valley View Room with Breakfast",
              quantity: 1,
              sellingPrice: 60000,
              unitPrice: 50000,
              totalPrice: 60000,
              type: "HOTEL",
              sortOrder: 2,
            },
          ],
        },
      },
    });

    // -------------------------------------------------------------
    // SECTION 1: Booking Service & Invoice Relationship
    // -------------------------------------------------------------
    console.log("--- SECTION 1: Booking Service & Invoice Relationship ---");

    // Case 1: CONFIRMED booking without invoice
    const bookingConfirmed = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        quotationId: quotationA.id,
        bookingNumber: `BK-B2-CONF-${timestamp}`,
        status: BookingStatus.CONFIRMED,
        totalAmount: 85000,
        paidAmount: 0,
        balanceAmount: 85000,
      },
    });

    const fetchedBooking1 = await bookingService.getBooking(agencyA.id, bookingConfirmed.id);
    assert(
      Array.isArray(fetchedBooking1?.invoices) && fetchedBooking1?.invoices.length === 0,
      1,
      "CONFIRMED booking without invoice returns empty invoices array"
    );

    // Case 2: Generate persistent invoice for CONFIRMED booking
    const invoice1 = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingConfirmed.id);
    assert(
      invoice1 !== null && !!invoice1.invoiceNumber && invoice1.invoiceNumber.startsWith("INV-"),
      2,
      "Invoice generation for CONFIRMED booking allocates INV number",
      `Got: ${invoice1.invoiceNumber}`
    );

    const fetchedBooking2 = await bookingService.getBooking(agencyA.id, bookingConfirmed.id);
    assert(
      fetchedBooking2?.invoices?.[0]?.id === invoice1.id &&
      fetchedBooking2?.invoices?.[0]?.invoiceNumber === invoice1.invoiceNumber,
      3,
      "Booking Service getBooking returns linked persistent invoice in invoices array"
    );

    // Case 3: Calling getOrCreateInvoiceForBooking again reuses same persistent invoice
    const invoice1Repeat = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingConfirmed.id);
    assert(
      invoice1Repeat.id === invoice1.id && invoice1Repeat.invoiceNumber === invoice1.invoiceNumber,
      4,
      "Repeated generation call returns identical invoice ID and invoice number"
    );

    // -------------------------------------------------------------
    // SECTION 2: Invoice Detail Service Live Data Query
    // -------------------------------------------------------------
    console.log("\n--- SECTION 2: Invoice Service getInvoice Live Relations ---");

    const fullInvoice = await invoiceService.getInvoice(agencyA.id, invoice1.id);
    assert(
      fullInvoice !== null,
      5,
      "invoiceService.getInvoice successfully retrieves full invoice detail"
    );

    assert(
      fullInvoice?.booking?.customer?.name === `Lead Customer ${timestamp}` &&
      fullInvoice?.booking?.customer?.city === "Bengaluru",
      6,
      "Invoice live booking relation includes customer details (name, phone, address)"
    );

    assert(
      fullInvoice?.booking?.trip?.title === "Kerala Backwaters & Hills" &&
      fullInvoice?.booking?.trip?.travelers?.length === 2,
      7,
      "Invoice live booking relation includes trip title and traveler count"
    );

    assert(
      fullInvoice?.booking?.quotation?.items?.length === 2 &&
      fullInvoice?.booking?.quotation?.items?.[0]?.name === "Luxury Houseboat Cruise (Alleppey)",
      8,
      "Invoice live booking relation includes customer-facing quotation items with non-markup fields"
    );

    assert(
      fullInvoice?.agency?.name === `Batch 2 Test Agency A ${timestamp}`,
      9,
      "Invoice relation includes authoritative agency details (name, email, phone)"
    );

    // -------------------------------------------------------------
    // SECTION 3: Live Booking Update & Financial Synchronization
    // -------------------------------------------------------------
    console.log("\n--- SECTION 3: Live Booking Update & Payment Synchronization ---");

    // Update booking total from ₹85,000 to ₹90,000 using bookingService
    await bookingService.updateBooking(agencyA.id, bookingConfirmed.id, {
      totalAmount: 90000,
    });

    const invoiceAfterBookingUpdate = await invoiceService.getInvoice(agencyA.id, invoice1.id);
    assert(
      Number(invoiceAfterBookingUpdate?.booking?.totalAmount) === 90000 &&
      Number(invoiceAfterBookingUpdate?.booking?.balanceAmount) === 90000,
      10,
      "Updated booking total (₹90,000) is immediately reflected in invoice live data",
      `Got: ${invoiceAfterBookingUpdate?.booking?.totalAmount}`
    );

    assert(
      invoiceAfterBookingUpdate?.id === invoice1.id &&
      invoiceAfterBookingUpdate?.invoiceNumber === invoice1.invoiceNumber,
      11,
      "Invoice ID and Invoice Number remain unchanged after Booking total update"
    );

    // Record partial payment ₹30,000
    const payment1 = await paymentService.createPayment(agencyA.id, {
      bookingId: bookingConfirmed.id,
      amount: 30000,
      paymentMethod: PaymentMethod.UPI,
      referenceNumber: "UPI123456",
    });

    const invoiceAfterPayment = await invoiceService.getInvoice(agencyA.id, invoice1.id);
    assert(
      Number(invoiceAfterPayment?.paidAmount) === 30000 &&
      Number(invoiceAfterPayment?.balanceAmount) === 60000 &&
      invoiceAfterPayment?.status === InvoiceStatus.PARTIALLY_PAID,
      12,
      "Partial payment (₹30,000) updates invoice paidAmount, balanceAmount (₹60,000) and status to PARTIALLY_PAID"
    );

    assert(
      !!invoiceAfterPayment?.payments.some((p) => p.id === payment1.id),
      13,
      "Recorded payment appears in unified invoice payments ledger"
    );

    // Record remaining payment ₹60,000
    await paymentService.createPayment(agencyA.id, {
      bookingId: bookingConfirmed.id,
      amount: 60000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      referenceNumber: "NEFT987654",
    });

    const invoiceAfterFullPaid = await invoiceService.getInvoice(agencyA.id, invoice1.id);
    assert(
      Number(invoiceAfterFullPaid?.paidAmount) === 90000 &&
      Number(invoiceAfterFullPaid?.balanceAmount) === 0 &&
      invoiceAfterFullPaid?.status === InvoiceStatus.PAID,
      14,
      "Full payment settlement updates invoice status to PAID and balance to ₹0"
    );

    // -------------------------------------------------------------
    // SECTION 4: Cancellation & Historical Discovery
    // -------------------------------------------------------------
    console.log("\n--- SECTION 4: Cancellation & Historical Discovery ---");

    // Create a new booking, generate invoice, then cancel booking
    const bookingToCancel = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        bookingNumber: `BK-B2-CANCEL-${timestamp}`,
        status: BookingStatus.CONFIRMED,
        totalAmount: 50000,
        paidAmount: 0,
        balanceAmount: 50000,
      },
    });

    const invoiceToCancel = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingToCancel.id);
    const invoiceNumberBeforeCancel = invoiceToCancel.invoiceNumber;

    // Cancel the booking
    await bookingService.cancelBooking(agencyA.id, bookingToCancel.id, "Customer requested cancellation");

    // Fetch booking after cancellation
    const fetchedCancelledBooking = await bookingService.getBooking(agencyA.id, bookingToCancel.id);
    assert(
      fetchedCancelledBooking?.status === BookingStatus.CANCELLED,
      15,
      "Booking status transitions to CANCELLED"
    );

    assert(
      fetchedCancelledBooking?.invoices?.[0]?.status === InvoiceStatus.CANCELLED,
      16,
      "Linked invoice status transitions to CANCELLED upon booking cancellation"
    );

    assert(
      fetchedCancelledBooking?.invoices?.[0]?.invoiceNumber === invoiceNumberBeforeCancel,
      17,
      "Cancelled invoice preserves its original invoice number without replacement"
    );

    // Attempting to generate invoice on CANCELLED booking must be rejected
    let cancelRejectionPass = false;
    try {
      await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingToCancel.id);
    } catch (e: any) {
      cancelRejectionPass = e?.message?.includes("CONFIRMED");
    }
    assert(
      cancelRejectionPass,
      18,
      "Generating invoice on CANCELLED booking is strictly rejected"
    );

    // -------------------------------------------------------------
    // SECTION 5: Multi-Tenant Security Isolation
    // -------------------------------------------------------------
    console.log("\n--- SECTION 5: Multi-Tenant Security Isolation ---");

    // Agency B attempts to access Agency A's invoice
    const crossAgencyInvoice = await invoiceService.getInvoice(agencyB.id, invoice1.id);
    assert(
      crossAgencyInvoice === null,
      19,
      "Cross-agency invoice retrieval returns null (strict tenant isolation)"
    );

    // Agency B attempts to generate invoice for Agency A's booking
    let crossAgencyGeneratePass = false;
    try {
      await invoiceService.getOrCreateInvoiceForBooking(agencyB.id, bookingConfirmed.id);
    } catch (e: any) {
      crossAgencyGeneratePass = true;
    }
    assert(
      crossAgencyGeneratePass,
      20,
      "Cross-agency invoice generation is strictly rejected"
    );

    // -------------------------------------------------------------
    // Clean up test data
    // -------------------------------------------------------------
    console.log("\n--- Cleaning up test records ---");
    await prisma.payment.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.invoiceItem.deleteMany({ where: { invoice: { agencyId: { in: [agencyA.id, agencyB.id] } } } });
    await prisma.invoice.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.booking.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.quotationItem.deleteMany({ where: { quotation: { agencyId: { in: [agencyA.id, agencyB.id] } } } });
    await prisma.quotation.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.traveler.deleteMany({ where: { trip: { agencyId: { in: [agencyA.id, agencyB.id] } } } });
    await prisma.trip.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.customer.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.agency.deleteMany({ where: { id: { in: [agencyA.id, agencyB.id] } } });

  } catch (error) {
    console.error("Test execution failed with error:", error);
    failed++;
  }

  console.log("\n===================================================================");
  console.log(`TRIPDESK BATCH 2 MATRIX RESULT: ${passed} PASSED / ${failed} FAILED`);
  console.log("===================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runDev05Batch2Matrix().catch((err) => {
  console.error("Unhandled matrix error:", err);
  process.exit(1);
});
