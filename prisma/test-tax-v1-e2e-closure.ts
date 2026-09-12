import "dotenv/config";
import prisma from "../src/lib/prisma";
import { taxService } from "../src/lib/services/tax-service";
import { taxProfileService } from "../src/lib/services/tax-profile-service";
import { quotationService } from "../src/lib/services/quotation-service";
import { bookingService } from "../src/lib/services/booking-service";
import { invoiceService } from "../src/lib/services/invoice-service";
import { invoicePdfService } from "../src/lib/services/invoice-pdf-service";
import { quotationPdfService } from "../src/lib/services/quotation-pdf-service";
import { BookingStatus, InvoiceStatus, PaymentStatus, TaxMode, GstTreatment } from "@prisma/client";

async function runE2EClosureSuite() {
  console.log("=================================================================");
  console.log("TRIPDESK TAX V1 — BATCH 8: FULL LIFECYCLE E2E CLOSURE TEST SUITE");
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
    // ──────────────────────────────────────────────────────────────────
    // STEP 1: AGENCY & TENANT SETUP
    // ──────────────────────────────────────────────────────────────────
    console.log("--- 1. Multi-Tenant Fixture Setup & Isolation ---");
    let agencyA = await prisma.agency.findFirst({ where: { name: "Batch 8 Alpha Travels" } });
    if (!agencyA) {
      agencyA = await prisma.agency.create({
        data: {
          name: "Batch 8 Alpha Travels",
          email: "batch8_alpha@agency.com",
          phone: "9876543001",
          address: "100 Marine Drive, Mumbai",
        },
      });
    }

    let agencyB = await prisma.agency.findFirst({ where: { name: "Batch 8 Beta Holidays" } });
    if (!agencyB) {
      agencyB = await prisma.agency.create({
        data: {
          name: "Batch 8 Beta Holidays",
          email: "batch8_beta@agency.com",
          phone: "9876543002",
          address: "200 MG Road, Bengaluru",
        },
      });
    }

    let customerA = await prisma.customer.findFirst({ where: { agencyId: agencyA.id } });
    if (!customerA) {
      customerA = await prisma.customer.create({
        data: {
          agencyId: agencyA.id,
          name: "Vikram Malhotra",
          phone: "9988776655",
          email: "vikram@example.com",
          city: "Mumbai",
          state: "Maharashtra",
        },
      });
    }

    let tripA = await prisma.trip.findFirst({ where: { agencyId: agencyA.id } });
    if (!tripA) {
      tripA = await prisma.trip.create({
        data: {
          agencyId: agencyA.id,
          customerId: customerA.id,
          title: "Golden Triangle Luxury Tour",
          tripNumber: `TRIP-B8-${Date.now().toString().slice(-4)}`,
          startDate: new Date("2026-12-01"),
          endDate: new Date("2026-12-07"),
          status: "PLANNING",
        },
      });
    }

    assert(agencyA.id !== agencyB.id, "Agency A and Agency B are distinct tenant entities");

    // ──────────────────────────────────────────────────────────────────
    // STEP 2: TAX RATE CATALOG AUDIT
    // ──────────────────────────────────────────────────────────────────
    console.log("\n--- 2. Tax Rate Catalog Audit ---");
    const activeRates = await taxProfileService.listActiveTaxRates();
    assert(activeRates.length >= 5, `Active tax rates count >= 5 (found ${activeRates.length})`);
    const ratesArray = activeRates.map((r) => Number(r.rate));
    assert(ratesArray.includes(0), "Catalog includes 0%");
    assert(ratesArray.includes(5), "Catalog includes 5%");
    assert(ratesArray.includes(12), "Catalog includes 12%");
    assert(ratesArray.includes(18), "Catalog includes 18%");
    assert(ratesArray.includes(28), "Catalog includes 28%");

    // ──────────────────────────────────────────────────────────────────
    // STEP 3: AGENCY TAX PROFILE CONFIGURATION & TENANT ISOLATION
    // ──────────────────────────────────────────────────────────────────
    console.log("\n--- 3. Agency Tax Profile Setup & Isolation ---");
    const profileA = await taxProfileService.updateAgencyTaxProfile(agencyA.id, {
      isGstRegistered: true,
      gstin: "27AABCU9603R1ZM",
      legalBusinessName: "Alpha Travels Private Limited",
      registeredAddress: "100 Marine Drive, Nariman Point, Mumbai",
      state: "Maharashtra",
      stateCode: "27",
      defaultTaxMode: TaxMode.EXCLUSIVE,
      defaultGstRate: 18,
      defaultGstTreatment: GstTreatment.INTRA_STATE,
    });

    assert(profileA.isGstRegistered === true, "Agency A is GST registered");
    assert(profileA.gstin === "27AABCU9603R1ZM", "Agency A GSTIN is verified");
    assert(Number(profileA.defaultGstRate) === 18, "Agency A default GST rate is 18%");
    assert(profileA.defaultTaxMode === "EXCLUSIVE", "Agency A default tax mode is EXCLUSIVE");
    assert(profileA.defaultGstTreatment === "INTRA_STATE", "Agency A default GST treatment is INTRA_STATE");

    // Verify Agency B has its own independent profile
    const profileB = await taxProfileService.getAgencyTaxProfile(agencyB.id);
    assert(profileB.gstin !== profileA.gstin, "Agency B does not inherit Agency A GSTIN (Tenant Isolation)");

    // ──────────────────────────────────────────────────────────────────
    // STEP 4: FULL COMMERCIAL LIFECYCLE 1 — EXCLUSIVE INTRA-STATE (18%)
    // ──────────────────────────────────────────────────────────────────
    console.log("\n--- 4. Full Lifecycle 1: Exclusive Intra-State (18%) with Discount ---");
    // Subtotal = 100,000, Markup = 10% (10,000) -> Base = 110,000.
    // Discount = 10,000 -> Taxable = 100,000.
    // 18% Exclusive: Tax = 18,000 (CGST 9,000 + SGST 9,000), Final = 118,000.
    const quote1 = await quotationService.createQuotation(agencyA.id, {
      tripId: tripA.id,
      customerId: customerA.id,
      title: "Golden Triangle Luxury Exclusive",
      subtotal: 100000,
      markupPercentage: 10,
      discountAmount: 10000,
      taxRate: 18,
      taxMode: "EXCLUSIVE",
      gstTreatment: "INTRA_STATE",
      internalNotes: "CONFIDENTIAL SUPPLIER MARGIN: DO NOT DISCLOSE",
    });

    assert(Number(quote1.taxableAmount) === 100000, "Quotation 1 Taxable Amount = 100,000");
    assert(Number(quote1.taxAmount) === 18000, "Quotation 1 Tax Amount = 18,000");
    assert(Number(quote1.cgstAmount) === 9000, "Quotation 1 CGST = 9,000");
    assert(Number(quote1.sgstAmount) === 9000, "Quotation 1 SGST = 9,000");
    assert(Number(quote1.igstAmount) === 0, "Quotation 1 IGST = 0");
    assert(Number(quote1.finalAmount) === 118000, "Quotation 1 Final Customer Price = 118,000");

    // Public Proposal Check & Redaction
    const publicQuote1 = await quotationService.getPublicQuotationByToken(quote1.shareToken!);
    assert(publicQuote1 !== null, "Public proposal accessible via shareToken");
    assert((publicQuote1 as any).internalNotes === undefined, "Strict Redaction: internalNotes absent");
    assert((publicQuote1 as any).markupPercentage === undefined, "Strict Redaction: markupPercentage absent");
    assert((publicQuote1 as any).markupAmount === undefined, "Strict Redaction: markupAmount absent");
    assert((publicQuote1 as any).subtotal === undefined, "Strict Redaction: supplier subtotal absent");
    assert(publicQuote1?.taxableAmount === 100000, "Public proposal exposes correct Taxable Base (100,000)");
    assert(publicQuote1?.taxAmount === 18000, "Public proposal exposes correct Tax (18,000)");
    assert(publicQuote1?.finalAmount === 118000, "Public proposal exposes correct Final Price (118,000)");

    // Customer Acceptance -> Booking Conversion
    const booking1 = await bookingService.convertQuotationToBooking(agencyA.id, quote1.id, {
      notes: "Accepted via customer proposal portal",
    });

    assert(booking1 !== null, "Booking 1 created from Quotation 1");
    assert(Number(booking1.taxableAmount) === 100000, "Booking 1 snapshots Taxable Amount = 100,000");
    assert(Number(booking1.taxAmount) === 18000, "Booking 1 snapshots Tax Amount = 18,000");
    assert(Number(booking1.taxRate) === 18, "Booking 1 snapshots Tax Rate = 18%");
    assert(booking1.taxMode === "EXCLUSIVE", "Booking 1 snapshots Tax Mode = EXCLUSIVE");
    assert(booking1.gstTreatment === "INTRA_STATE", "Booking 1 snapshots GST Treatment = INTRA_STATE");
    assert(Number(booking1.cgstAmount) === 9000, "Booking 1 snapshots CGST = 9,000");
    assert(Number(booking1.sgstAmount) === 9000, "Booking 1 snapshots SGST = 9,000");
    assert(Number(booking1.igstAmount) === 0, "Booking 1 snapshots IGST = 0");
    assert(Number(booking1.totalAmount) === 118000, "Booking 1 total contract matches quotation (118,000)");

    // Invoice Generation (Decision #18)
    const invoice1 = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, booking1.id);
    assert(invoice1 !== null, "Invoice 1 created successfully");
    assert(invoice1.invoiceNumber.startsWith("INV-"), `Persistent Invoice Number allocated: ${invoice1.invoiceNumber}`);
    assert(Number(invoice1.taxableAmount) === 100000, "Invoice 1 snapshots Taxable Amount = 100,000");
    assert(Number(invoice1.taxAmount) === 18000, "Invoice 1 snapshots Tax Amount = 18,000");
    assert(Number(invoice1.taxRate) === 18, "Invoice 1 snapshots Tax Rate = 18%");
    assert(invoice1.taxMode === "EXCLUSIVE", "Invoice 1 snapshots Tax Mode = EXCLUSIVE");
    assert(invoice1.gstTreatment === "INTRA_STATE", "Invoice 1 snapshots GST Treatment = INTRA_STATE");
    assert(Number(invoice1.cgstAmount) === 9000, "Invoice 1 snapshots CGST = 9,000");
    assert(Number(invoice1.sgstAmount) === 9000, "Invoice 1 snapshots SGST = 9,000");
    assert(Number(invoice1.igstAmount) === 0, "Invoice 1 snapshots IGST = 0");
    assert(Number(invoice1.totalAmount) === 118000, "Invoice 1 totalAmount = 118,000");

    // Partial Payment Recording
    const payment1 = await prisma.payment.create({
      data: {
        agencyId: agencyA.id,
        bookingId: booking1.id,
        invoiceId: invoice1.id,
        customerId: customerA.id,
        amount: 50000,
        currency: "INR",
        paymentDate: new Date(),
        paymentMethod: "BANK_TRANSFER",
        status: PaymentStatus.COMPLETED,
      },
    });

    const refreshedInvoice1 = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, booking1.id);
    assert(Number(refreshedInvoice1.paidAmount) === 50000, "Invoice 1 paidAmount updated to 50,000");
    assert(Number(refreshedInvoice1.balanceAmount) === 68000, "Invoice 1 balanceAmount updated to 68,000");
    assert(refreshedInvoice1.status === "PARTIALLY_PAID", "Invoice 1 status transitioned to PARTIALLY_PAID");
    assert(refreshedInvoice1.invoiceNumber === invoice1.invoiceNumber, "Invoice number strictly preserved (Decision #18)");

    // GST Invoice PDF Generation
    const invoiceDetail1 = await invoiceService.getInvoice(agencyA.id, invoice1.id);
    const pdfBuffer1 = await invoicePdfService.generateInvoicePdf(invoiceDetail1!);
    assert(Buffer.isBuffer(pdfBuffer1) && pdfBuffer1.length > 2000, `GST Invoice PDF generated (size: ${pdfBuffer1.length} bytes)`);

    // ──────────────────────────────────────────────────────────────────
    // STEP 5: FULL COMMERCIAL LIFECYCLE 2 — INCLUSIVE INTER-STATE (12%)
    // ──────────────────────────────────────────────────────────────────
    console.log("\n--- 5. Full Lifecycle 2: Inclusive Inter-State (12%) ---");
    // Subtotal = 112,000, Gross = 112,000.
    // 12% Inclusive: Taxable = 112,000 / 1.12 = 100,000, Tax = 12,000 (IGST = 12,000).
    const quote2 = await quotationService.createQuotation(agencyA.id, {
      tripId: tripA.id,
      customerId: customerA.id,
      title: "Goa Beach Inclusive Vacation",
      subtotal: 112000,
      taxRate: 12,
      taxMode: "INCLUSIVE",
      gstTreatment: "INTER_STATE",
    });

    assert(Number(quote2.taxableAmount) === 100000, "Quotation 2 Taxable Amount = 100,000");
    assert(Number(quote2.taxAmount) === 12000, "Quotation 2 Tax Amount = 12,000");
    assert(Number(quote2.igstAmount) === 12000, "Quotation 2 IGST = 12,000");
    assert(Number(quote2.cgstAmount) === 0, "Quotation 2 CGST = 0");
    assert(Number(quote2.sgstAmount) === 0, "Quotation 2 SGST = 0");
    assert(Number(quote2.finalAmount) === 112000, "Quotation 2 Final Customer Price = 112,000");

    const booking2 = await bookingService.convertQuotationToBooking(agencyA.id, quote2.id);
    assert(booking2.taxMode === "INCLUSIVE", "Booking 2 taxMode is INCLUSIVE");
    assert(booking2.gstTreatment === "INTER_STATE", "Booking 2 gstTreatment is INTER_STATE");
    assert(Number(booking2.taxableAmount) === 100000, "Booking 2 taxableAmount = 100,000");
    assert(Number(booking2.taxAmount) === 12000, "Booking 2 taxAmount = 12,000");
    assert(Number(booking2.igstAmount) === 12000, "Booking 2 igstAmount = 12,000");

    const invoice2 = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, booking2.id);
    assert(invoice2.taxMode === "INCLUSIVE", "Invoice 2 taxMode is INCLUSIVE");
    assert(invoice2.gstTreatment === "INTER_STATE", "Invoice 2 gstTreatment is INTER_STATE");
    assert(Number(invoice2.taxableAmount) === 100000, "Invoice 2 taxableAmount = 100,000");
    assert(Number(invoice2.igstAmount) === 12000, "Invoice 2 igstAmount = 12,000");
    assert(Number(invoice2.totalAmount) === 112000, "Invoice 2 totalAmount = 112,000");

    const invoiceDetail2 = await invoiceService.getInvoice(agencyA.id, invoice2.id);
    const pdfBuffer2 = await invoicePdfService.generateInvoicePdf(invoiceDetail2!);
    assert(Buffer.isBuffer(pdfBuffer2) && pdfBuffer2.length > 2000, `Inclusive GST Invoice PDF generated (size: ${pdfBuffer2.length} bytes)`);

    // ──────────────────────────────────────────────────────────────────
    // STEP 6: FULL COMMERCIAL LIFECYCLE 3 — NON-GST EXEMPT
    // ──────────────────────────────────────────────────────────────────
    console.log("\n--- 6. Full Lifecycle 3: Non-GST Exempt ---");
    const quote3 = await quotationService.createQuotation(agencyA.id, {
      tripId: tripA.id,
      customerId: customerA.id,
      title: "Himalayan Pilgrimage Exempt",
      subtotal: 35000,
      taxRate: 0,
      taxMode: "EXCLUSIVE",
      gstTreatment: "NON_GST_EXEMPT",
    });

    assert(Number(quote3.taxAmount) === 0, "Quotation 3 Tax = 0");
    assert(quote3.gstTreatment === "NON_GST_EXEMPT", "Quotation 3 gstTreatment is NON_GST_EXEMPT");

    const booking3 = await bookingService.convertQuotationToBooking(agencyA.id, quote3.id);
    assert(booking3.gstTreatment === "NON_GST_EXEMPT", "Booking 3 gstTreatment is NON_GST_EXEMPT");
    assert(Number(booking3.taxAmount) === 0, "Booking 3 Tax = 0");

    const invoice3 = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, booking3.id);
    assert(invoice3.gstTreatment === "NON_GST_EXEMPT", "Invoice 3 gstTreatment is NON_GST_EXEMPT");
    assert(Number(invoice3.taxAmount) === 0, "Invoice 3 Tax = 0");

    const invoiceDetail3 = await invoiceService.getInvoice(agencyA.id, invoice3.id);
    const pdfBuffer3 = await invoicePdfService.generateInvoicePdf(invoiceDetail3!);
    assert(Buffer.isBuffer(pdfBuffer3) && pdfBuffer3.length > 2000, `Exempt Invoice PDF generated (size: ${pdfBuffer3.length} bytes)`);

    // ──────────────────────────────────────────────────────────────────
    // STEP 7: IMMUTABILITY OF HISTORICAL SNAPSHOTS ON PROFILE UPDATE
    // ──────────────────────────────────────────────────────────────────
    console.log("\n--- 7. Immutability of Historical Snapshots on Agency Profile Update ---");
    await taxProfileService.updateAgencyTaxProfile(agencyA.id, {
      isGstRegistered: true,
      gstin: "27AABCU9603R1ZM",
      defaultGstRate: 28,
      defaultTaxMode: TaxMode.INCLUSIVE,
      defaultGstTreatment: GstTreatment.INTER_STATE,
    });

    const checkBooking1 = await bookingService.getBooking(agencyA.id, booking1.id);
    assert(Number(checkBooking1?.taxRate) === 18, "Booking 1 taxRate remains 18% (Untouched)");
    assert(checkBooking1?.taxMode === "EXCLUSIVE", "Booking 1 taxMode remains EXCLUSIVE (Untouched)");
    assert(checkBooking1?.gstTreatment === "INTRA_STATE", "Booking 1 gstTreatment remains INTRA_STATE (Untouched)");

    const checkInvoice1 = await invoiceService.getInvoice(agencyA.id, invoice1.id);
    assert(Number(checkInvoice1?.taxRate) === 18, "Invoice 1 taxRate remains 18% (Untouched)");
    assert(checkInvoice1?.taxMode === "EXCLUSIVE", "Invoice 1 taxMode remains EXCLUSIVE (Untouched)");
    assert(checkInvoice1?.gstTreatment === "INTRA_STATE", "Invoice 1 gstTreatment remains INTRA_STATE (Untouched)");

    // ──────────────────────────────────────────────────────────────────
    // STEP 8: CANCELLATION & INVOICE STATUS SYNCHRONIZATION
    // ──────────────────────────────────────────────────────────────────
    console.log("\n--- 8. Booking Cancellation & Invoice Status Lifecycle ---");
    const cancelledBooking = await bookingService.cancelBooking(
      agencyA.id,
      booking3.id,
      "Customer requested full itinerary cancellation"
    );
    assert(cancelledBooking.status === "CANCELLED", "Booking 3 status transitioned to CANCELLED");

    const cancelledInvoice = await prisma.invoice.findUnique({ where: { id: invoice3.id } });
    assert(cancelledInvoice?.status === "CANCELLED", "Invoice 3 automatically transitioned to CANCELLED");
    assert(cancelledInvoice?.invoiceNumber === invoice3.invoiceNumber, "Invoice number preserved upon cancellation");

    // ──────────────────────────────────────────────────────────────────
    // STEP 9: MATHEMATICAL & RECONCILIATION INVARIANTS
    // ──────────────────────────────────────────────────────────────────
    console.log("\n--- 9. Mathematical & Reconciliation Invariants ---");
    // Exclusive Invariant: taxableAmount + taxAmount === totalAmount
    assert(
      Number(invoice1.taxableAmount) + Number(invoice1.taxAmount) === Number(invoice1.totalAmount),
      "Exclusive Invariant: 100,000 + 18,000 === 118,000"
    );
    // Inclusive Invariant: taxableAmount + taxAmount === totalAmount
    assert(
      Number(invoice2.taxableAmount) + Number(invoice2.taxAmount) === Number(invoice2.totalAmount),
      "Inclusive Invariant: 100,000 + 12,000 === 112,000"
    );
    // Intra-State Invariant: cgst + sgst === taxAmount & igst === 0
    assert(
      Number(invoice1.cgstAmount) + Number(invoice1.sgstAmount) === Number(invoice1.taxAmount) &&
        Number(invoice1.igstAmount) === 0,
      "Intra-State Invariant: 9,000 + 9,000 === 18,000 & IGST === 0"
    );
    // Inter-State Invariant: igst === taxAmount & cgst === 0 & sgst === 0
    assert(
      Number(invoice2.igstAmount) === Number(invoice2.taxAmount) &&
        Number(invoice2.cgstAmount) === 0 &&
        Number(invoice2.sgstAmount) === 0,
      "Inter-State Invariant: IGST === 12,000 & CGST === 0 & SGST === 0"
    );

    // ──────────────────────────────────────────────────────────────────
    // STEP 10: IDOR & CROSS-TENANT SECURITY AUDIT
    // ──────────────────────────────────────────────────────────────────
    console.log("\n--- 10. IDOR & Cross-Tenant Security Audit ---");
    let crossInvoiceBlocked = false;
    try {
      const res = await invoiceService.getInvoice(agencyB.id, invoice1.id);
      if (!res) crossInvoiceBlocked = true;
    } catch {
      crossInvoiceBlocked = true;
    }
    assert(crossInvoiceBlocked, "IDOR Guard: Agency B cannot read Agency A invoice");

    let crossBookingBlocked = false;
    try {
      const res = await bookingService.getBooking(agencyB.id, booking1.id);
      if (!res) crossBookingBlocked = true;
    } catch {
      crossBookingBlocked = true;
    }
    assert(crossBookingBlocked, "IDOR Guard: Agency B cannot read Agency A booking");

    let crossQuotationBlocked = false;
    try {
      const res = await quotationService.getQuotation(agencyB.id, quote1.id);
      if (!res) crossQuotationBlocked = true;
    } catch {
      crossQuotationBlocked = true;
    }
    assert(crossQuotationBlocked, "IDOR Guard: Agency B cannot read Agency A quotation");

  } catch (error) {
    console.error("E2E Suite crashed with error:", error);
    failed++;
  } finally {
    console.log("\n=================================================================");
    console.log(`BATCH 8 E2E CLOSURE RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("=================================================================\n");
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runE2EClosureSuite();
