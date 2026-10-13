import "dotenv/config";
import prisma from "../src/lib/prisma";
import { quotationService } from "../src/lib/services/quotation-service";
import { bookingService } from "../src/lib/services/booking-service";
import { invoiceService } from "../src/lib/services/invoice-service";
import { invoicePdfService } from "../src/lib/services/invoice-pdf-service";
import { BookingStatus, InvoiceStatus } from "@prisma/client";

async function runTests() {
  console.log("=================================================================");
  console.log("TRIPDESK TAX V1 — BATCH 7: BOOKING & INVOICE SNAPSHOTS + PDF TESTS");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  PASS: ${message}`);
      passed++;
    } else {
      console.error(`  FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Setup Test Agencies (Tenant Isolation)
    let agencyA = await prisma.agency.findFirst({ where: { name: "Batch 7 Test Agency A" } });
    if (!agencyA) {
      agencyA = await prisma.agency.create({
        data: {
          name: "Batch 7 Test Agency A",
          email: "batch7_a@agency.com",
          phone: "9876543201",
        },
      });
    }

    let agencyB = await prisma.agency.findFirst({ where: { name: "Batch 7 Test Agency B" } });
    if (!agencyB) {
      agencyB = await prisma.agency.create({
        data: {
          name: "Batch 7 Test Agency B",
          email: "batch7_b@agency.com",
          phone: "9876543202",
        },
      });
    }

    // Configure Agency A Tax Profile
    await prisma.agencyTaxProfile.upsert({
      where: { agencyId: agencyA.id },
      create: {
        agencyId: agencyA.id,
        isGstRegistered: true,
        gstin: "27AABCU9603R1ZM",
        legalBusinessName: "Batch 7 Travel Adventures Pvt Ltd",
        registeredAddress: "401 Palm Tower, BKC, Mumbai",
        state: "Maharashtra",
        stateCode: "27",
        defaultGstRate: 18,
        defaultTaxMode: "EXCLUSIVE",
        defaultGstTreatment: "INTRA_STATE",
      },
      update: {
        isGstRegistered: true,
        gstin: "27AABCU9603R1ZM",
        legalBusinessName: "Batch 7 Travel Adventures Pvt Ltd",
        registeredAddress: "401 Palm Tower, BKC, Mumbai",
        state: "Maharashtra",
        stateCode: "27",
        defaultGstRate: 18,
        defaultTaxMode: "EXCLUSIVE",
        defaultGstTreatment: "INTRA_STATE",
      },
    });

    let customer = await prisma.customer.findFirst({ where: { agencyId: agencyA.id } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          agencyId: agencyA.id,
          name: "Ananya Sharma",
          phone: "9123456789",
          email: "ananya@example.com",
        },
      });
    }

    let trip = await prisma.trip.findFirst({ where: { agencyId: agencyA.id } });
    if (!trip) {
      trip = await prisma.trip.create({
        data: {
          agencyId: agencyA.id,
          customerId: customer.id,
          title: "Kashmir Delight Holiday",
          tripNumber: `TRIP-B7-${Date.now().toString().slice(-4)}`,
          startDate: new Date("2026-10-10"),
          endDate: new Date("2026-10-16"),
          status: "PLANNING",
        },
      });
    }

    console.log("--- TEST GROUP 1: QUOTATION -> BOOKING TAX SNAPSHOT (EXCLUSIVE INTRA-STATE) ---");
    // Create Quotation with 18% Exclusive Intra-State
    // Subtotal = 40,000, Discount = 1,000 -> Taxable = 39,000.
    // 18% Exclusive: Tax = 7,020 (CGST 3,510 + SGST 3,510), Final = 46,020.
    const q1 = await quotationService.createQuotation(agencyA.id, {
      tripId: trip.id,
      customerId: customer.id,
      title: "Kashmir Premium Quotation",
      subtotal: 40000,
      discountAmount: 1000,
      taxMode: "EXCLUSIVE",
      taxRate: 18,
      gstTreatment: "INTRA_STATE",
    });

    assert(Number(q1.taxableAmount) === 39000, "Quotation taxableAmount is 39,000");
    assert(Number(q1.taxAmount) === 7020, "Quotation taxAmount is 7,020");
    assert(Number(q1.cgstAmount) === 3510, "Quotation cgstAmount is 3,510");
    assert(Number(q1.sgstAmount) === 3510, "Quotation sgstAmount is 3,510");
    assert(Number(q1.igstAmount) === 0, "Quotation igstAmount is 0");
    assert(Number(q1.finalAmount) === 46020, "Quotation finalAmount is 46,020");

    // Convert Quotation to Booking
    const booking1 = await bookingService.convertQuotationToBooking(agencyA.id, q1.id, {
      notes: "Booked via customer acceptance",
    });

    assert(booking1 !== null, "Booking created successfully from Quotation");
    assert(Number(booking1.taxableAmount) === 39000, "Booking tax snapshot taxableAmount is 39,000");
    assert(Number(booking1.taxAmount) === 7020, "Booking tax snapshot taxAmount is 7,020");
    assert(Number(booking1.taxRate) === 18, "Booking tax snapshot taxRate is 18%");
    assert(booking1.taxMode === "EXCLUSIVE", "Booking tax snapshot taxMode is EXCLUSIVE");
    assert(booking1.gstTreatment === "INTRA_STATE", "Booking tax snapshot gstTreatment is INTRA_STATE");
    assert(Number(booking1.cgstAmount) === 3510, "Booking tax snapshot cgstAmount is 3,510");
    assert(Number(booking1.sgstAmount) === 3510, "Booking tax snapshot sgstAmount is 3,510");
    assert(Number(booking1.igstAmount) === 0, "Booking tax snapshot igstAmount is 0");
    assert(Number(booking1.totalAmount) === 46020, "Booking totalAmount matches quotation finalAmount (46,020)");

    console.log("\n--- TEST GROUP 2: IMMUTABILITY OF BOOKING TAX SNAPSHOT ON AGENCY PROFILE UPDATE ---");
    // Update Agency Tax Profile to 28% Inclusive Inter-State
    await prisma.agencyTaxProfile.update({
      where: { agencyId: agencyA.id },
      data: {
        defaultGstRate: 28,
        defaultTaxMode: "INCLUSIVE",
        defaultGstTreatment: "INTER_STATE",
      },
    });

    const refreshedBooking1 = await bookingService.getBooking(agencyA.id, booking1.id);
    assert(Number(refreshedBooking1?.taxRate) === 18, "Booking taxRate remains 18% after Agency Tax Profile changed");
    assert(refreshedBooking1?.taxMode === "EXCLUSIVE", "Booking taxMode remains EXCLUSIVE after Agency Tax Profile changed");
    assert(refreshedBooking1?.gstTreatment === "INTRA_STATE", "Booking gstTreatment remains INTRA_STATE");
    assert(Number(refreshedBooking1?.taxAmount) === 7020, "Booking taxAmount remains 7,020");

    console.log("\n--- TEST GROUP 3: INVOICE CREATION & TAX SNAPSHOT PERSISTENCE ---");
    // Generate Invoice for Booking 1
    const invoice1 = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, booking1.id);
    assert(invoice1 !== null, "Invoice created successfully");
    assert(invoice1.invoiceNumber.startsWith("INV-"), `Invoice number generated: ${invoice1.invoiceNumber}`);
    assert(Number(invoice1.taxableAmount) === 39000, "Invoice taxableAmount is 39,000");
    assert(Number(invoice1.taxAmount) === 7020, "Invoice taxAmount is 7,020");
    assert(Number(invoice1.taxRate) === 18, "Invoice taxRate is 18%");
    assert(invoice1.taxMode === "EXCLUSIVE", "Invoice taxMode is EXCLUSIVE");
    assert(invoice1.gstTreatment === "INTRA_STATE", "Invoice gstTreatment is INTRA_STATE");
    assert(Number(invoice1.cgstAmount) === 3510, "Invoice cgstAmount is 3,510");
    assert(Number(invoice1.sgstAmount) === 3510, "Invoice sgstAmount is 3,510");
    assert(Number(invoice1.igstAmount) === 0, "Invoice igstAmount is 0");
    assert(Number(invoice1.totalAmount) === 46020, "Invoice totalAmount is 46,020");

    // Check agency tax profile in agency snapshot
    const agencySnap: any = invoice1.agencySnapshot;
    assert(agencySnap?.taxProfile?.gstin === "27AABCU9603R1ZM", "Agency snapshot contains GSTIN");
    assert(agencySnap?.taxProfile?.legalName === "Batch 7 Travel Adventures Pvt Ltd", "Agency snapshot contains legalName");
    assert(agencySnap?.taxProfile?.stateCode === "27", "Agency snapshot contains stateCode");

    console.log("\n--- TEST GROUP 4: INVOICE IDEMPOTENCY & PERSISTENT NUMBERING (DECISION #18) ---");
    // Call getOrCreateInvoiceForBooking repeatedly
    const invoice1SecondCall = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, booking1.id);
    const invoice1ThirdCall = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, booking1.id);
    assert(invoice1SecondCall.id === invoice1.id, "Second call returns identical Invoice ID");
    assert(invoice1ThirdCall.id === invoice1.id, "Third call returns identical Invoice ID");
    assert(invoice1SecondCall.invoiceNumber === invoice1.invoiceNumber, "Invoice number is preserved identically");

    const totalInvoicesForBooking = await prisma.invoice.count({
      where: { bookingId: booking1.id, agencyId: agencyA.id },
    });
    assert(totalInvoicesForBooking === 1, "Exactly one invoice record exists for the booking");

    console.log("\n--- TEST GROUP 5: PAYMENT INTEGRATION & FINANCIAL BALANCE SAFETY ---");
    // Add payment of 20,000 to Booking 1
    await prisma.payment.create({
      data: {
        agencyId: agencyA.id,
        bookingId: booking1.id,
        invoiceId: invoice1.id,
        customerId: customer.id,
        amount: 20000,
        currency: "INR",
        paymentDate: new Date(),
        paymentMethod: "BANK_TRANSFER",
        status: "COMPLETED",
      },
    });

    // Re-fetch Invoice
    const invoiceAfterPayment = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, booking1.id);
    assert(Number(invoiceAfterPayment.paidAmount) === 20000, "Invoice paidAmount updated to 20,000");
    assert(Number(invoiceAfterPayment.balanceAmount) === 26020, "Invoice balanceAmount is 26,020 (46,020 - 20,000)");
    assert(invoiceAfterPayment.status === "PARTIALLY_PAID", "Invoice status transitioned to PARTIALLY_PAID");
    assert(Number(invoiceAfterPayment.taxAmount) === 7020, "Tax snapshot remained untouched on payment addition");

    console.log("\n--- TEST GROUP 6: INCLUSIVE & INTER-STATE TAX SNAPSHOT ---");
    // Create Quotation with 12% Inclusive Inter-State
    // Subtotal = 56,000, Discount = 0 -> Gross = 56,000.
    // 12% Inclusive: Taxable = 56000 / 1.12 = 50,000, Tax = 6,000 (IGST = 6,000).
    const q2 = await quotationService.createQuotation(agencyA.id, {
      tripId: trip.id,
      customerId: customer.id,
      title: "Kerala Backwaters Inclusive",
      subtotal: 56000,
      discountAmount: 0,
      taxMode: "INCLUSIVE",
      taxRate: 12,
      gstTreatment: "INTER_STATE",
    });

    assert(Number(q2.taxableAmount) === 50000, "Quotation 2 taxableAmount is 50,000");
    assert(Number(q2.taxAmount) === 6000, "Quotation 2 taxAmount is 6,000");
    assert(Number(q2.igstAmount) === 6000, "Quotation 2 igstAmount is 6,000");
    assert(Number(q2.cgstAmount) === 0, "Quotation 2 cgstAmount is 0");
    assert(Number(q2.sgstAmount) === 0, "Quotation 2 sgstAmount is 0");
    assert(Number(q2.finalAmount) === 56000, "Quotation 2 finalAmount is 56,000");

    const booking2 = await bookingService.convertQuotationToBooking(agencyA.id, q2.id);

    assert(booking2.taxMode === "INCLUSIVE", "Booking 2 taxMode is INCLUSIVE");
    assert(booking2.gstTreatment === "INTER_STATE", "Booking 2 gstTreatment is INTER_STATE");
    assert(Number(booking2.taxableAmount) === 50000, "Booking 2 taxableAmount is 50,000");
    assert(Number(booking2.taxAmount) === 6000, "Booking 2 taxAmount is 6,000");
    assert(Number(booking2.igstAmount) === 6000, "Booking 2 igstAmount is 6,000");

    const invoice2 = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, booking2.id);
    assert(invoice2.taxMode === "INCLUSIVE", "Invoice 2 taxMode is INCLUSIVE");
    assert(invoice2.gstTreatment === "INTER_STATE", "Invoice 2 gstTreatment is INTER_STATE");
    assert(Number(invoice2.taxableAmount) === 50000, "Invoice 2 taxableAmount is 50,000");
    assert(Number(invoice2.igstAmount) === 6000, "Invoice 2 igstAmount is 6,000");
    assert(Number(invoice2.totalAmount) === 56000, "Invoice 2 totalAmount is 56,000");

    console.log("\n--- TEST GROUP 7: NON-GST EXEMPT SNAPSHOT ---");
    const q3 = await quotationService.createQuotation(agencyA.id, {
      tripId: trip.id,
      customerId: customer.id,
      title: "Exempt Pilgrimage Tour",
      subtotal: 25000,
      discountAmount: 0,
      taxMode: "EXCLUSIVE",
      taxRate: 0,
      gstTreatment: "NON_GST_EXEMPT",
    });

    const booking3 = await bookingService.convertQuotationToBooking(agencyA.id, q3.id);

    assert(booking3.gstTreatment === "NON_GST_EXEMPT", "Booking 3 gstTreatment is NON_GST_EXEMPT");
    assert(Number(booking3.taxAmount) === 0, "Booking 3 taxAmount is 0");

    const invoice3 = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, booking3.id);
    assert(invoice3.gstTreatment === "NON_GST_EXEMPT", "Invoice 3 gstTreatment is NON_GST_EXEMPT");
    assert(Number(invoice3.taxAmount) === 0, "Invoice 3 taxAmount is 0");
    assert(Number(invoice3.totalAmount) === 25000, "Invoice 3 totalAmount is 25,000");

    console.log("\n--- TEST GROUP 8: FINANCIAL RECONCILIATION & INVARIANTS ---");
    // Exclusive: finalAmount = taxableAmount + taxAmount
    assert(
      Number(invoice1.taxableAmount) + Number(invoice1.taxAmount) === Number(invoice1.totalAmount),
      "Exclusive Invariant: taxableAmount (39k) + taxAmount (7.02k) === totalAmount (46.02k)"
    );
    // Inclusive: taxableAmount + taxAmount === totalAmount
    assert(
      Number(invoice2.taxableAmount) + Number(invoice2.taxAmount) === Number(invoice2.totalAmount),
      "Inclusive Invariant: taxableAmount (50k) + taxAmount (6k) === totalAmount (56k)"
    );
    // Intra-State: cgstAmount + sgstAmount === taxAmount and igstAmount === 0
    assert(
      Number(invoice1.cgstAmount) + Number(invoice1.sgstAmount) === Number(invoice1.taxAmount) &&
        Number(invoice1.igstAmount) === 0,
      "Intra-State Invariant: cgst (3510) + sgst (3510) === tax (7020) and igst === 0"
    );
    // Inter-State: igstAmount === taxAmount and cgst === 0, sgst === 0
    assert(
      Number(invoice2.igstAmount) === Number(invoice2.taxAmount) &&
        Number(invoice2.cgstAmount) === 0 &&
        Number(invoice2.sgstAmount) === 0,
      "Inter-State Invariant: igst (6000) === tax (6000) and cgst === 0, sgst === 0"
    );

    console.log("\n--- TEST GROUP 9: BOOKING CANCELLATION & INVOICE STATUS SYNCHRONIZATION ---");
    // Cancel Booking 3
    const cancelledBooking = await bookingService.cancelBooking(
      agencyA.id,
      booking3.id,
      "Client requested cancellation"
    );
    assert(cancelledBooking.status === "CANCELLED", "Booking 3 status is CANCELLED");

    const refreshedInvoice3 = await prisma.invoice.findUnique({ where: { id: invoice3.id } });
    assert(refreshedInvoice3?.status === "CANCELLED", "Invoice 3 status is CANCELLED upon booking cancellation");
    assert(refreshedInvoice3?.invoiceNumber === invoice3.invoiceNumber, "Invoice number preserved on cancellation");

    // Attempting to generate invoice for cancelled booking throws error
    let cancelledBookingInvoiceError = false;
    try {
      await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, booking3.id);
    } catch (err: any) {
      cancelledBookingInvoiceError = true;
    }
    assert(cancelledBookingInvoiceError, "Cannot generate/synchronize new invoice for CANCELLED booking");

    console.log("\n--- TEST GROUP 10: INVOICE PDF GENERATION & CONFIDENTIALITY REDACTION ---");
    const invoiceDetail1 = await invoiceService.getInvoice(agencyA.id, invoice1.id);
    assert(invoiceDetail1 !== null, "Invoice 1 details fetched for PDF rendering");
    const pdfBuffer1 = await invoicePdfService.generateInvoicePdf(invoiceDetail1!);
    assert(Buffer.isBuffer(pdfBuffer1), "PDF Buffer 1 is valid Buffer");
    assert(pdfBuffer1.length > 2000, `PDF Buffer 1 generated with size ${pdfBuffer1.length} bytes`);

    // Generate PDF for Invoice 2 (Inclusive Inter-State)
    const invoiceDetail2 = await invoiceService.getInvoice(agencyA.id, invoice2.id);
    assert(invoiceDetail2 !== null, "Invoice 2 details fetched for PDF rendering");
    const pdfBuffer2 = await invoicePdfService.generateInvoicePdf(invoiceDetail2!);
    assert(Buffer.isBuffer(pdfBuffer2), "PDF Buffer 2 is valid Buffer");
    assert(pdfBuffer2.length > 2000, `PDF Buffer 2 generated with size ${pdfBuffer2.length} bytes`);

    // Generate PDF for Invoice 3 (Non-GST Exempt)
    const invoiceDetail3 = await invoiceService.getInvoice(agencyA.id, invoice3.id);
    assert(invoiceDetail3 !== null, "Invoice 3 details fetched for PDF rendering");
    const pdfBuffer3 = await invoicePdfService.generateInvoicePdf(invoiceDetail3!);
    assert(Buffer.isBuffer(pdfBuffer3), "PDF Buffer 3 is valid Buffer");
    assert(pdfBuffer3.length > 2000, `PDF Buffer 3 generated with size ${pdfBuffer3.length} bytes`);

    // Redaction Verification: check raw data DTO structure passed to PDF
    const invoiceJson = JSON.stringify(invoiceDetail1);
    assert(!invoiceJson.includes("supplierCost"), "Internal confidentiality: supplierCost is absent from invoice data");
    assert(!invoiceJson.includes("markupPercentage"), "Internal confidentiality: markupPercentage is absent from invoice data");
    assert(!invoiceJson.includes("markupAmount"), "Internal confidentiality: markupAmount is absent from invoice data");
    assert(!invoiceJson.includes("customerGstin"), "Scope protection: customerGstin is absent");
    assert(!invoiceJson.includes("travelerGst"), "Scope protection: travelerGst is absent");

    console.log("\n--- TEST GROUP 11: TENANT ISOLATION & SECURITY ---");
    // Agency B attempts to access Agency A's invoice
    let crossTenantInvoiceBlocked = false;
    try {
      const inv = await invoiceService.getInvoice(agencyB.id, invoice1.id);
      if (!inv) crossTenantInvoiceBlocked = true;
    } catch (err: any) {
      crossTenantInvoiceBlocked = true;
    }
    assert(crossTenantInvoiceBlocked, "Cross-tenant invoice access is strictly blocked (Agency B cannot view Agency A invoice)");

    let crossTenantBookingBlocked = false;
    try {
      const bk = await bookingService.getBooking(agencyB.id, booking1.id);
      if (!bk) crossTenantBookingBlocked = true;
    } catch (err: any) {
      crossTenantBookingBlocked = true;
    }
    assert(crossTenantBookingBlocked, "Cross-tenant booking access is strictly blocked");

  } catch (error) {
    console.error("Test Suite crashed with unexpected error:", error);
    failed++;
  } finally {
    console.log("\n=================================================================");
    console.log(`BATCH 7 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================================\n");
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests();
