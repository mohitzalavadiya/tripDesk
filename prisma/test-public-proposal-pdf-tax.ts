import "dotenv/config";
import prisma from "../src/lib/prisma";
import { quotationService } from "../src/lib/services/quotation-service";
import { quotationPdfService } from "../src/lib/services/quotation-pdf-service";
import { taxService } from "../src/lib/services/tax-service";

async function runTests() {
  console.log("=======================================================");
  console.log("TRIPDESK TAX V1 — BATCH 6 PUBLIC PROPOSAL & PDF TESTS");
  console.log("=======================================================\n");

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
    // Locate or create test agency
    let agency = await prisma.agency.findFirst({ where: { name: "Batch 6 Test Agency" } });
    if (!agency) {
      agency = await prisma.agency.create({
        data: {
          name: "Batch 6 Test Agency",
          email: "batch6@agency.com",
          phone: "9876543210",
        },
      });
    }

    // Set Agency Tax Profile default
    await prisma.agencyTaxProfile.upsert({
      where: { agencyId: agency.id },
      create: {
        agencyId: agency.id,
        isGstRegistered: true,
        gstin: "27AABCU9603R1ZM",
        state: "Maharashtra",
        defaultGstRate: 18,
        defaultTaxMode: "EXCLUSIVE",
        defaultGstTreatment: "INTRA_STATE",
      },
      update: {
        defaultGstRate: 18,
        defaultTaxMode: "EXCLUSIVE",
        defaultGstTreatment: "INTRA_STATE",
      },
    });

    let customer = await prisma.customer.findFirst({ where: { agencyId: agency.id } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          agencyId: agency.id,
          name: "Rohan Verma",
          phone: "9123456780",
          email: "rohan@example.com",
        },
      });
    }

    let trip = await prisma.trip.findFirst({ where: { agencyId: agency.id } });
    if (!trip) {
      trip = await prisma.trip.create({
        data: {
          agencyId: agency.id,
          customerId: customer.id,
          tripNumber: "TRIP-B6-001",
          title: "Batch 6 Goa Luxury Getaway",
          startDate: new Date("2026-11-01"),
          endDate: new Date("2026-11-05"),
        },
      });
    }

    // ──────────────────────────────────────────────────────────────────
    // GROUP 1: PUBLIC PROPOSAL & REDACTION SECURITY
    // ──────────────────────────────────────────────────────────────────
    console.log("--- 1. Public Proposal DTO & Security Redaction ---");

    const quote1 = await quotationService.createQuotation(agency.id, {
      tripId: trip.id,
      customerId: customer.id,
      title: "Exclusive 18% Intra-State Proposal",
      subtotal: 50000,
      markupPercentage: 10,
      discountAmount: 2000,
      taxRate: 18,
      taxMode: "EXCLUSIVE",
      gstTreatment: "INTRA_STATE",
      internalNotes: "TOP SECRET SUPPLIER MARGIN: DO NOT LEAK TO CUSTOMER",
    });

    const publicQuote1 = await quotationService.getPublicQuotationByToken(quote1.shareToken!);
    assert(publicQuote1 !== null, "1. Public quotation retrieved successfully via shareToken");

    // Redaction check
    assert((publicQuote1 as any).internalNotes === undefined, "1. Internal notes are strictly redacted from public payload");
    assert((publicQuote1 as any).markupAmount === undefined, "1. Markup amount is strictly redacted from public payload");
    assert((publicQuote1 as any).markupPercentage === undefined, "1. Markup percentage is strictly redacted from public payload");
    assert((publicQuote1 as any).subtotal === undefined, "1. Internal subtotal/cost is strictly redacted from public payload");

    // Tax snapshot fields check
    assert(publicQuote1?.taxRate === 18, "1. Tax rate is accurately exposed (18%)");
    assert(publicQuote1?.taxMode === "EXCLUSIVE", "1. Tax mode is EXCLUSIVE");
    assert(publicQuote1?.gstTreatment === "INTRA_STATE", "1. GST treatment is INTRA_STATE");
    assert(publicQuote1?.discountAmount === 2000, "1. Discount amount is 2000");
    assert(publicQuote1?.taxableAmount === 53000, "1. Taxable amount is 53000 (50k + 5k - 2k)");
    assert(publicQuote1?.taxAmount === 9540, "1. Tax amount is 9540 (18% of 53k)");
    assert(publicQuote1?.cgstAmount === 4770, "1. CGST amount is 4770 (50% of tax)");
    assert(publicQuote1?.sgstAmount === 4770, "1. SGST amount is 4770 (50% of tax)");
    assert(publicQuote1?.igstAmount === 0, "1. IGST amount is 0");
    assert(publicQuote1?.finalAmount === 62540, "1. Final amount is 62540 (53000 + 9540)");

    // ──────────────────────────────────────────────────────────────────
    // GROUP 2: INTER-STATE (IGST) & INCLUSIVE TAX MODES
    // ──────────────────────────────────────────────────────────────────
    console.log("\n--- 2. Inter-State & Inclusive Tax Public Modes ---");

    const quote2 = await quotationService.createQuotation(agency.id, {
      tripId: trip.id,
      customerId: customer.id,
      title: "Inclusive 12% Inter-State Proposal",
      subtotal: 50000,
      markupPercentage: 0,
      discountAmount: 0,
      taxRate: 12,
      taxMode: "INCLUSIVE",
      gstTreatment: "INTER_STATE",
    });

    const publicQuote2 = await quotationService.getPublicQuotationByToken(quote2.shareToken!);
    assert(publicQuote2?.taxMode === "INCLUSIVE", "2. Public quotation taxMode is INCLUSIVE");
    assert(publicQuote2?.gstTreatment === "INTER_STATE", "2. Public quotation gstTreatment is INTER_STATE");
    assert(publicQuote2?.taxRate === 12, "2. Public quotation taxRate is 12%");
    assert(publicQuote2?.taxableAmount === 44642.86, "2. Inclusive Taxable Amount is 44642.86 (50000 / 1.12)");
    assert(publicQuote2?.taxAmount === 5357.14, "2. Inclusive Tax Amount is 5357.14 (50000 - 44642.86)");
    assert(publicQuote2?.igstAmount === 5357.14, "2. Inter-State IGST Amount is 5357.14");
    assert(publicQuote2?.cgstAmount === 0, "2. Inter-State CGST Amount is 0");
    assert(publicQuote2?.sgstAmount === 0, "2. Inter-State SGST Amount is 0");
    assert(publicQuote2?.finalAmount === 50000, "2. Inclusive Final Customer Price is 50000");

    // ──────────────────────────────────────────────────────────────────
    // GROUP 3: NON_GST_EXEMPT PUBLIC PRESENTATION
    // ──────────────────────────────────────────────────────────────────
    console.log("\n--- 3. Non-GST Exempt Public Presentation ---");

    const quote3 = await quotationService.createQuotation(agency.id, {
      tripId: trip.id,
      customerId: customer.id,
      title: "Exempt Proposal",
      subtotal: 35000,
      markupPercentage: 0,
      discountAmount: 0,
      taxRate: 0,
      taxMode: "EXCLUSIVE",
      gstTreatment: "NON_GST_EXEMPT",
    });

    const publicQuote3 = await quotationService.getPublicQuotationByToken(quote3.shareToken!);
    assert(publicQuote3?.gstTreatment === "NON_GST_EXEMPT", "3. GST treatment is NON_GST_EXEMPT");
    assert(publicQuote3?.taxAmount === 0, "3. Tax amount is 0");
    assert(publicQuote3?.cgstAmount === 0, "3. CGST is 0");
    assert(publicQuote3?.sgstAmount === 0, "3. SGST is 0");
    assert(publicQuote3?.igstAmount === 0, "3. IGST is 0");
    assert(publicQuote3?.finalAmount === 35000, "3. Final amount is 35000");

    // ──────────────────────────────────────────────────────────────────
    // GROUP 4: PACKAGE OPTIONS TAX PRESENTATION & SELECTION
    // ──────────────────────────────────────────────────────────────────
    console.log("\n--- 4. Package Options Tax Presentation & Selection ---");

    const tiers = await quotationService.generateDefaultPackageTiers(agency.id, quote1.id);
    assert(tiers.length === 3, "4. Generated 3 package tiers on quote1");

    const publicQuoteWithTiers = await quotationService.getPublicQuotationByToken(quote1.shareToken!);
    assert(publicQuoteWithTiers?.packageOptions.length === 3, "4. Public proposal returns 3 package options");

    const stdOption = publicQuoteWithTiers?.packageOptions.find((p) => p.name.includes("Standard"));
    const luxOption = publicQuoteWithTiers?.packageOptions.find((p) => p.name.includes("Luxury"));

    assert(stdOption !== undefined, "4. Standard package option exists");
    assert(stdOption?.taxRate === 18, "4. Standard package option taxRate is 18%");
    assert(stdOption?.taxMode === "EXCLUSIVE", "4. Standard package option taxMode is EXCLUSIVE");
    assert(stdOption?.taxableAmount !== undefined && stdOption.taxableAmount > 0, "4. Standard package option has valid taxableAmount");
    assert(stdOption?.taxAmount !== undefined && stdOption.taxAmount > 0, "4. Standard package option has valid taxAmount");
    assert(stdOption?.cgstAmount !== undefined && stdOption.cgstAmount > 0, "4. Standard package option has valid CGST");
    assert((stdOption as any).markupAmount === undefined, "4. Package option markup is strictly redacted from public DTO");
    assert((stdOption as any).subtotal === undefined, "4. Package option subtotal is strictly redacted from public DTO");

    assert(luxOption !== undefined, "4. Luxury package option exists");
    assert(luxOption?.finalAmount !== undefined && luxOption.finalAmount > (stdOption?.finalAmount || 0), "4. Luxury option price > Standard option price");

    // ──────────────────────────────────────────────────────────────────
    // GROUP 5: HISTORICAL DATA SAFETY & SECURITY
    // ──────────────────────────────────────────────────────────────────
    console.log("\n--- 5. Historical Data Safety & Share Token Security ---");

    const quoteHistorical = await quotationService.createQuotation(agency.id, {
      tripId: trip.id,
      customerId: customer.id,
      title: "Historical 18% Exclusive Quote",
      subtotal: 40000,
      markupPercentage: 10,
      discountAmount: 0,
      taxRate: 18,
      taxMode: "EXCLUSIVE",
      gstTreatment: "INTRA_STATE",
    });
    const expectedHistoricalFinal = Number(quoteHistorical.finalAmount);

    // Update Agency Tax Profile default to 28% Inclusive
    await prisma.agencyTaxProfile.update({
      where: { agencyId: agency.id },
      data: {
        defaultGstRate: 28,
        defaultTaxMode: "INCLUSIVE",
        defaultGstTreatment: "INTER_STATE",
      },
    });

    // Verify existing quoteHistorical public proposal remains 18% Exclusive / Intra-State (NOT altered by agency profile change)
    const publicQuoteHistAfterProfileChange = await quotationService.getPublicQuotationByToken(quoteHistorical.shareToken!);
    assert(publicQuoteHistAfterProfileChange?.taxRate === 18, "5. Historical quotation taxRate remains 18% despite Agency profile update");
    assert(publicQuoteHistAfterProfileChange?.taxMode === "EXCLUSIVE", "5. Historical quotation taxMode remains EXCLUSIVE");
    assert(publicQuoteHistAfterProfileChange?.gstTreatment === "INTRA_STATE", "5. Historical quotation gstTreatment remains INTRA_STATE");
    assert(publicQuoteHistAfterProfileChange?.finalAmount === expectedHistoricalFinal, "5. Historical quotation finalAmount remains unchanged");

    // Invalid shareToken
    const invalidQuote = await quotationService.getPublicQuotationByToken("non_existent_fake_token_12345");
    assert(invalidQuote === null, "5. Invalid share token returns null");

    // Archived quotation cannot be retrieved via public token
    await quotationService.deleteQuotation(agency.id, quote3.id);
    const archivedQuote = await quotationService.getPublicQuotationByToken(quote3.shareToken!);
    assert(archivedQuote === null, "5. Archived quotation is protected and returns null on public shareToken");

    // ──────────────────────────────────────────────────────────────────
    // GROUP 6: PDF GENERATION TESTS
    // ──────────────────────────────────────────────────────────────────
    console.log("\n--- 6. Customer-Facing Quotation PDF Generation ---");

    // PDF 1: Exclusive + Intra-State
    const pdf1 = await quotationPdfService.generateQuotationPdf({
      quotationNumber: quote1.quotationNumber,
      version: quote1.version,
      title: quote1.title,
      currency: "INR",
      discountAmount: Number(quote1.discountAmount),
      taxableAmount: Number(quote1.taxableAmount),
      taxRate: Number(quote1.taxRate),
      taxMode: quote1.taxMode!,
      gstTreatment: quote1.gstTreatment!,
      cgstAmount: Number(quote1.cgstAmount),
      sgstAmount: Number(quote1.sgstAmount),
      igstAmount: Number(quote1.igstAmount),
      taxAmount: Number(quote1.taxAmount),
      finalAmount: Number(quote1.finalAmount),
      agency: { name: agency.name, phone: agency.phone, email: agency.email },
      customer: { name: customer.name, phone: customer.phone, email: customer.email },
      trip: { title: trip.title },
    });
    assert(Buffer.isBuffer(pdf1), "6. Exclusive + Intra-State PDF buffer generated successfully");
    assert(pdf1.length > 1000, `6. PDF buffer size is valid (${pdf1.length} bytes)`);

    // PDF 2: Inclusive + Inter-State
    const pdf2 = await quotationPdfService.generateQuotationPdf({
      quotationNumber: quote2.quotationNumber,
      version: quote2.version,
      title: quote2.title,
      currency: "INR",
      discountAmount: Number(quote2.discountAmount),
      taxableAmount: Number(quote2.taxableAmount),
      taxRate: Number(quote2.taxRate),
      taxMode: quote2.taxMode!,
      gstTreatment: quote2.gstTreatment!,
      cgstAmount: Number(quote2.cgstAmount),
      sgstAmount: Number(quote2.sgstAmount),
      igstAmount: Number(quote2.igstAmount),
      taxAmount: Number(quote2.taxAmount),
      finalAmount: Number(quote2.finalAmount),
      agency: { name: agency.name, phone: agency.phone, email: agency.email },
      customer: { name: customer.name, phone: customer.phone, email: customer.email },
      trip: { title: trip.title },
    });
    assert(Buffer.isBuffer(pdf2), "6. Inclusive + Inter-State PDF buffer generated successfully");
    assert(pdf2.length > 1000, `6. Inclusive PDF buffer size is valid (${pdf2.length} bytes)`);

    // PDF 3: Package Options PDF
    const pdf3 = await quotationPdfService.generateQuotationPdf({
      quotationNumber: quote1.quotationNumber,
      version: quote1.version,
      title: quote1.title,
      currency: "INR",
      discountAmount: Number(quote1.discountAmount),
      taxableAmount: Number(quote1.taxableAmount),
      taxRate: Number(quote1.taxRate),
      taxMode: quote1.taxMode!,
      gstTreatment: quote1.gstTreatment!,
      cgstAmount: Number(quote1.cgstAmount),
      sgstAmount: Number(quote1.sgstAmount),
      igstAmount: Number(quote1.igstAmount),
      taxAmount: Number(quote1.taxAmount),
      finalAmount: Number(quote1.finalAmount),
      packageOptions: publicQuoteWithTiers?.packageOptions,
      selectedPackageOption: publicQuoteWithTiers?.packageOptions[1],
      agency: { name: agency.name, phone: agency.phone, email: agency.email },
      customer: { name: customer.name, phone: customer.phone, email: customer.email },
      trip: { title: trip.title },
    });
    assert(Buffer.isBuffer(pdf3), "6. Tiered Package Quotation PDF generated successfully");
    assert(pdf3.length > 1000, `6. Package PDF buffer size is valid (${pdf3.length} bytes)`);

    console.log("\n=======================================================");
    console.log(`BATCH 6 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
    console.log("=======================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
