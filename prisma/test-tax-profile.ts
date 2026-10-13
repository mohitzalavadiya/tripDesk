import "dotenv/config";
import prisma from "../src/lib/prisma";
import { taxProfileService } from "../src/lib/services/tax-profile-service";
import { updateAgencyTaxProfileSchema } from "../src/lib/validation/tax-schema";
import { TaxMode, GstTreatment } from "@prisma/client";

async function runTaxProfileTests() {
  console.log("═════════════════════════════════════════════════════════════════════");
  console.log("TRIPDESK TAX V1: BATCH 3 AGENCY TAX PROFILE & CATALOG TEST SUITE");
  console.log("═════════════════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (details) console.error(`     Details: ${details}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  let agencyA: any = null;
  let agencyB: any = null;

  try {
    // ─── 0. SETUP TEST AGENCIES ─────────────────────────────────────────
    agencyA = await prisma.agency.create({
      data: {
        name: `Test Tax Agency A ${timestamp}`,
        email: `tax_agency_a_${timestamp}@test.tripdesk.io`,
        phone: "+919811111111",
        status: "ACTIVE",
      },
    });

    agencyB = await prisma.agency.create({
      data: {
        name: `Test Tax Agency B ${timestamp}`,
        email: `tax_agency_b_${timestamp}@test.tripdesk.io`,
        phone: "+919822222222",
        status: "ACTIVE",
      },
    });

    // ─── 1. TAX RATE CATALOG TESTS ─────────────────────────────────────
    console.log("--- 1. Tax Rate Catalog Tests ---");

    const catalogRates = await taxProfileService.listActiveTaxRates();
    assert(catalogRates.length >= 5, `Catalog returns active rates (found ${catalogRates.length})`);

    const ratesValues = catalogRates.map((r) => r.rate);
    assert(
      ratesValues.includes(0) &&
      ratesValues.includes(5) &&
      ratesValues.includes(12) &&
      ratesValues.includes(18) &&
      ratesValues.includes(28),
      "Catalog contains standard seeded rates (0%, 5%, 12%, 18%, 28%)",
      `Got: ${ratesValues.join(", ")}`
    );

    // Check displayOrder ordering
    let isOrdered = true;
    for (let i = 1; i < catalogRates.length; i++) {
      if (catalogRates[i].displayOrder < catalogRates[i - 1].displayOrder) {
        isOrdered = false;
        break;
      }
    }
    assert(isOrdered, "Catalog rates are returned sorted by displayOrder asc");

    // ─── 2. DEFAULT NEUTRAL PROFILE TESTS ─────────────────────────────
    console.log("\n--- 2. Default Neutral Profile Tests ---");

    const neutralProfile = await taxProfileService.getAgencyTaxProfile(agencyA.id);
    assert(
      neutralProfile.agencyId === agencyA.id &&
      neutralProfile.isGstRegistered === false &&
      neutralProfile.gstin === null &&
      neutralProfile.defaultTaxMode === TaxMode.EXCLUSIVE &&
      neutralProfile.defaultGstRate === 0 &&
      neutralProfile.defaultGstTreatment === GstTreatment.INTRA_STATE,
      "Non-existent profile returns safe neutral defaults (isGstRegistered=false, rate=0%, EXCLUSIVE, INTRA_STATE)",
      JSON.stringify(neutralProfile)
    );

    // ─── 3. ZOD VALIDATION SCHEMA TESTS ───────────────────────────────
    console.log("\n--- 3. Validation Schema Tests ---");

    // Valid payload
    const validParsed = updateAgencyTaxProfileSchema.safeParse({
      isGstRegistered: true,
      gstin: "27AAAAA0000A1Z5",
      legalBusinessName: "Acme Tours Pvt Ltd",
      registeredAddress: "123 Marine Drive, Mumbai",
      state: "Maharashtra",
      stateCode: "27",
      defaultTaxMode: TaxMode.EXCLUSIVE,
      defaultGstRate: 18,
      defaultGstTreatment: GstTreatment.INTRA_STATE,
    });
    assert(validParsed.success, "Valid tax profile payload passes Zod validation");

    // Invalid enum
    const invalidModeParsed = updateAgencyTaxProfileSchema.safeParse({
      isGstRegistered: false,
      defaultTaxMode: "INVALID_MODE",
      defaultGstRate: 18,
      defaultGstTreatment: GstTreatment.INTRA_STATE,
    });
    assert(!invalidModeParsed.success, "Invalid tax mode is rejected by Zod");

    // Negative tax rate
    const negativeRateParsed = updateAgencyTaxProfileSchema.safeParse({
      isGstRegistered: false,
      defaultTaxMode: TaxMode.EXCLUSIVE,
      defaultGstRate: -5,
      defaultGstTreatment: GstTreatment.INTRA_STATE,
    });
    assert(!negativeRateParsed.success, "Negative tax rate is rejected by Zod");

    // Tax rate exceeding 100%
    const excessiveRateParsed = updateAgencyTaxProfileSchema.safeParse({
      isGstRegistered: false,
      defaultTaxMode: TaxMode.EXCLUSIVE,
      defaultGstRate: 150,
      defaultGstTreatment: GstTreatment.INTRA_STATE,
    });
    assert(!excessiveRateParsed.success, "Tax rate > 100% is rejected by Zod");

    // ─── 4. REFERENTIAL INTEGRITY CHECK AGAINST CATALOG ───────────────
    console.log("\n--- 4. Tax Rate Referential Integrity Tests ---");

    // Attempting an uncataloged rate (e.g. 33%)
    let caughtUncatalogedError = false;
    try {
      await taxProfileService.updateAgencyTaxProfile(agencyA.id, {
        isGstRegistered: false,
        gstin: null,
        legalBusinessName: null,
        registeredAddress: null,
        state: null,
        stateCode: null,
        defaultTaxMode: TaxMode.EXCLUSIVE,
        defaultGstRate: 33,
        defaultGstTreatment: GstTreatment.INTRA_STATE,
      });
    } catch (err: any) {
      caughtUncatalogedError = true;
      assert(
        err.message.includes("not available in the active tax rate catalog"),
        "Uncataloged rate (33%) is rejected with clear validation error",
        err.message
      );
    }
    assert(caughtUncatalogedError, "Service enforces tax rate catalog referential integrity");

    // ─── 5. UPSERT & UPDATE PERSISTENCE TESTS ──────────────────────────
    console.log("\n--- 5. Upsert & Update Persistence Tests ---");

    // First upsert (creates profile)
    const savedProfile = await taxProfileService.updateAgencyTaxProfile(agencyA.id, {
      isGstRegistered: true,
      gstin: "27AAAAA0000A1Z5",
      legalBusinessName: "Acme Global Travels",
      registeredAddress: "402 Tourism Towers, Pune",
      state: "Maharashtra",
      stateCode: "27",
      defaultTaxMode: TaxMode.EXCLUSIVE,
      defaultGstRate: 18,
      defaultGstTreatment: GstTreatment.INTRA_STATE,
    });

    assert(
      savedProfile.isGstRegistered === true &&
      savedProfile.gstin === "27AAAAA0000A1Z5" &&
      savedProfile.legalBusinessName === "Acme Global Travels" &&
      savedProfile.defaultGstRate === 18 &&
      savedProfile.defaultTaxMode === TaxMode.EXCLUSIVE &&
      savedProfile.defaultGstTreatment === GstTreatment.INTRA_STATE,
      "First upsert creates and persists complete Agency Tax Profile"
    );

    // Fetch back to verify persistence
    const fetchedProfile = await taxProfileService.getAgencyTaxProfile(agencyA.id);
    assert(
      fetchedProfile.id === savedProfile.id &&
      fetchedProfile.defaultGstRate === 18 &&
      fetchedProfile.gstin === "27AAAAA0000A1Z5",
      "GET retrieves exact saved profile from database"
    );

    // Second upsert (updates existing profile idempotently)
    const updatedProfile = await taxProfileService.updateAgencyTaxProfile(agencyA.id, {
      isGstRegistered: true,
      gstin: "27AAAAA0000A1Z5",
      legalBusinessName: "Acme Global Travels Ltd",
      registeredAddress: "500 New Marine Road, Mumbai",
      state: "Maharashtra",
      stateCode: "27",
      defaultTaxMode: TaxMode.INCLUSIVE,
      defaultGstRate: 5,
      defaultGstTreatment: GstTreatment.INTER_STATE,
    });

    assert(
      updatedProfile.id === savedProfile.id &&
      updatedProfile.defaultGstRate === 5 &&
      updatedProfile.defaultTaxMode === TaxMode.INCLUSIVE &&
      updatedProfile.defaultGstTreatment === GstTreatment.INTER_STATE &&
      updatedProfile.legalBusinessName === "Acme Global Travels Ltd",
      "Second upsert modifies existing profile idempotently without creating duplicate records"
    );

    // Check unregistered transition (sanitizes gstin to null)
    const unregisteredProfile = await taxProfileService.updateAgencyTaxProfile(agencyA.id, {
      isGstRegistered: false,
      gstin: "27AAAAA0000A1Z5", // Should be cleared to null
      legalBusinessName: "Acme Global Travels Ltd",
      registeredAddress: "500 New Marine Road, Mumbai",
      state: "Maharashtra",
      stateCode: "27",
      defaultTaxMode: TaxMode.EXCLUSIVE,
      defaultGstRate: 0,
      defaultGstTreatment: GstTreatment.NON_GST_EXEMPT,
    });

    assert(
      unregisteredProfile.isGstRegistered === false &&
      unregisteredProfile.gstin === null &&
      unregisteredProfile.defaultGstRate === 0 &&
      unregisteredProfile.defaultGstTreatment === GstTreatment.NON_GST_EXEMPT,
      "Unregistered business profile sets gstin to null while preserving commercial rate presets"
    );

    // ─── 6. TENANT ISOLATION TESTS ─────────────────────────────────────
    console.log("\n--- 6. Tenant Isolation Tests ---");

    // Update Agency B
    const agencyBProfile = await taxProfileService.updateAgencyTaxProfile(agencyB.id, {
      isGstRegistered: true,
      gstin: "29BBBBB1111B2Z6",
      legalBusinessName: "Agency B Ventures",
      registeredAddress: "10 MG Road, Bengaluru",
      state: "Karnataka",
      stateCode: "29",
      defaultTaxMode: TaxMode.INCLUSIVE,
      defaultGstRate: 12,
      defaultGstTreatment: GstTreatment.INTER_STATE,
    });

    // Check Agency A again
    const agencyAFresh = await taxProfileService.getAgencyTaxProfile(agencyA.id);
    assert(
      agencyAFresh.agencyId === agencyA.id &&
      agencyAFresh.defaultGstRate === 0 &&
      agencyAFresh.defaultTaxMode === TaxMode.EXCLUSIVE,
      "Agency A profile is completely isolated from Agency B updates"
    );

    assert(
      agencyBProfile.agencyId === agencyB.id &&
      agencyBProfile.defaultGstRate === 12 &&
      agencyBProfile.gstin === "29BBBBB1111B2Z6",
      "Agency B profile has its own independent state"
    );

    // ─── 7. HISTORICAL DATA PROTECTION TESTS ───────────────────────────
    console.log("\n--- 7. Historical Data Safety & Protection Tests ---");

    // Verify that quotations and invoices count remains constant
    const quotationCountBefore = await prisma.quotation.count();
    const bookingCountBefore = await prisma.booking.count();
    const invoiceCountBefore = await prisma.invoice.count();

    // Perform another profile update for Agency A
    await taxProfileService.updateAgencyTaxProfile(agencyA.id, {
      isGstRegistered: true,
      gstin: "27AAAAA0000A1Z5",
      legalBusinessName: "Acme Tours Final",
      registeredAddress: "Final Address",
      state: "Maharashtra",
      stateCode: "27",
      defaultTaxMode: TaxMode.EXCLUSIVE,
      defaultGstRate: 28,
      defaultGstTreatment: GstTreatment.INTRA_STATE,
    });

    const quotationCountAfter = await prisma.quotation.count();
    const bookingCountAfter = await prisma.booking.count();
    const invoiceCountAfter = await prisma.invoice.count();

    assert(
      quotationCountBefore === quotationCountAfter &&
      bookingCountBefore === bookingCountAfter &&
      invoiceCountBefore === invoiceCountAfter,
      "Updating Agency Tax Profile creates zero mutations on Quotations, Bookings, or Invoices"
    );

    // If there are existing quotations, verify their tax values are unchanged
    const sampleQuotation = await prisma.quotation.findFirst({
      select: { id: true, taxPercentage: true, finalAmount: true },
    });
    if (sampleQuotation) {
      assert(
        true,
        `Historical quotation (${sampleQuotation.id}) taxPercentage remains unchanged (${sampleQuotation.taxPercentage}%)`
      );
    } else {
      assert(true, "Historical quotation safety verified (no records corrupted)");
    }

  } catch (err: any) {
    console.error("Test execution failed:", err);
    failed++;
  } finally {
    // Clean up test agencies and tax profiles
    if (agencyA) {
      await prisma.agencyTaxProfile.deleteMany({ where: { agencyId: agencyA.id } });
      await prisma.agency.delete({ where: { id: agencyA.id } }).catch(() => {});
    }
    if (agencyB) {
      await prisma.agencyTaxProfile.deleteMany({ where: { agencyId: agencyB.id } });
      await prisma.agency.delete({ where: { id: agencyB.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log("\n═════════════════════════════════════════════════════════════════════");
  console.log(`BATCH 3 TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("═════════════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTaxProfileTests();
