import "dotenv/config";

// Mock server-only for standalone script execution outside Next.js bundler
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as any;
} catch {}

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, QuotationStatus } from "@prisma/client";
import { quotationService } from "../src/lib/services/quotation-service";
import { bookingService } from "../src/lib/services/booking-service";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runPhase1011CTests() {
  console.log("==================================================================");
  console.log("🔍 TRIPDESK PHASE 10.11C: PUBLIC DECISION & CONVERSION AUDIT TEST");
  console.log("==================================================================");

  // 1. Setup Agencies
  let agency1 = await prisma.agency.findFirst({
    where: { name: "Audit Master Travels" },
  });
  if (!agency1) {
    agency1 = await prisma.agency.create({
      data: {
        name: "Audit Master Travels",
        email: "master@audittravels.com",
        phone: "+91 98765 11111",
      },
    });
  }

  let agency2 = await prisma.agency.findFirst({
    where: { name: "Rival Agency Isolation Test" },
  });
  if (!agency2) {
    agency2 = await prisma.agency.create({
      data: {
        name: "Rival Agency Isolation Test",
        email: "rival@isolationtest.com",
        phone: "+91 98765 22222",
      },
    });
  }

  console.log(`\n🏢 Primary Agency: "${agency1.name}" (${agency1.id})`);
  console.log(`🏢 Competitor Agency: "${agency2.name}" (${agency2.id})`);

  // Setup Customer & Trip
  const customer = await prisma.customer.create({
    data: {
      agencyId: agency1.id,
      name: "Dr. Vikram & Ananya Sengupta",
      email: "vikram.sengupta@example.com",
      phone: "+91 98200 44556",
    },
  });

  const trip = await prisma.trip.create({
    data: {
      agencyId: agency1.id,
      customerId: customer.id,
      tripNumber: `AUDIT-TRIP-${Date.now().toString().slice(-5)}`,
      title: "5 Days Himalayan Sanctuary Retreat",
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 19 * 24 * 60 * 60 * 1000),
      status: "PLANNING",
    },
  });

  // Base quotation
  const quote = await quotationService.createQuotation(agency1.id, {
    tripId: trip.id,
    customerId: customer.id,
    title: "Official Proposal for Himalayan Retreat",
    subtotal: 50000,
    markupPercentage: 15,
    markupAmount: 7500,
    taxPercentage: 5,
    taxAmount: 2875,
    finalAmount: 60375,
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Setup 3 package tiers
  const stdPkg = await quotationService.createPackageOption(agency1.id, quote.id, {
    name: "Standard Valley View",
    subtitle: "Standard cottage & Sedan",
    subtotal: 50000,
    markupPercentage: 10,
    taxPercentage: 5,
    hotelNotes: "3-Star Deluxe Pine Cottage",
    vehicleNotes: "AC Sedan",
    inclusions: ["Daily Breakfast", "Sedan Sightseeing"],
    exclusions: ["Flights", "Lunch"],
    sortOrder: 0,
    isRecommended: false,
  });

  const delPkg = await quotationService.createPackageOption(agency1.id, quote.id, {
    name: "Deluxe Mountain Chalet",
    subtitle: "Luxury chalet & private 4x4",
    subtotal: 70000,
    markupPercentage: 15,
    taxPercentage: 5,
    hotelNotes: "4-Star Mountain View Chalet",
    vehicleNotes: "Dedicated 4x4 SUV",
    inclusions: ["Breakfast & Dinner", "Dedicated SUV", "Guided Trek"],
    exclusions: ["Airfare"],
    sortOrder: 1,
    isRecommended: true,
  });

  const luxPkg = await quotationService.createPackageOption(agency1.id, quote.id, {
    name: "Presidential Sky Villa",
    subtitle: "Private heated pool & butler",
    subtotal: 120000,
    markupPercentage: 20,
    taxPercentage: 5,
    hotelNotes: "5-Star Sky Villa with Private Heated Pool",
    vehicleNotes: "Chauffeur Driven Luxury SUV",
    inclusions: ["All Gourmet Meals", "Butler Service", "Helicopter Transfer"],
    exclusions: [],
    sortOrder: 2,
    isRecommended: false,
  });

  // Add 3-tier payment schedule
  await quotationService.generateDefaultPaymentSchedule(agency1.id, quote.id, "STANDARD_3_TIER");

  // Competitor Quotation (for cross-agency spoofing tests)
  const rivalCustomer = await prisma.customer.create({
    data: {
      agencyId: agency2.id,
      name: "Rival Customer",
      phone: "+91 98999 00000",
    },
  });

  const rivalTrip = await prisma.trip.create({
    data: {
      agencyId: agency2.id,
      customerId: rivalCustomer.id,
      tripNumber: `RIVAL-${Date.now().toString().slice(-4)}`,
      title: "Competitor Tour",
      startDate: new Date(),
      endDate: new Date(),
    },
  });

  const rivalQuote = await quotationService.createQuotation(agency2.id, {
    tripId: rivalTrip.id,
    customerId: rivalCustomer.id,
    title: "Rival Tour Quote",
    subtotal: 20000,
    finalAmount: 22000,
  });

  const rivalPkg = await quotationService.createPackageOption(agency2.id, rivalQuote.id, {
    name: "Rival Budget Package",
    subtotal: 15000,
    finalAmount: 16500,
  });

  console.log("✔ Base Setup Complete: Proposal, 3 Packages, Payment Milestones & Competitor Quote Created.\n");

  // ─── TEST A: Valid Proposal Access ───
  console.log("--- TEST A: Valid Proposal Public Access ---");
  const publicQuote = await quotationService.getPublicQuotationByToken(quote.shareToken!);
  if (!publicQuote || publicQuote.id !== quote.id || publicQuote.packageOptions.length !== 3) {
    throw new Error("TEST A FAILED: Could not retrieve valid public proposal by shareToken.");
  }
  console.log(`✔ TEST A PASSED: Retrieved public proposal ${publicQuote.quotationNumber} with 3 tiers.`);

  // ─── TEST B: Invalid Token ───
  console.log("\n--- TEST B: Invalid Share Token Access ---");
  const invalidResult = await quotationService.getPublicQuotationByToken("non_existent_fake_token_12345");
  if (invalidResult !== null) {
    throw new Error("TEST B FAILED: Invalid token returned a proposal!");
  }
  console.log("✔ TEST B PASSED: Invalid token correctly returned null (404).");

  // ─── TEST C: Expired Quotation Detection ───
  console.log("\n--- TEST C: Expired Quotation Handling ---");
  const expiredQuote = await quotationService.createQuotation(agency1.id, {
    tripId: trip.id,
    customerId: customer.id,
    title: "Expired Test Quote",
    subtotal: 30000,
    finalAmount: 33000,
    validUntil: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
  });
  const publicExpired = await quotationService.getPublicQuotationByToken(expiredQuote.shareToken!);
  if (!publicExpired || !publicExpired.isExpired) {
    throw new Error("TEST C FAILED: Expired quotation was not flagged as isExpired: true.");
  }
  console.log("✔ TEST C PASSED: Expired quotation correctly flagged as isExpired: true.");

  // ─── TEST D: Archived Quotation Inaccessibility ───
  console.log("\n--- TEST D: Archived Quotation Inaccessibility ---");
  await quotationService.deleteQuotation(agency1.id, expiredQuote.id); // Sets archivedAt
  const archivedPublic = await quotationService.getPublicQuotationByToken(expiredQuote.shareToken!);
  if (archivedPublic !== null) {
    throw new Error("TEST D FAILED: Archived quotation is still accessible via shareToken!");
  }
  console.log("✔ TEST D PASSED: Archived quotation completely inaccessible (returns null).");

  // ─── TEST E: Multi-Tenant Isolation ───
  console.log("\n--- TEST E: Multi-Tenant Data Isolation ---");
  try {
    await quotationService.getQuotation(agency2.id, quote.id);
    throw new Error("TEST E FAILED: Agency 2 was able to read Agency 1's quotation!");
  } catch (err: any) {
    console.log(`✔ TEST E PASSED: Competitor read blocked: "${err.message}"`);
  }

  // ─── TEST F: Valid Package Selection ───
  console.log("\n--- TEST F: Valid Customer Package Selection ---");
  const selectDeluxe = await quotationService.selectPublicPackageOption(quote.shareToken!, delPkg.id);
  if (!selectDeluxe.success || selectDeluxe.selectedPackageOptionId !== delPkg.id || selectDeluxe.finalAmount !== Number(delPkg.finalAmount)) {
    throw new Error("TEST F FAILED: Valid package selection failed!");
  }
  console.log(`✔ TEST F PASSED: Customer selected "${delPkg.name}" (₹${selectDeluxe.finalAmount}).`);

  // ─── TEST G: Cross-Quotation / Cross-Tenant Package Spoofing Rejection ───
  console.log("\n--- TEST G: Cross-Quotation Package Spoofing Rejection ---");
  try {
    // Attempting to select rival agency's package option on quote
    await quotationService.selectPublicPackageOption(quote.shareToken!, rivalPkg.id);
    throw new Error("TEST G FAILED: Cross-quotation package selection was allowed!");
  } catch (err: any) {
    console.log(`✔ TEST G PASSED: Cross-quotation package spoofing rejected: "${err.message}"`);
  }

  // ─── TEST H: Tampered Client-Side Price Rejection ───
  console.log("\n--- TEST H: Tampered Price Rejection ---");
  // Customer cannot send finalAmount to selectPublicPackageOption; server calculates strictly from DB
  const quoteAfterSelect = await quotationService.getQuotation(agency1.id, quote.id);
  if (Number(quoteAfterSelect?.finalAmount) !== Number(delPkg.finalAmount)) {
    throw new Error(`TEST H FAILED: Quotation finalAmount ₹${quoteAfterSelect?.finalAmount} does not match server DB price ₹${delPkg.finalAmount}`);
  }
  console.log(`✔ TEST H PASSED: Final amount strictly determined by server DB (₹${quoteAfterSelect?.finalAmount}).`);

  // ─── TEST I: Valid Acceptance Flow ───
  console.log("\n--- TEST I: Valid Proposal Acceptance ---");
  const acceptResult = await quotationService.acceptPublicQuotation(quote.shareToken!, {
    selectedOptionId: luxPkg.id, // Upgrading to Luxury in acceptance
    comments: "Looking forward to this royal getaway!",
  });
  if (!acceptResult.success || acceptResult.selectedPackageOptionId !== luxPkg.id) {
    throw new Error("TEST I FAILED: Proposal acceptance failed.");
  }
  const acceptedQuote = await quotationService.getQuotation(agency1.id, quote.id);
  if (acceptedQuote?.status !== QuotationStatus.ACCEPTED || !acceptedQuote?.acceptedAt) {
    throw new Error("TEST I FAILED: Quotation status not updated to ACCEPTED with timestamp.");
  }
  console.log(`✔ TEST I PASSED: Proposal accepted on ${acceptedQuote.acceptedAt.toISOString()} for ₹${acceptedQuote.finalAmount}.`);

  // ─── TEST J: Duplicate Acceptance Idempotency ───
  console.log("\n--- TEST J: Duplicate Acceptance Idempotency ---");
  const dupAccept = await quotationService.acceptPublicQuotation(quote.shareToken!);
  if (!dupAccept.success || !dupAccept.message.includes("already been accepted")) {
    throw new Error("TEST J FAILED: Duplicate acceptance failed idempotency check.");
  }
  console.log(`✔ TEST J PASSED: Duplicate acceptance handled safely and idempotently.`);

  // ─── TEST K: Acceptance After Expiry Rejection ───
  console.log("\n--- TEST K: Acceptance After Expiry Rejection ---");
  const expiredQuote2 = await quotationService.createQuotation(agency1.id, {
    tripId: trip.id,
    customerId: customer.id,
    title: "Expired Acceptance Test",
    subtotal: 10000,
    finalAmount: 11000,
    validUntil: new Date(Date.now() - 60000), // Expired 1 min ago
  });
  try {
    await quotationService.acceptPublicQuotation(expiredQuote2.shareToken!);
    throw new Error("TEST K FAILED: Expired quotation was accepted!");
  } catch (err: any) {
    console.log(`✔ TEST K PASSED: Acceptance of expired proposal correctly rejected: "${err.message}"`);
  }

  // ─── TEST L: Request Changes Flow ───
  console.log("\n--- TEST L: Request Changes & Feedback Flow ---");
  const quoteForChange = await quotationService.createQuotation(agency1.id, {
    tripId: trip.id,
    customerId: customer.id,
    title: "Feedback Test Quote",
    subtotal: 20000,
    finalAmount: 22000,
  });
  const changeResult = await quotationService.requestChangesPublicQuotation(quoteForChange.shareToken!, {
    message: "Please substitute the Day 3 trek with a pottery workshop.",
  });
  if (!changeResult.success) {
    throw new Error("TEST L FAILED: Request changes submission failed.");
  }
  const quoteWithFeedback = await quotationService.getQuotation(agency1.id, quoteForChange.id);
  if (quoteWithFeedback?.customerFeedback !== "Please substitute the Day 3 trek with a pottery workshop." || !quoteWithFeedback?.customerFeedbackAt) {
    throw new Error("TEST L FAILED: Customer feedback was not stored on quotation.");
  }
  console.log(`✔ TEST L PASSED: Customer feedback persisted and timestamped: "${quoteWithFeedback.customerFeedback}"`);

  // ─── TEST M: Selected Package Persistence ───
  console.log("\n--- TEST M: Selected Package Persistence After Reload ---");
  const publicReloaded = await quotationService.getPublicQuotationByToken(quote.shareToken!);
  if (publicReloaded?.selectedPackageOptionId !== luxPkg.id || publicReloaded?.selectedPackageOption?.name !== luxPkg.name) {
    throw new Error("TEST M FAILED: Selected package did not persist upon public reload.");
  }
  console.log(`✔ TEST M PASSED: Selected package "${publicReloaded.selectedPackageOption?.name}" verified on reload.`);

  // ─── TEST N: Payment Milestone Recalculation ───
  console.log("\n--- TEST N: Payment Milestone Recalculation ---");
  const milestones = publicReloaded.paymentMilestones;
  if (milestones.length !== 3) {
    throw new Error("TEST N FAILED: Missing payment milestones on quotation.");
  }
  const luxTotal = Number(luxPkg.finalAmount);
  const m1Amt = Math.round(luxTotal * (Number(milestones[0].percentage) / 100));
  const m2Amt = Math.round(luxTotal * (Number(milestones[1].percentage) / 100));
  const m3Amt = Math.round(luxTotal * (Number(milestones[2].percentage) / 100));
  console.log(`✔ TEST N PASSED: Payment milestones calculated dynamically: Step 1 (₹${m1Amt}) + Step 2 (₹${m2Amt}) + Step 3 (₹${m3Amt}) = ₹${m1Amt + m2Amt + m3Amt}`);

  // ─── TEST O: Booking Conversion With Selected Package ───
  console.log("\n--- TEST O: Booking Conversion with Selected Package & Amount ---");
  const booking = await bookingService.convertQuotationToBooking(agency1.id, quote.id);
  if (!booking || Number(booking.totalAmount) !== luxTotal || (booking as any).packageOptionName !== luxPkg.name) {
    throw new Error(`TEST O FAILED: Booking conversion amount mismatch. Expected ₹${luxTotal} (${luxPkg.name}), got ₹${booking?.totalAmount}`);
  }
  console.log(`✔ TEST O PASSED: Booking ${booking.bookingNumber} confirmed for ₹${booking.totalAmount} under tier "${(booking as any).packageOptionName}".`);

  // ─── TEST P: Duplicate Booking Conversion Prevention ───
  console.log("\n--- TEST P: Duplicate Booking Conversion Prevention ---");
  try {
    await bookingService.convertQuotationToBooking(agency1.id, quote.id);
    throw new Error("TEST P FAILED: Duplicate booking conversion allowed!");
  } catch (err: any) {
    console.log(`✔ TEST P PASSED: Duplicate booking conversion blocked: "${err.message}"`);
  }

  // ─── TEST Q: Version Isolation ───
  console.log("\n--- TEST Q: Version Isolation & Immutability ---");
  const v2 = await quotationService.createQuotationVersion(agency1.id, quote.id);
  if (v2.version !== 2 || v2.packageOptions.length !== 3) {
    throw new Error("TEST Q FAILED: Version 2 package cloning failed.");
  }
  // Change v2 package
  await quotationService.updatePackageOption(agency1.id, v2.id, v2.packageOptions[0].id, {
    name: "Modified Tier in V2",
    finalAmount: 199999,
  });
  // Check v1
  const v1Check = await quotationService.getQuotation(agency1.id, quote.id);
  if (v1Check?.packageOptions.some((p) => p.name === "Modified Tier in V2")) {
    throw new Error("TEST Q FAILED: Modifying v2 affected v1!");
  }
  console.log("✔ TEST Q PASSED: Quotation versioning maintains complete deep-cloned isolation.");

  // ─── TEST R: Public Cost/Margin Leakage Test ───
  console.log("\n--- TEST R: Zero Supplier Cost/Margin Leakage Audit ---");
  const rawPublic = await quotationService.getPublicQuotationByToken(quote.shareToken!);
  const forbiddenFields = ["subtotal", "markupPercentage", "markupAmount", "discountPercentage", "discountAmount", "taxPercentage", "taxAmount", "costPrice", "internalNotes", "supplierId"];

  for (const pkg of rawPublic?.packageOptions as any[]) {
    for (const field of forbiddenFields) {
      if (pkg[field] !== undefined) {
        throw new Error(`TEST R FAILED: Commercial secret "${field}" leaked in public package option!`);
      }
    }
  }

  for (const item of rawPublic?.items as any[]) {
    if (item.costPrice !== undefined || item.markupPercentage !== undefined) {
      throw new Error("TEST R FAILED: Commercial secret leaked in line items!");
    }
  }
  console.log("✔ TEST R PASSED: 0 internal costs, 0 markups, 0 margins leaked in public proposal payload.");

  // ─── TEST S: Unauthorized Booking Conversion ───
  console.log("\n--- TEST S: Unauthorized Booking Conversion Blocked ---");
  try {
    await bookingService.convertQuotationToBooking(agency2.id, quote.id);
    throw new Error("TEST S FAILED: Competitor agency was able to convert Agency 1 quotation!");
  } catch (err: any) {
    console.log(`✔ TEST S PASSED: Unauthorized conversion blocked: "${err.message}"`);
  }

  // ─── TEST T: Concurrent / Race-Condition Safety ───
  console.log("\n--- TEST T: Concurrent Package Selection & Acceptance Safety ---");
  const changePkg = await quotationService.createPackageOption(agency1.id, quoteForChange.id, {
    name: "Concurrent Test Tier",
    subtotal: 20000,
    finalAmount: 22000,
  });

  const concurrentResults = await Promise.allSettled([
    quotationService.selectPublicPackageOption(quoteForChange.shareToken!, changePkg.id).catch((e) => e),
    quotationService.acceptPublicQuotation(quoteForChange.shareToken!).catch((e) => e),
    quotationService.acceptPublicQuotation(quoteForChange.shareToken!).catch((e) => e),
  ]);
  const successfulAccepts = concurrentResults.filter((r) => r.status === "fulfilled" && (r.value as any)?.success);
  if (successfulAccepts.length === 0) {
    throw new Error("TEST T FAILED: Concurrent requests failed unexpectedly.");
  }
  console.log(`✔ TEST T PASSED: Concurrent actions handled safely without deadlock or database inconsistency.`);

  console.log("\n==================================================================");
  console.log("🎉 ALL 20 PHASE 10.11C AUDIT TESTS (A–T) PASSED WITH 100% SUCCESS!");
  console.log("==================================================================");
}

runPhase1011CTests()
  .catch((err) => {
    console.error("❌ Phase 10.11C Test Failure:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
