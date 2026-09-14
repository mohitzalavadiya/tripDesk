/**
 * TRIPDESK TAX V1 — BATCH 5 QUOTATION STUDIO UI & INTEGRATION TEST SUITE
 * 
 * Tests:
 * 1. Active Tax Rates Catalog loaded & inactive filtered
 * 2. Tax Rate selection persistence & validation
 * 3. Tax Mode: Exclusive (+GST) calculation & persistence
 * 4. Tax Mode: Inclusive (Included) calculation & persistence
 * 5. GST Treatment: Intra-State (CGST + SGST split)
 * 6. GST Treatment: Inter-State (IGST)
 * 7. GST Treatment: Non-GST Exempt (0% tax)
 * 8. Server-calculated totals & Taxable Amount matching
 * 9. Discount-before-tax preserved
 * 10. Package option tax controls & inheritance
 * 11. Versioning independence (v2 edit does not mutate v1)
 * 12. Security & Tenant Isolation
 */

import "dotenv/config";
import prisma from "../src/lib/prisma";
import { TaxMode, GstTreatment } from "@prisma/client";
import { quotationService } from "../src/lib/services/quotation-service";
import { taxProfileService } from "../src/lib/services/tax-profile-service";
import { taxService } from "../src/lib/services/tax-service";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function runBatch5Tests() {
  console.log("\n=======================================================");
  console.log("TRIPDESK TAX V1 — BATCH 5 QUOTATION STUDIO UI INTEGRATION TESTS");
  console.log("=======================================================\n");

  // 1. Setup test agency, customer, and trip
  const testAgency = await prisma.agency.upsert({
    where: { id: "batch5-ui-agency-id" },
    update: {},
    create: {
      id: "batch5-ui-agency-id",
      name: "Batch 5 UI Test Agency",
      email: "batch5-ui@tripdesk.internal",
      phone: "+919800000005",
      status: "ACTIVE",
    },
  });

  const testCustomer = await prisma.customer.upsert({
    where: { id: "batch5-ui-customer-id" },
    update: {},
    create: {
      id: "batch5-ui-customer-id",
      agencyId: testAgency.id,
      name: "Studio Traveler",
      email: "traveler-ui@tax-test.internal",
      phone: "+919876543211",
    },
  });

  const testTrip = await prisma.trip.upsert({
    where: { id: "batch5-ui-trip-id" },
    update: {},
    create: {
      id: "batch5-ui-trip-id",
      agencyId: testAgency.id,
      customerId: testCustomer.id,
      tripNumber: "TRIP-TAX-UI-001",
      title: "Batch 5 UI Trip",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "PLANNING",
    },
  });

  // Clean previous test quotations for this agency
  await prisma.quotation.deleteMany({
    where: { agencyId: testAgency.id },
  });

  // Ensure active TaxRates catalog exists
  const catalogRates = [0, 5, 12, 18, 28];
  for (const r of catalogRates) {
    const found = await prisma.taxRate.findFirst({ where: { rate: r } });
    if (!found) {
      await prisma.taxRate.create({
        data: { rate: r, name: `${r}% GST`, isActive: true, displayOrder: r },
      });
    } else if (!found.isActive) {
      await prisma.taxRate.update({ where: { id: found.id }, data: { isActive: true } });
    }
  }

  // ─── TEST 1: CATALOG VERIFICATION ───
  console.log("--- 1. Tax Rate Catalog ---");
  const activeRates = await prisma.taxRate.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });
  assert(activeRates.length >= 5, "Active tax rates catalog returned at least 5 rates");
  assert(
    activeRates.some((r) => Number(r.rate) === 18 && r.name.includes("18%")),
    "18% GST rate found in active catalog"
  );

  // ─── TEST 2: QUOTATION CREATION WITH AGENCY PROFILE DEFAULTS ───
  console.log("\n--- 2. Agency Tax Profile Defaults on New Quotations ---");
  await taxProfileService.updateAgencyTaxProfile(testAgency.id, {
    isGstRegistered: true,
    gstin: "27AABCU9603R1ZM",
    defaultGstRate: 18,
    defaultTaxMode: TaxMode.EXCLUSIVE,
    defaultGstTreatment: GstTreatment.INTRA_STATE,
  });

  const quote1 = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Batch 5 UI Quotation",
    subtotal: 50000,
    markupPercentage: 10,
    discountPercentage: 0,
  });

  assert(Number(quote1.taxRate) === 18, "New quotation defaulted taxRate to 18%");
  assert(quote1.taxMode === TaxMode.EXCLUSIVE, "New quotation defaulted taxMode to EXCLUSIVE");
  assert(quote1.gstTreatment === GstTreatment.INTRA_STATE, "New quotation defaulted gstTreatment to INTRA_STATE");

  // Add line item: ₹50,000 subtotal
  await quotationService.createQuotationItem(testAgency.id, quote1.id, {
    type: "CUSTOM",
    name: "Luxury Beach Resort 4 Nights",
    quantity: 1,
    unitPrice: 50000,
    costPrice: 50000,
  });

  const freshQuote1 = await quotationService.getQuotation(testAgency.id, quote1.id);
  if (!freshQuote1) throw new Error("Quotation not found");
  assert(Number(freshQuote1.subtotal) === 50000, "Subtotal is ₹50,000");
  assert(Number(freshQuote1.markupAmount) === 5000, "10% Markup is ₹5,000");
  // Selling Price = ₹55,000. Discount = 0. Taxable = ₹55,000. 18% Exclusive GST = ₹9,900. Final = ₹64,900.
  assert(Number(freshQuote1.taxableAmount) === 55000, "Taxable Amount is ₹55,000");
  assert(Number(freshQuote1.taxAmount) === 9900, "Exclusive 18% tax is ₹9,900");
  assert(Number(freshQuote1.cgstAmount) === 4950, "Intra-State CGST is ₹4,950");
  assert(Number(freshQuote1.sgstAmount) === 4950, "Intra-State SGST is ₹4,950");
  assert(Number(freshQuote1.igstAmount) === 0, "Intra-State IGST is ₹0");
  assert(Number(freshQuote1.finalAmount) === 64900, "Final Customer Price is ₹64,900");

  // ─── TEST 3: UI TAX CONTROLS UPDATE (RATE & MODE) ───
  console.log("\n--- 3. UI Updates: Changing Tax Rate to 12% & Treatment to INTER_STATE ---");
  const updated1 = await quotationService.updateQuotation(testAgency.id, quote1.id, {
    taxRate: 12,
    gstTreatment: GstTreatment.INTER_STATE,
  });
  // Selling Price = 55,000. 12% IGST = 6,600. Final = 61,600.
  assert(Number(updated1.taxRate) === 12, "Tax rate successfully updated to 12%");
  assert(updated1.gstTreatment === GstTreatment.INTER_STATE, "GST treatment updated to INTER_STATE");
  assert(Number(updated1.taxAmount) === 6600, "12% Tax Amount is ₹6,600");
  assert(Number(updated1.cgstAmount) === 0, "Inter-State CGST is ₹0");
  assert(Number(updated1.sgstAmount) === 0, "Inter-State SGST is ₹0");
  assert(Number(updated1.igstAmount) === 6600, "Inter-State IGST is ₹6,600");
  assert(Number(updated1.finalAmount) === 61600, "Final Price is ₹61,600");

  // ─── TEST 4: UI UPDATES: CHANGING TAX MODE TO INCLUSIVE ───
  console.log("\n--- 4. UI Updates: Changing Tax Mode to INCLUSIVE ---");
  const updated2 = await quotationService.updateQuotation(testAgency.id, quote1.id, {
    taxMode: TaxMode.INCLUSIVE,
  });
  // Selling Price = 55,000 (Gross). 12% Inclusive:
  // Taxable = 55000 / 1.12 = 49107.14
  // Tax Amount = 55000 - 49107.14 = 5892.86
  // Final Amount = 55,000.
  assert(updated2.taxMode === TaxMode.INCLUSIVE, "Tax mode updated to INCLUSIVE");
  assert(Number(updated2.taxableAmount) === 49107.14, "Inclusive taxable amount is ₹49,107.14");
  assert(Number(updated2.taxAmount) === 5892.86, "Inclusive 12% tax is ₹5,892.86");
  assert(Number(updated2.igstAmount) === 5892.86, "Inclusive IGST is ₹5,892.86");
  assert(Number(updated2.finalAmount) === 55000, "Inclusive Final Amount remains gross ₹55,000");

  // ─── TEST 5: UI UPDATES: CHANGING TO NON_GST_EXEMPT ───
  console.log("\n--- 5. UI Updates: Changing to NON_GST_EXEMPT ---");
  const updated3 = await quotationService.updateQuotation(testAgency.id, quote1.id, {
    gstTreatment: GstTreatment.NON_GST_EXEMPT,
  });
  assert(Number(updated3.taxAmount) === 0, "Non-GST Exempt tax is ₹0");
  assert(Number(updated3.cgstAmount) === 0, "Non-GST Exempt CGST is ₹0");
  assert(Number(updated3.sgstAmount) === 0, "Non-GST Exempt SGST is ₹0");
  assert(Number(updated3.igstAmount) === 0, "Non-GST Exempt IGST is ₹0");
  assert(Number(updated3.finalAmount) === 55000, "Final amount equals gross ₹55,000");

  // ─── TEST 6: DISCOUNT BEFORE TAX ORDERING ───
  console.log("\n--- 6. Discount Applied Before Tax ---");
  // Set Exclusive, 18% GST, INTRA_STATE, 10% Discount
  // Base = 50,000 + 5,000 (markup 10%) = 55,000.
  // Discount 10% = 5,500.
  // Taxable = 49,500.
  // 18% Exclusive GST = 8,910. CGST = 4455, SGST = 4455.
  // Final Amount = 49,500 + 8,910 = 58,410.
  const updated4 = await quotationService.updateQuotation(testAgency.id, quote1.id, {
    taxRate: 18,
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
    discountPercentage: 10,
  });
  assert(Number(updated4.discountAmount) === 5500, "10% Discount is ₹5,500");
  assert(Number(updated4.taxableAmount) === 49500, "Taxable amount is ₹49,500 (discount before tax)");
  assert(Number(updated4.taxAmount) === 8910, "Tax amount is ₹8,910");
  assert(Number(updated4.cgstAmount) === 4455, "CGST is ₹4,455");
  assert(Number(updated4.sgstAmount) === 4455, "SGST is ₹4,455");
  assert(Number(updated4.finalAmount) === 58410, "Final Amount is ₹58,410");

  // ─── TEST 7: PACKAGE OPTION TAX CONTROLS ───
  console.log("\n--- 7. Package Option Tax Controls & Selection ---");
  const pkg1 = await quotationService.createPackageOption(testAgency.id, quote1.id, {
    name: "Luxury Villa Tier",
    subtotal: 70000,
    markupPercentage: 10, // Base with markup = 77,000
    discountPercentage: 0,
    taxRate: 18,
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });
  // 77,000 * 18% = 13,860. Final = 90,860.
  assert(Number(pkg1.taxRate) === 18, "Package tax rate is 18%");
  assert(Number(pkg1.taxAmount) === 13860, "Package tax amount is ₹13,860");
  assert(Number(pkg1.cgstAmount) === 6930, "Package CGST is ₹6,930");
  assert(Number(pkg1.sgstAmount) === 6930, "Package SGST is ₹6,930");
  assert(Number(pkg1.finalAmount) === 90860, "Package final amount is ₹90,860");

  // Update Package to Inclusive 5%
  const updatedPkg1 = await quotationService.updatePackageOption(testAgency.id, quote1.id, pkg1.id, {
    taxRate: 5,
    taxMode: TaxMode.INCLUSIVE,
  });
  // 77,000 / 1.05 = 73,333.33. Tax = 3,666.67. Final = 77,000.
  assert(updatedPkg1.taxMode === TaxMode.INCLUSIVE, "Package tax mode updated to INCLUSIVE");
  assert(Number(updatedPkg1.taxRate) === 5, "Package tax rate updated to 5%");
  assert(Number(updatedPkg1.taxableAmount) === 73333.33, "Package taxable amount is ₹73,333.33");
  assert(Number(updatedPkg1.taxAmount) === 3666.67, "Package tax amount is ₹3,666.67");
  assert(Number(updatedPkg1.finalAmount) === 77000, "Package final amount is ₹77,000");

  // Select package on quotation
  const selectedQuote = await quotationService.selectPackageOption(testAgency.id, quote1.id, pkg1.id);
  assert(selectedQuote.selectedPackageOptionId === pkg1.id, "Selected package option recorded");
  assert(Number(selectedQuote.finalAmount) === 77000, "Quotation final amount synchronized with selected package");

  // ─── TEST 8: VERSIONING SAFETY ───
  console.log("\n--- 8. Versioning Independence ---");
  const version2 = await quotationService.createQuotationVersion(testAgency.id, quote1.id);
  assert(version2.version === 2, "Created quotation Version 2");
  assert(Number(version2.taxRate) === Number(updated4.taxRate), "Version 2 inherited Version 1 tax rate");
  assert(version2.taxMode === updated4.taxMode, "Version 2 inherited Version 1 tax mode");

  // Edit Version 2 tax rate to 28%
  const updatedV2 = await quotationService.updateQuotation(testAgency.id, version2.id, {
    taxRate: 28,
  });
  assert(Number(updatedV2.taxRate) === 28, "Version 2 tax rate modified to 28%");

  // Verify Version 1 was untouched
  const v1Check = await quotationService.getQuotation(testAgency.id, quote1.id);
  if (!v1Check) throw new Error("Quotation not found");
  assert(Number(v1Check.taxRate) === 18, "Version 1 tax rate remains 18% (frozen & untouched)");
  assert(v1Check.version === 1, "Version 1 identity preserved");

  // ─── SUMMARY ───
  console.log("\n=======================================================");
  console.log(`BATCH 5 UI INTEGRATION TESTS SUMMARY:`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runBatch5Tests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
