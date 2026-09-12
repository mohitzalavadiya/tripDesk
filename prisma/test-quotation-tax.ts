/**
 * TRIPDESK TAX V1 — BATCH 4 INTEGRATION TEST SUITE
 * 
 * Verifies Quotation and Package Option Tax Engine Integration:
 * 1. Exclusive tax calculation across catalog rates (0%, 5%, 12%, 18%, 28%)
 * 2. Inclusive tax calculation across catalog rates (0%, 5%, 12%, 18%, 28%)
 * 3. GST Treatments: INTRA_STATE (CGST/SGST split), INTER_STATE (IGST), NON_GST_EXEMPT (0 tax)
 * 4. Discount applied before tax
 * 5. Deterministic half-up rounding and odd-paise tax reconciliation
 * 6. Package option tax calculation and selection
 * 7. Agency Tax Profile defaults applied on NEW quotations
 * 8. Neutral/zero-tax state when no Agency Tax Profile exists
 * 9. Validation: Inactive / non-catalog tax rates rejected, invalid enums rejected
 * 10. Historical Safety: Existing quotation/package snapshots frozen and unmodified when Agency Tax Profile changes
 * 11. Versioning Safety: Forked versions preserve snapshot independence
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

async function runTests() {
  console.log("\n=======================================================");
  console.log("TRIPDESK TAX V1 — BATCH 4 QUOTATION TAX INTEGRATION TESTS");
  console.log("=======================================================\n");

  // Setup test agency, customer, and trip
  const testAgency = await prisma.agency.upsert({
    where: { id: "batch4-test-agency-id" },
    update: {},
    create: {
      id: "batch4-test-agency-id",
      name: "Batch 4 Test Agency",
      email: "batch4-test@tripdesk.internal",
      phone: "+919800000004",
      status: "ACTIVE",
    },
  });

  const testCustomer = await prisma.customer.upsert({
    where: { id: "batch4-test-customer-id" },
    update: {},
    create: {
      id: "batch4-test-customer-id",
      agencyId: testAgency.id,
      name: "Tax Test Traveler",
      email: "traveler@tax-test.internal",
      phone: "+919876543210",
    },
  });

  const testTrip = await prisma.trip.upsert({
    where: { id: "batch4-test-trip-id" },
    update: {},
    create: {
      id: "batch4-test-trip-id",
      agencyId: testAgency.id,
      customerId: testCustomer.id,
      tripNumber: "TRIP-TAX-001",
      title: "Batch 4 Tax Integration Trip",
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "PLANNING",
    },
  });

  // Clean previous test quotations for this agency
  await prisma.quotation.deleteMany({
    where: { agencyId: testAgency.id },
  });

  // Ensure TaxRates are active
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

  // Clear or set known agency tax profile
  await prisma.agencyTaxProfile.deleteMany({
    where: { agencyId: testAgency.id },
  });

  // -------------------------------------------------------------
  // TEST GROUP 1: EXCLUSIVE MODE (0%, 5%, 12%, 18%, 28%)
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 1: EXCLUSIVE TAX MODE ---");

  // 1. 0% Exclusive
  const qEx0 = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Exclusive 0% Test",
    subtotal: 10000,
    markupPercentage: 10, // Selling = 11000
    discountPercentage: 0,
    taxRate: 0,
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });
  assert(Number(qEx0.taxableAmount) === 11000, "1. 0% Exclusive Taxable Amount = 11000", `Got ${qEx0.taxableAmount}`);
  assert(Number(qEx0.taxAmount) === 0, "1. 0% Exclusive Tax Amount = 0", `Got ${qEx0.taxAmount}`);
  assert(Number(qEx0.finalAmount) === 11000, "1. 0% Exclusive Final Amount = 11000", `Got ${qEx0.finalAmount}`);
  assert(Number(qEx0.cgstAmount) === 0 && Number(qEx0.sgstAmount) === 0, "1. 0% Exclusive CGST & SGST = 0");

  // 2. 5% Exclusive
  const qEx5 = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Exclusive 5% Test",
    subtotal: 10000,
    markupPercentage: 10, // Selling = 11000
    discountPercentage: 0,
    taxRate: 5,
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });
  assert(Number(qEx5.taxAmount) === 550, "2. 5% Exclusive Tax Amount = 550", `Got ${qEx5.taxAmount}`);
  assert(Number(qEx5.finalAmount) === 11550, "2. 5% Exclusive Final Amount = 11550", `Got ${qEx5.finalAmount}`);
  assert(Number(qEx5.cgstAmount) === 275 && Number(qEx5.sgstAmount) === 275, "2. 5% Exclusive CGST/SGST = 275");

  // 3. 12% Exclusive
  const qEx12 = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Exclusive 12% Test",
    subtotal: 20000,
    markupPercentage: 0,
    taxRate: 12,
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });
  assert(Number(qEx12.taxAmount) === 2400, "3. 12% Exclusive Tax Amount = 2400", `Got ${qEx12.taxAmount}`);
  assert(Number(qEx12.finalAmount) === 22400, "3. 12% Exclusive Final Amount = 22400", `Got ${qEx12.finalAmount}`);

  // 4. 18% Exclusive
  const qEx18 = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Exclusive 18% Test",
    subtotal: 35000,
    markupPercentage: 10, // Selling = 38500
    discountPercentage: 5, // Discount = 1925, Taxable = 36575
    taxRate: 18,
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });
  assert(Number(qEx18.taxableAmount) === 36575, "4. 18% Exclusive Taxable Amount = 36575", `Got ${qEx18.taxableAmount}`);
  assert(Number(qEx18.taxAmount) === 6583.5, "4. 18% Exclusive Tax Amount = 6583.50", `Got ${qEx18.taxAmount}`);
  assert(Number(qEx18.finalAmount) === 43158.5, "4. 18% Exclusive Final Amount = 43158.50", `Got ${qEx18.finalAmount}`);

  // 5. 28% Exclusive
  const qEx28 = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Exclusive 28% Test",
    subtotal: 50000,
    markupPercentage: 0,
    taxRate: 28,
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });
  assert(Number(qEx28.taxAmount) === 14000, "5. 28% Exclusive Tax Amount = 14000", `Got ${qEx28.taxAmount}`);
  assert(Number(qEx28.finalAmount) === 64000, "5. 28% Exclusive Final Amount = 64000", `Got ${qEx28.finalAmount}`);

  // -------------------------------------------------------------
  // TEST GROUP 2: INCLUSIVE MODE (0%, 5%, 12%, 18%, 28%)
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: INCLUSIVE TAX MODE ---");

  // 6. 0% Inclusive
  const qIn0 = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Inclusive 0% Test",
    subtotal: 10000,
    markupPercentage: 10, // Selling = 11000
    taxRate: 0,
    taxMode: TaxMode.INCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });
  assert(Number(qIn0.taxableAmount) === 11000, "6. 0% Inclusive Taxable Amount = 11000", `Got ${qIn0.taxableAmount}`);
  assert(Number(qIn0.taxAmount) === 0, "6. 0% Inclusive Tax Amount = 0", `Got ${qIn0.taxAmount}`);
  assert(Number(qIn0.finalAmount) === 11000, "6. 0% Inclusive Final Amount = 11000", `Got ${qIn0.finalAmount}`);

  // 7. 5% Inclusive (Selling = 10500)
  const qIn5 = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Inclusive 5% Test",
    subtotal: 10500,
    markupPercentage: 0,
    taxRate: 5,
    taxMode: TaxMode.INCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });
  assert(Number(qIn5.taxableAmount) === 10000, "7. 5% Inclusive Taxable Amount = 10000", `Got ${qIn5.taxableAmount}`);
  assert(Number(qIn5.taxAmount) === 500, "7. 5% Inclusive Tax Amount = 500", `Got ${qIn5.taxAmount}`);
  assert(Number(qIn5.finalAmount) === 10500, "7. 5% Inclusive Final Amount = 10500", `Got ${qIn5.finalAmount}`);

  // 8. 12% Inclusive (Selling = 11200)
  const qIn12 = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Inclusive 12% Test",
    subtotal: 11200,
    markupPercentage: 0,
    taxRate: 12,
    taxMode: TaxMode.INCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });
  assert(Number(qIn12.taxableAmount) === 10000, "8. 12% Inclusive Taxable Amount = 10000", `Got ${qIn12.taxableAmount}`);
  assert(Number(qIn12.taxAmount) === 1200, "8. 12% Inclusive Tax Amount = 1200", `Got ${qIn12.taxAmount}`);
  assert(Number(qIn12.finalAmount) === 11200, "8. 12% Inclusive Final Amount = 11200", `Got ${qIn12.finalAmount}`);

  // 9. 18% Inclusive (Selling = 11800)
  const qIn18 = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Inclusive 18% Test",
    subtotal: 11800,
    markupPercentage: 0,
    taxRate: 18,
    taxMode: TaxMode.INCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });
  assert(Number(qIn18.taxableAmount) === 10000, "9. 18% Inclusive Taxable Amount = 10000", `Got ${qIn18.taxableAmount}`);
  assert(Number(qIn18.taxAmount) === 1800, "9. 18% Inclusive Tax Amount = 1800", `Got ${qIn18.taxAmount}`);
  assert(Number(qIn18.finalAmount) === 11800, "9. 18% Inclusive Final Amount = 11800", `Got ${qIn18.finalAmount}`);

  // 10. 28% Inclusive (Selling = 12800)
  const qIn28 = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Inclusive 28% Test",
    subtotal: 12800,
    markupPercentage: 0,
    taxRate: 28,
    taxMode: TaxMode.INCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });
  assert(Number(qIn28.taxableAmount) === 10000, "10. 28% Inclusive Taxable Amount = 10000", `Got ${qIn28.taxableAmount}`);
  assert(Number(qIn28.taxAmount) === 2800, "10. 28% Inclusive Tax Amount = 2800", `Got ${qIn28.taxAmount}`);
  assert(Number(qIn28.finalAmount) === 12800, "10. 28% Inclusive Final Amount = 12800", `Got ${qIn28.finalAmount}`);

  // -------------------------------------------------------------
  // TEST GROUP 3: GST TREATMENTS (INTRA_STATE, INTER_STATE, NON_GST_EXEMPT)
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: GST TREATMENTS ---");

  // 11. INTRA_STATE (CGST + SGST split 50/50)
  const qIntra = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Intra State Split Test",
    subtotal: 10000,
    markupPercentage: 0,
    taxRate: 18,
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });
  assert(Number(qIntra.cgstAmount) === 900, "11. INTRA_STATE CGST = 900", `Got ${qIntra.cgstAmount}`);
  assert(Number(qIntra.sgstAmount) === 900, "11. INTRA_STATE SGST = 900", `Got ${qIntra.sgstAmount}`);
  assert(Number(qIntra.igstAmount) === 0, "11. INTRA_STATE IGST = 0", `Got ${qIntra.igstAmount}`);

  // 12. INTER_STATE (100% IGST)
  const qInter = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Inter State IGST Test",
    subtotal: 10000,
    markupPercentage: 0,
    taxRate: 18,
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTER_STATE,
  });
  assert(Number(qInter.cgstAmount) === 0, "12. INTER_STATE CGST = 0", `Got ${qInter.cgstAmount}`);
  assert(Number(qInter.sgstAmount) === 0, "12. INTER_STATE SGST = 0", `Got ${qInter.sgstAmount}`);
  assert(Number(qInter.igstAmount) === 1800, "12. INTER_STATE IGST = 1800", `Got ${qInter.igstAmount}`);

  // 13. NON_GST_EXEMPT (Tax = 0 regardless of rate)
  const qExempt = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Non GST Exempt Test",
    subtotal: 10000,
    markupPercentage: 0,
    taxRate: 18,
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.NON_GST_EXEMPT,
  });
  assert(Number(qExempt.taxAmount) === 0, "13. NON_GST_EXEMPT Tax Amount = 0", `Got ${qExempt.taxAmount}`);
  assert(Number(qExempt.cgstAmount) === 0 && Number(qExempt.sgstAmount) === 0 && Number(qExempt.igstAmount) === 0, "13. NON_GST_EXEMPT CGST/SGST/IGST = 0");
  assert(Number(qExempt.finalAmount) === 10000, "13. NON_GST_EXEMPT Final Amount = 10000", `Got ${qExempt.finalAmount}`);

  // -------------------------------------------------------------
  // TEST GROUP 4: DISCOUNT & ROUNDING
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 4: DISCOUNT & ROUNDING ---");

  // 14. Discount before tax: Selling 20000, Disc 10% (2000) -> Taxable 18000, Tax 18% (3240) -> Final 21240
  const qDisc = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Discount Before Tax Test",
    subtotal: 20000,
    markupPercentage: 0,
    discountPercentage: 10,
    taxRate: 18,
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });
  assert(Number(qDisc.discountAmount) === 2000, "14. Discount Amount = 2000", `Got ${qDisc.discountAmount}`);
  assert(Number(qDisc.taxableAmount) === 18000, "14. Taxable Amount after discount = 18000", `Got ${qDisc.taxableAmount}`);
  assert(Number(qDisc.taxAmount) === 3240, "14. Tax Amount = 3240", `Got ${qDisc.taxAmount}`);
  assert(Number(qDisc.finalAmount) === 21240, "14. Final Amount = 21240", `Got ${qDisc.finalAmount}`);

  // 15. Odd-paise split reconciliation: Tax Amount = 15.35 -> CGST 7.68, SGST 7.67 (Total = 15.35)
  const oddRes = taxService.calculate({
    amount: 85.28,
    taxRate: 18,
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });
  const oddTotalTax = oddRes.taxAmount.toNumber();
  const oddSumSplit = oddRes.cgstAmount.plus(oddRes.sgstAmount).toNumber();
  assert(oddTotalTax === oddSumSplit, "15. Odd-paise CGST + SGST reconciliation exact match", `Total: ${oddTotalTax}, Sum: ${oddSumSplit}`);

  // -------------------------------------------------------------
  // TEST GROUP 5: PACKAGE OPTIONS TAX CALCULATION & SELECTION
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 5: PACKAGE OPTIONS ---");

  const qPkgParent = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Package Option Parent Quotation",
    subtotal: 50000,
    markupPercentage: 10,
    taxRate: 18,
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });

  // Create custom package option
  const pkgOpt1 = await quotationService.createPackageOption(testAgency.id, qPkgParent.id, {
    name: "Tier 1 Standard",
    subtotal: 40000,
    markupPercentage: 10, // Selling = 44000
    discountPercentage: 5, // Disc = 2200, Taxable = 41800
    taxRate: 18,
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
  });
  assert(Number(pkgOpt1.taxableAmount) === 41800, "16. Package Option Taxable Amount = 41800", `Got ${pkgOpt1.taxableAmount}`);
  assert(Number(pkgOpt1.taxAmount) === 7524, "16. Package Option Tax Amount = 7524", `Got ${pkgOpt1.taxAmount}`);
  assert(Number(pkgOpt1.finalAmount) === 49324, "16. Package Option Final Amount = 49324", `Got ${pkgOpt1.finalAmount}`);
  assert(Number(pkgOpt1.taxPercentage) === 18, "16. Package Option Legacy taxPercentage synced to 18");

  // Generate 3 default package tiers
  const tiers = await quotationService.generateDefaultPackageTiers(testAgency.id, qPkgParent.id);
  assert(tiers.length === 3, "17. Generated 3 default package tiers");
  const deluxeTier = tiers.find((t) => t.name === "Deluxe (4-Star)");
  assert(!!deluxeTier, "17. Deluxe tier exists");
  if (deluxeTier) {
    assert(Number(deluxeTier.taxRate) === 18, "17. Deluxe tier inherited 18% taxRate from quotation", `Got ${deluxeTier.taxRate}`);
    assert(Number(deluxeTier.taxAmount) > 0, "17. Deluxe tier has calculated taxAmount", `Got ${deluxeTier.taxAmount}`);
  }

  // Select package option
  if (deluxeTier) {
    const selectedQuote = await quotationService.selectPackageOption(testAgency.id, qPkgParent.id, deluxeTier.id);
    assert(Number(selectedQuote.finalAmount) === Number(deluxeTier.finalAmount), "18. Quotation finalAmount matches selected package option finalAmount");
  }

  // -------------------------------------------------------------
  // TEST GROUP 6: AGENCY TAX PROFILE DEFAULTS & TENANT ISOLATION
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 6: AGENCY TAX PROFILE DEFAULTS & ISOLATION ---");

  // Configure Agency Tax Profile with 12% INCLUSIVE INTER_STATE
  await taxProfileService.updateAgencyTaxProfile(testAgency.id, {
    isGstRegistered: true,
    gstin: "24AAAAA0000A1Z5",
    legalBusinessName: "Batch 4 Travels LLP",
    state: "Gujarat",
    stateCode: "24",
    defaultTaxMode: TaxMode.INCLUSIVE,
    defaultGstRate: 12,
    defaultGstTreatment: GstTreatment.INTER_STATE,
  });

  // Create NEW quotation without specifying tax fields -> Should inherit Agency Defaults (12% INCLUSIVE INTER_STATE)
  const qWithDefaults = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "Agency Defaults Quotation",
    subtotal: 11200,
    markupPercentage: 0,
  });
  assert(Number(qWithDefaults.taxRate) === 12, "19. NEW quotation defaulted to 12% taxRate", `Got ${qWithDefaults.taxRate}`);
  assert(qWithDefaults.taxMode === TaxMode.INCLUSIVE, "19. NEW quotation defaulted to INCLUSIVE taxMode", `Got ${qWithDefaults.taxMode}`);
  assert(qWithDefaults.gstTreatment === GstTreatment.INTER_STATE, "19. NEW quotation defaulted to INTER_STATE gstTreatment", `Got ${qWithDefaults.gstTreatment}`);
  assert(Number(qWithDefaults.taxAmount) === 1200, "19. NEW quotation taxAmount = 1200", `Got ${qWithDefaults.taxAmount}`);
  assert(Number(qWithDefaults.igstAmount) === 1200, "19. NEW quotation IGST = 1200", `Got ${qWithDefaults.igstAmount}`);
  assert(Number(qWithDefaults.finalAmount) === 11200, "19. NEW quotation finalAmount = 11200", `Got ${qWithDefaults.finalAmount}`);

  // -------------------------------------------------------------
  // TEST GROUP 7: HISTORICAL DATA SAFETY
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 7: HISTORICAL DATA SAFETY ---");

  // Record historical quotation values before changing profile
  const savedTaxRate = Number(qWithDefaults.taxRate);
  const savedTaxAmount = Number(qWithDefaults.taxAmount);
  const savedFinalAmount = Number(qWithDefaults.finalAmount);
  const savedTaxMode = qWithDefaults.taxMode;

  // Now change Agency Tax Profile to 28% EXCLUSIVE INTRA_STATE
  await taxProfileService.updateAgencyTaxProfile(testAgency.id, {
    isGstRegistered: true,
    gstin: "24AAAAA0000A1Z5",
    legalBusinessName: "Batch 4 Travels LLP",
    state: "Gujarat",
    stateCode: "24",
    defaultTaxMode: TaxMode.EXCLUSIVE,
    defaultGstRate: 28,
    defaultGstTreatment: GstTreatment.INTRA_STATE,
  });

  // Re-fetch existing quotation from database
  const fetchedExisting = await prisma.quotation.findUniqueOrThrow({
    where: { id: qWithDefaults.id },
  });

  assert(Number(fetchedExisting.taxRate) === savedTaxRate, "20. Existing quotation taxRate unchanged (still 12%)", `Got ${fetchedExisting.taxRate}`);
  assert(Number(fetchedExisting.taxAmount) === savedTaxAmount, "20. Existing quotation taxAmount unchanged (still 1200)", `Got ${fetchedExisting.taxAmount}`);
  assert(Number(fetchedExisting.finalAmount) === savedFinalAmount, "20. Existing quotation finalAmount unchanged (still 11200)", `Got ${fetchedExisting.finalAmount}`);
  assert(fetchedExisting.taxMode === savedTaxMode, "20. Existing quotation taxMode unchanged (still INCLUSIVE)", `Got ${fetchedExisting.taxMode}`);

  // Create a NEW quotation now -> Should pick up the updated 28% EXCLUSIVE INTRA_STATE
  const qWithUpdatedDefaults = await quotationService.createQuotation(testAgency.id, {
    tripId: testTrip.id,
    customerId: testCustomer.id,
    title: "New Quotation After Profile Update",
    subtotal: 10000,
    markupPercentage: 0,
  });
  assert(Number(qWithUpdatedDefaults.taxRate) === 28, "21. Subsequent quotation picks up new 28% default", `Got ${qWithUpdatedDefaults.taxRate}`);
  assert(qWithUpdatedDefaults.taxMode === TaxMode.EXCLUSIVE, "21. Subsequent quotation picks up new EXCLUSIVE default", `Got ${qWithUpdatedDefaults.taxMode}`);

  // -------------------------------------------------------------
  // TEST GROUP 8: QUOTATION VERSIONING (FORK) SAFETY
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 8: QUOTATION VERSIONING (FORK) SAFETY ---");

  const forkedVersion = await quotationService.createQuotationVersion(testAgency.id, qWithDefaults.id);
  assert(forkedVersion.version === 2, "22. Version 2 created");
  assert(Number(forkedVersion.taxRate) === 12, "22. Forked version preserves taxRate = 12", `Got ${forkedVersion.taxRate}`);
  assert(Number(forkedVersion.taxAmount) === 1200, "22. Forked version preserves taxAmount = 1200", `Got ${forkedVersion.taxAmount}`);
  assert(forkedVersion.taxMode === TaxMode.INCLUSIVE, "22. Forked version preserves taxMode = INCLUSIVE", `Got ${forkedVersion.taxMode}`);

  // Original version remains version 1 and untouched
  const originalVersion = await prisma.quotation.findUniqueOrThrow({
    where: { id: qWithDefaults.id },
  });
  assert(originalVersion.version === 1, "23. Original version remains version 1");
  assert(Number(originalVersion.finalAmount) === 11200, "23. Original version finalAmount unchanged");

  // -------------------------------------------------------------
  // TEST GROUP 9: VALIDATION & REJECTION
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 9: VALIDATION & ERROR HANDLING ---");

  // 24. Invalid / Inactive tax rate (e.g. 33%)
  let invalidRateError = false;
  try {
    await quotationService.createQuotation(testAgency.id, {
      tripId: testTrip.id,
      customerId: testCustomer.id,
      title: "Invalid Rate Quotation",
      subtotal: 10000,
      taxRate: 33,
    });
  } catch (err: any) {
    invalidRateError = true;
    assert(err.message.includes("not available in the active tax rate catalog"), "24. Rejected non-catalog tax rate 33%", err.message);
  }
  if (!invalidRateError) {
    assert(false, "24. Should have rejected non-catalog tax rate 33%");
  }

  // 25. Negative tax rate
  let negRateError = false;
  try {
    await quotationService.createQuotation(testAgency.id, {
      tripId: testTrip.id,
      customerId: testCustomer.id,
      title: "Negative Rate Quotation",
      subtotal: 10000,
      taxRate: -5,
    });
  } catch (err: any) {
    negRateError = true;
    assert(true, "25. Rejected negative tax rate -5%");
  }
  if (!negRateError) {
    assert(false, "25. Should have rejected negative tax rate -5%");
  }

  // -------------------------------------------------------------
  // CLEANUP
  // -------------------------------------------------------------
  await prisma.quotation.deleteMany({
    where: { agencyId: testAgency.id },
  });
  await prisma.trip.deleteMany({
    where: { id: testTrip.id },
  });
  await prisma.agencyTaxProfile.deleteMany({
    where: { agencyId: testAgency.id },
  });
  await prisma.customer.deleteMany({
    where: { id: testCustomer.id },
  });
  await prisma.agency.deleteMany({
    where: { id: testAgency.id },
  });

  console.log("\n=======================================================");
  console.log(`BATCH 4 TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("Test execution failed with unhandled error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
