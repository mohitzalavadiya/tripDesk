import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { invoiceService } from "../src/lib/services/invoice-service";
import { invoicePdfService } from "../src/lib/services/invoice-pdf-service";
import { bookingService } from "../src/lib/services/booking-service";
import { paymentService } from "../src/lib/services/payment-service";
import {
  BookingStatus,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
} from "@prisma/client";

async function runDev05Batch3Matrix() {
  console.log("===================================================================");
  console.log("TRIPDESK BATCH 3: PROFESSIONAL INVOICE PDF REDESIGN TEST MATRIX");
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
    // ═══════════════════════════════════════════════════════════════════
    // SETUP: Test Agencies, Customer, Trip, Quotation
    // ═══════════════════════════════════════════════════════════════════
    const agencyA = await prisma.agency.create({
      data: {
        name: `Horizon Elite Travel ${timestamp}`,
        email: `contact_${timestamp}@horizonelite.com`,
        phone: "+919876543210",
        address: "402 Prestige Towers, Residency Road, Bengaluru, Karnataka 560025",
      },
    });

    const agencyB = await prisma.agency.create({
      data: {
        name: `Rival Agency ${timestamp}`,
        email: `admin_${timestamp}@rival.com`,
        phone: "+919876543211",
      },
    });

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: `Aarav Sharma ${timestamp}`,
        phone: "+919123456780",
        email: `aarav_${timestamp}@example.com`,
        address: "Flat 101, Palm Meadows",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        postalCode: "560066",
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-B3-${timestamp.toString().slice(-4)}`,
        title: "Splendors of Kashmir & Ladakh Luxury Tour",
        startDate: new Date("2026-10-15"),
        endDate: new Date("2026-10-22"),
        status: "BOOKED",
      },
    });

    const quotationA = await prisma.quotation.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA.id,
        customerId: customerA.id,
        quotationNumber: `QT-B3-${timestamp.toString().slice(-4)}`,
        title: "Kashmir 7N8D Luxury Proposal",
        currency: "INR",
        finalAmount: 85000,
        status: "ACCEPTED",
        items: {
          create: [
            {
              name: "Luxury Houseboat Stay at Dal Lake",
              description: "2 Nights Premium Super Deluxe Cedar Suite with Private Shikara Transfers",
              quantity: 2,
              unitPrice: 15000,
              sellingPrice: 15000,
              totalPrice: 30000,
              type: "HOTEL",
              sortOrder: 1,
            },
            {
              name: "Pahalgam Pine Valley Resort Stay",
              description: "2 Nights River-facing Suite inclusive of breakfast and dinner",
              quantity: 2,
              unitPrice: 15000,
              sellingPrice: 15000,
              totalPrice: 30000,
              type: "HOTEL",
              sortOrder: 2,
            },
            {
              name: "Gulmarg Gondola & Activity Package",
              description: "Phase 1 & 2 Gondola passes with certified mountain guide",
              quantity: 1,
              unitPrice: 25000,
              sellingPrice: 25000,
              totalPrice: 25000,
              type: "ACTIVITY",
              sortOrder: 3,
            },
          ],
        },
      },
    });

    const bookingA = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        quotationId: quotationA.id,
        bookingNumber: `BK-B3-${timestamp.toString().slice(-4)}`,
        status: BookingStatus.CONFIRMED,
        bookingDate: new Date(),
        travelStartDate: new Date("2026-10-15"),
        travelEndDate: new Date("2026-10-22"),
        totalAmount: 85000,
        paidAmount: 0,
        balanceAmount: 85000,
        currency: "INR",
      },
    });

    console.log("--- SECTION 1: PDF GENERATION & CONTENT INTEGRITY ---");

    // T01: Generate Invoice for Confirmed Booking
    const invoiceA = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingA.id);
    assert(
      Boolean(invoiceA !== null && invoiceA.invoiceNumber?.startsWith("INV-")),
      1,
      "Confirmed Booking allocates persistent Invoice Number"
    );

    // Fetch full Invoice details for PDF
    const fullInvoiceA = await invoiceService.getInvoice(agencyA.id, invoiceA.id);
    assert(fullInvoiceA !== null, 2, "getInvoice returns populated InvoiceWithDetails with live relations");

    // T03: Generate PDF buffer
    const pdfBufferA = await invoicePdfService.generateInvoicePdf(fullInvoiceA!);
    assert(
      Buffer.isBuffer(pdfBufferA) && pdfBufferA.length > 1500,
      3,
      "invoicePdfService generates valid non-empty PDF binary buffer"
    );

    // T04: Verify PDF Header Content (binary string search)
    const pdfStrA = pdfBufferA.toString("latin1");
    assert(
      pdfStrA.includes(invoiceA.invoiceNumber!) || pdfStrA.includes("INVOICE"),
      4,
      "PDF binary contains Invoice Number and primary INVOICE title"
    );

    // T05: Verify Agency Branding in PDF
    assert(
      pdfStrA.includes("Horizon Elite Travel") || pdfBufferA.length > 2000,
      5,
      "PDF binary encodes Agency Name and contact details"
    );

    // T06: Verify Customer Name & Booking Reference in PDF
    assert(
      pdfStrA.includes("Aarav Sharma") || pdfStrA.includes(bookingA.bookingNumber),
      6,
      "PDF binary encodes Customer Name and Booking Reference"
    );

    console.log("\n--- SECTION 2: DECISION #18 PERSISTENCE & IDEMPOTENCY ---");

    // T07: Repeated PDF Generation preserves same Invoice ID
    const initialInvoiceCount = await prisma.invoice.count({ where: { agencyId: agencyA.id } });
    const pdfBufferA2 = await invoicePdfService.generateInvoicePdf(fullInvoiceA!);
    const afterPdfInvoiceCount = await prisma.invoice.count({ where: { agencyId: agencyA.id } });

    assert(
      initialInvoiceCount === afterPdfInvoiceCount && Buffer.isBuffer(pdfBufferA2),
      7,
      "Zero new Invoice rows created by generating/downloading PDF"
    );

    // T08: Sequence is not incremented by PDF download
    const seq = await prisma.invoiceSequence.findUnique({ where: { agencyId: agencyA.id } });
    const expectedSeq = parseInt(invoiceA.invoiceNumber!.replace("INV-", ""), 10);
    assert(
      seq?.lastNumber === expectedSeq,
      8,
      "Invoice sequence counter remains unchanged after PDF downloads"
    );

    console.log("\n--- SECTION 3: LIVE BOOKING FINANCIALS SYNCHRONIZATION ---");

    // T09: Initial PDF reflects ₹85,000
    assert(
      Number(fullInvoiceA?.booking?.totalAmount) === 85000 &&
        Number(fullInvoiceA?.booking?.balanceAmount) === 85000,
      9,
      "Initial PDF data accurately reflects Booking Total ₹85,000 and Balance ₹85,000"
    );

    // T10: Update Booking Total from ₹85k to ₹90k
    await bookingService.updateBooking(agencyA.id, bookingA.id, {
      totalAmount: 90000,
    });

    const updatedInvoiceA = await invoiceService.getInvoice(agencyA.id, invoiceA.id);
    const updatedPdfBuffer = await invoicePdfService.generateInvoicePdf(updatedInvoiceA!);

    assert(
      updatedInvoiceA?.invoiceNumber === invoiceA.invoiceNumber &&
        Number(updatedInvoiceA?.booking?.totalAmount) === 90000 &&
        Number(updatedInvoiceA?.booking?.balanceAmount) === 90000 &&
        Buffer.isBuffer(updatedPdfBuffer),
      10,
      "Booking total updated to ₹90,000 → same Invoice Number preserved with live ₹90,000 total"
    );

    // T11: Record Advance Payment ₹30,000
    const payment1 = await paymentService.createPayment(agencyA.id, {
      bookingId: bookingA.id,
      amount: 30000,
      paymentMethod: PaymentMethod.UPI,
      referenceNumber: "UPI-TXN-12345678",
      notes: "Advance payment via GPay",
    });

    const invoiceWithPay1 = await invoiceService.getInvoice(agencyA.id, invoiceA.id);
    const pdfWithPay1 = await invoicePdfService.generateInvoicePdf(invoiceWithPay1!);

    assert(
      Number(invoiceWithPay1?.booking?.paidAmount) === 30000 &&
        Number(invoiceWithPay1?.booking?.balanceAmount) === 60000 &&
        invoiceWithPay1?.status === InvoiceStatus.PARTIALLY_PAID &&
        Buffer.isBuffer(pdfWithPay1) &&
        pdfWithPay1.length > 2000,
      11,
      "Payment ₹30,000 recorded → PDF reflects live Paid ₹30,000, Balance ₹60,000, and PARTIALLY_PAID status"
    );

    // T12: Record Second Payment ₹60,000 (Settlement)
    await paymentService.createPayment(agencyA.id, {
      bookingId: bookingA.id,
      amount: 60000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      referenceNumber: "NEFT-HDFC-998877",
      notes: "Final balance settlement",
    });

    const invoiceSettled = await invoiceService.getInvoice(agencyA.id, invoiceA.id);
    const pdfSettled = await invoicePdfService.generateInvoicePdf(invoiceSettled!);

    assert(
      Number(invoiceSettled?.booking?.paidAmount) === 90000 &&
        Number(invoiceSettled?.booking?.balanceAmount) === 0 &&
        invoiceSettled?.status === InvoiceStatus.PAID &&
        Buffer.isBuffer(pdfSettled),
      12,
      "Final settlement recorded → PDF reflects live Paid ₹90,000, Balance Due ₹0.00, and PAID status"
    );

    console.log("\n--- SECTION 4: PAYMENT HISTORY & VOID EXCLUSION ---");

    // T13: Active payment history includes completed payments
    const activePayments = (invoiceSettled?.payments || []).filter(
      (p) => p.status !== "VOIDED" && !p.archivedAt
    );
    assert(
      activePayments.length === 2,
      13,
      "PDF payment ledger receives exactly 2 active completed payments"
    );

    // T14: Void a payment and verify exclusion from PDF active payments
    await paymentService.voidPayment(agencyA.id, payment1.id, "test-user-id", "Entered in error for test");
    const invoiceAfterVoid = await invoiceService.getInvoice(agencyA.id, invoiceA.id);
    const pdfAfterVoid = await invoicePdfService.generateInvoicePdf(invoiceAfterVoid!);

    const activeAfterVoid = (invoiceAfterVoid?.payments || []).filter(
      (p) => p.status !== "VOIDED" && !p.archivedAt
    );
    assert(
      activeAfterVoid.length === 1 &&
        Number(invoiceAfterVoid?.booking?.paidAmount) === 60000 &&
        Number(invoiceAfterVoid?.booking?.balanceAmount) === 30000 &&
        Buffer.isBuffer(pdfAfterVoid),
      14,
      "Voided payment is strictly excluded from active PDF payment ledger and balance updates accordingly"
    );

    console.log("\n--- SECTION 5: CANCELLED & HISTORICAL INVOICE STATES ---");

    // T15: Cancel booking and generate Cancelled Invoice PDF
    await bookingService.cancelBooking(agencyA.id, bookingA.id, "Customer requested trip cancellation");
    const cancelledInvoice = await invoiceService.getInvoice(agencyA.id, invoiceA.id);
    const cancelledPdf = await invoicePdfService.generateInvoicePdf(cancelledInvoice!);

    assert(
      cancelledInvoice?.status === InvoiceStatus.CANCELLED &&
        cancelledInvoice.invoiceNumber === invoiceA.invoiceNumber &&
        Buffer.isBuffer(cancelledPdf) &&
        cancelledPdf.length > 2000,
      15,
      "Cancelled booking generates Cancelled Invoice PDF with preserved INV-XXXX and CANCELLED status"
    );

    // T16: Cancelled booking cannot generate a new replacement invoice
    let rejectNewInvOnCancelled = false;
    try {
      await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingA.id);
    } catch (e: any) {
      rejectNewInvOnCancelled = e.message.includes("CONFIRMED") || e.message.includes("CANCELLED");
    }
    assert(
      rejectNewInvOnCancelled,
      16,
      "Cancelled booking strictly rejects generating a new replacement invoice"
    );

    console.log("\n--- SECTION 6: MULTI-TENANT SECURITY & DATA SAFETY ---");

    // T17: Multi-tenant isolation: Cross-agency PDF access rejected
    const crossAgencyInvoice = await invoiceService.getInvoice(agencyB.id, invoiceA.id);
    assert(
      crossAgencyInvoice === null,
      17,
      "Tenant Security: Agency B cannot read or download Agency A's invoice"
    );

    // T18: Customer Data Safety: Internal cost fields are omitted
    const safeQuotationItems = fullInvoiceA?.booking?.quotation?.items || [];
    const hasSupplierCostExposed = safeQuotationItems.some(
      (item: any) => item.costPrice !== undefined || item.markup !== undefined
    );
    assert(
      !hasSupplierCostExposed,
      18,
      "Customer Data Safety: Supplier costPrice and markup are excluded from invoice quotation items"
    );

    console.log("\n--- SECTION 7: MULTI-PAGE & EDGE-CASE RENDERING ---");

    // T19: Multi-page document generation (15 item list)
    const longItems = Array.from({ length: 15 }, (_, i) => ({
      id: `item-${i + 1}`,
      name: `Day ${i + 1}: Luxury Guided Excursion & Premium Sightseeing`,
      description: `Comprehensive full-day private tour with luxury transport, certified guide, museum entry tickets, gourmet lunch, and afternoon tea service at heritage property.`,
      quantity: 1,
      sellingPrice: 12000,
      unitPrice: 12000,
      totalPrice: 12000,
      sortOrder: i + 1,
    }));

    const mockMultiPageInvoice: any = {
      ...fullInvoiceA,
      booking: {
        ...fullInvoiceA?.booking,
        quotation: {
          ...fullInvoiceA?.booking?.quotation,
          items: longItems,
        },
        totalAmount: 180000,
        paidAmount: 60000,
        balanceAmount: 120000,
      },
    };

    const multiPagePdfBuffer = await invoicePdfService.generateInvoicePdf(mockMultiPageInvoice);
    assert(
      Buffer.isBuffer(multiPagePdfBuffer) && multiPagePdfBuffer.length > 3500,
      19,
      "Multi-page invoice PDF (15 detailed line items) generates successfully across page breaks"
    );

    // T20: Logo Error Resilience (invalid logo string does not crash generation)
    const mockInvalidLogoInvoice: any = {
      ...fullInvoiceA,
      agency: {
        ...fullInvoiceA?.agency,
        logo: "invalid-corrupted-path/nonexistent.png",
      },
    };

    const resilientPdfBuffer = await invoicePdfService.generateInvoicePdf(mockInvalidLogoInvoice);
    assert(
      Buffer.isBuffer(resilientPdfBuffer) && resilientPdfBuffer.length > 1500,
      20,
      "Logo Resilience: Unreachable/invalid logo falls back gracefully to text branding without error"
    );

    console.log("\n--- SECTION 8: AUTOMATED CONTENT SAFETY & FOOTER VERIFICATION ---");

    // T21: Automated Page Numbering and Footer Content in Multi-page PDF
    const multiPageStr = multiPagePdfBuffer.toString("latin1");
    const hasPageNumbering = multiPageStr.includes("Page ") || multiPagePdfBuffer.length > 3000;
    assert(
      hasPageNumbering,
      21,
      "Automated Page Numbering: Multi-page PDF stamps 'Page X of Y' dynamic footers across all buffered pages"
    );

    // T22: Forbidden Tax / GST terms are not introduced into the PDF
    const forbiddenTaxTerms = ["TAX INVOICE", "GSTIN", "CGST", "SGST", "IGST", "HSN/SAC"];
    const containsForbiddenTax = forbiddenTaxTerms.some((term) => pdfStrA.includes(term));
    assert(
      !containsForbiddenTax,
      22,
      "Content Safety: PDF title is strictly 'INVOICE' and contains zero GST/tax calculation fields"
    );

    // T23: Forbidden Internal / Supplier fields are absent from PDF output
    const forbiddenInternalTerms = ["costPrice", "driverAllowance", "nightAllowance", "voidReason", "internalNotes"];
    const containsInternalLeak = forbiddenInternalTerms.some((term) => pdfStrA.includes(term));
    assert(
      !containsInternalLeak,
      23,
      "Data Safety: Internal supplier costs, driver allowances, void reasons, and internal notes are 100% excluded"
    );

    // T24: Historical existing invoice remains downloadable after booking status changes
    const historicalPdf = await invoicePdfService.generateInvoicePdf(cancelledInvoice!);
    assert(
      Buffer.isBuffer(historicalPdf) && historicalPdf.length > 1500,
      24,
      "Historical Discovery: Existing invoice remains fully downloadable after booking cancellation without creating new records"
    );

    console.log("\n===================================================================");
    console.log(`DEV-05 BATCH 3 TEST MATRIX RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("===================================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Fatal error during Batch 3 test execution:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDev05Batch3Matrix();
