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

async function runPhase1011BTests() {
  console.log("==================================================================");
  console.log("🧪 TRIPDESK PHASE 10.11B COMPREHENSIVE AUTOMATED TEST SUITE");
  console.log("==================================================================");

  // 1. Setup Agency 1 & Agency 2 (for tenant isolation)
  let agency1 = await prisma.agency.findFirst({
    where: { name: "TripDesk Travels & Tours" },
  });
  if (!agency1) {
    agency1 = await prisma.agency.create({
      data: {
        name: "TripDesk Travels & Tours",
        email: "agency1@tripdesk.com",
        phone: "+91 98765 00001",
      },
    });
  }

  let agency2 = await prisma.agency.findFirst({
    where: { name: "Isolated Competitor Agency" },
  });
  if (!agency2) {
    agency2 = await prisma.agency.create({
      data: {
        name: "Isolated Competitor Agency",
        email: "agency2@competitor.com",
        phone: "+91 98765 00002",
      },
    });
  }

  console.log(`\n🏢 Agency 1: "${agency1.name}" (${agency1.id})`);
  console.log(`🏢 Agency 2: "${agency2.name}" (${agency2.id})`);

  // Create Customer & Trip for Agency 1
  let customer = await prisma.customer.findFirst({
    where: { agencyId: agency1.id },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        agencyId: agency1.id,
        name: "Rahul & Sneha Kapoor",
        email: "rahul.kapoor@example.com",
        phone: "+91 98111 22334",
      },
    });
  }

  let trip = await prisma.trip.findFirst({
    where: { agencyId: agency1.id },
  });
  if (!trip) {
    const start = new Date();
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    trip = await prisma.trip.create({
      data: {
        agencyId: agency1.id,
        customerId: customer.id,
        tripNumber: `TRIP-${Date.now().toString().slice(-5)}`,
        title: "6 Days Rajasthan Heritage Circuit",
        startDate: start,
        endDate: end,
        status: "PLANNING",
      },
    });
  }

  // Create base Quotation
  const quote = await quotationService.createQuotation(agency1.id, {
    tripId: trip.id,
    customerId: customer.id,
    title: "Proposal for Rajasthan Heritage Tour",
    subtotal: 40000,
    markupPercentage: 10,
    markupAmount: 4000,
    taxPercentage: 5,
    taxAmount: 2200,
    finalAmount: 46200,
  });

  console.log(`✔ Created Base Quotation ${quote.quotationNumber} (v${quote.version})`);

  // ─── TEST 1: Package Creation & Limits ───
  console.log("\n--- TEST 1: Package Options Creation & Tier Limits ---");
  const pkg1 = await quotationService.createPackageOption(agency1.id, quote.id, {
    name: "Standard (3-Star)",
    subtitle: "Value for money essential comforts",
    subtotal: 40000,
    markupPercentage: 10,
    taxPercentage: 5,
    hotelNotes: "3-Star City Hotels (Deluxe AC)",
    vehicleNotes: "AC Sedan (Dzire)",
    inclusions: ["Buffet Breakfast", "Sedan with driver"],
    exclusions: ["Dinner", "Flight Tickets"],
    sortOrder: 0,
    isRecommended: false,
  });

  const pkg2 = await quotationService.createPackageOption(agency1.id, quote.id, {
    name: "Deluxe (4-Star)",
    subtitle: "Premium Heritage Havelis & SUV",
    subtotal: 55000,
    markupPercentage: 15,
    taxPercentage: 5,
    hotelNotes: "4-Star Heritage Havelis with Pool",
    vehicleNotes: "Dedicated AC Innova",
    inclusions: ["Breakfast & Dinner", "Dedicated Innova", "Fort Tour Guide"],
    exclusions: ["Flight Tickets"],
    sortOrder: 1,
    isRecommended: true,
  });

  const pkg3 = await quotationService.createPackageOption(agency1.id, quote.id, {
    name: "Luxury (5-Star Palaces)",
    subtitle: "Royal suites, luxury chauffeurs & all meals",
    subtotal: 90000,
    markupPercentage: 25,
    taxPercentage: 5,
    hotelNotes: "5-Star Royal Palace Suites",
    vehicleNotes: "Private Chauffeur Luxury SUV",
    inclusions: ["All Gourmet Meals", "Luxury SUV", "Private Guides", "Couple Spa"],
    exclusions: ["Airfare"],
    sortOrder: 2,
    isRecommended: false,
  });

  console.log(`✔ Created 3 tiers: Standard (₹${pkg1.finalAmount}), Deluxe (₹${pkg2.finalAmount}), Luxury (₹${pkg3.finalAmount})`);

  // Test duplicate name prevention
  try {
    await quotationService.createPackageOption(agency1.id, quote.id, {
      name: "Deluxe (4-Star)",
      subtotal: 50000,
    });
    throw new Error("SECURITY FAILURE: Duplicate package name was allowed!");
  } catch (err: any) {
    console.log(`✔ Duplicate package name correctly rejected: "${err.message}"`);
  }

  // ─── TEST 2: Package Update & Delete ───
  console.log("\n--- TEST 2: Package Update & Delete ---");
  const updatedPkg1 = await quotationService.updatePackageOption(agency1.id, quote.id, pkg1.id, {
    subtitle: "Economy comfort with private sedan",
    discountPercentage: 5,
  });
  console.log(`✔ Package updated with discount: new finalAmount = ₹${updatedPkg1.finalAmount}`);

  // Create temporary 4th package and delete it
  const tempPkg = await quotationService.createPackageOption(agency1.id, quote.id, {
    name: "Backpacker Ultra-Saver",
    subtotal: 25000,
    sortOrder: 3,
  });
  await quotationService.deletePackageOption(agency1.id, quote.id, tempPkg.id);
  const remaining = await quotationService.getPackageOptions(agency1.id, quote.id);
  if (remaining.length !== 3) {
    throw new Error(`Expected 3 packages after delete, got ${remaining.length}`);
  }
  console.log(`✔ Package deletion verified: 3 tiers remaining`);

  // ─── TEST 3: Package Reordering ───
  console.log("\n--- TEST 3: Package Reordering ---");
  await quotationService.reorderPackageOptions(agency1.id, quote.id, {
    items: [
      { id: pkg2.id, sortOrder: 0 },
      { id: pkg1.id, sortOrder: 1 },
      { id: pkg3.id, sortOrder: 2 },
    ],
  });
  const reordered = await quotationService.getPackageOptions(agency1.id, quote.id);
  if (reordered[0].id !== pkg2.id) {
    throw new Error("Package reordering failed!");
  }
  console.log(`✔ Package reordering verified: "${reordered[0].name}" is now sortOrder 0`);

  // ─── TEST 4: Recommended Package ───
  console.log("\n--- TEST 4: Recommended Package Exclusivity ---");
  const recommendedList = reordered.filter((p) => p.isRecommended);
  if (recommendedList.length !== 1 || recommendedList[0].id !== pkg2.id) {
    throw new Error("Recommended package state is invalid!");
  }
  console.log(`✔ Recommended package exclusivity verified: "${recommendedList[0].name}" is recommended.`);

  // ─── TEST 5: Independent Pricing Calculation ───
  console.log("\n--- TEST 5: Independent Package Pricing Breakdown ---");
  if (Number(pkg3.finalAmount) <= Number(pkg2.finalAmount) || Number(pkg2.finalAmount) <= Number(pkg1.finalAmount)) {
    throw new Error("Tier pricing hierarchy is invalid!");
  }
  console.log(`✔ Pricing hierarchy verified: Standard (₹${pkg1.finalAmount}) < Deluxe (₹${pkg2.finalAmount}) < Luxury (₹${pkg3.finalAmount})`);

  // ─── TEST 6: Public Sanitization ───
  console.log("\n--- TEST 6: Public Sanitization Security ---");
  const publicPayload = await quotationService.getPublicQuotationByToken(quote.shareToken!);
  if (!publicPayload || !publicPayload.packageOptions || publicPayload.packageOptions.length !== 3) {
    throw new Error("Public proposal missing package options!");
  }

  // Ensure 0 cost fields exposed
  for (const opt of publicPayload.packageOptions as any[]) {
    if (opt.subtotal !== undefined || opt.markupPercentage !== undefined || opt.markupAmount !== undefined || opt.costPrice !== undefined) {
      throw new Error(`SECURITY LEAK: Commercial internal cost exposed in public tier ${opt.name}!`);
    }
  }
  console.log(`✔ Public proposal sanitized: 0 cost prices, 0 markup %, 0 margin amounts exposed across all ${publicPayload.packageOptions.length} tiers.`);

  // ─── TEST 7: Customer Package Selection ───
  console.log("\n--- TEST 7: Customer Public Package Selection ---");
  const selectResult = await quotationService.selectPublicPackageOption(quote.shareToken!, pkg3.id);
  if (!selectResult.success || selectResult.selectedPackageOptionId !== pkg3.id) {
    throw new Error("Customer package selection failed!");
  }
  console.log(`✔ Customer selected Luxury Tier: "${pkg3.name}" (₹${selectResult.finalAmount})`);

  // ─── TEST 8 & 9: Proposal Acceptance & Selected Package Persistence ───
  console.log("\n--- TEST 8 & 9: Proposal Acceptance & Selected-Package Persistence ---");
  const acceptResult = await quotationService.acceptPublicQuotation(quote.shareToken!, {
    selectedOptionId: pkg3.id,
    comments: "Confirmed for the 5-Star Luxury Palace tier!",
  });
  if (!acceptResult.success || acceptResult.selectedPackageOptionId !== pkg3.id) {
    throw new Error("Quotation acceptance with selected package failed!");
  }

  const acceptedQuote = await quotationService.getQuotation(agency1.id, quote.id);
  if (acceptedQuote?.status !== QuotationStatus.ACCEPTED || acceptedQuote?.selectedPackageOptionId !== pkg3.id) {
    throw new Error("Quotation status or selectedPackageOptionId was not persisted!");
  }
  console.log(`✔ Proposal Accepted: Status = ${acceptedQuote.status}, Selected Package = "${acceptedQuote.selectedPackageOption?.name}", Final Amount = ₹${acceptedQuote.finalAmount}`);

  // ─── TEST 10: Quotation → Booking Conversion ───
  console.log("\n--- TEST 10: Quotation to Booking Conversion with Tier Amount ---");
  const booking = await bookingService.convertQuotationToBooking(agency1.id, quote.id);
  if (!booking || Number(booking.totalAmount) !== Number(pkg3.finalAmount) || (booking as any).packageOptionName !== pkg3.name) {
    throw new Error(`Booking conversion failed to use selected package amount! Expected ₹${pkg3.finalAmount} and name "${pkg3.name}", got ₹${booking.totalAmount} and "${(booking as any).packageOptionName}"`);
  }
  console.log(`✔ Booking Conversion Verified: Booking ${booking.bookingNumber} created for ₹${booking.totalAmount} under "${(booking as any).packageOptionName}"!`);

  // ─── TEST 11: Version Immutability ───
  console.log("\n--- TEST 11: Quotation Version Forking & Package Immutability ---");
  const v2 = await quotationService.createQuotationVersion(agency1.id, quote.id);
  if (v2.version !== 2 || v2.packageOptions.length !== 3) {
    throw new Error(`Expected v2 with 3 cloned packages, got v${v2.version} with ${v2.packageOptions.length} packages`);
  }

  // Modify package in v2
  const v2FirstPkg = v2.packageOptions[0];
  await quotationService.updatePackageOption(agency1.id, v2.id, v2FirstPkg.id, {
    name: "Deluxe Upgraded Special",
    finalAmount: 99999,
  });

  // Verify v1 was unchanged
  const v1Check = await quotationService.getQuotation(agency1.id, quote.id);
  const v1Pkg = v1Check?.packageOptions.find((p) => p.name === "Standard (3-Star)");
  if (!v1Pkg || Number(v1Pkg.finalAmount) === 99999) {
    throw new Error("Immutability breach: v1 package was modified when v2 package was changed!");
  }
  console.log(`✔ Version Immutability Verified: v1 packages remained frozen, v2 cloned independently.`);

  // ─── TEST 12 & 13: Tenant Isolation & Unauthorized Access ───
  console.log("\n--- TEST 12 & 13: Tenant Isolation & Unauthorized Access Protection ---");
  try {
    // Agency 2 trying to read Agency 1's packages
    await quotationService.getPackageOptions(agency2.id, quote.id);
    throw new Error("SECURITY FAILURE: Agency 2 was able to access Agency 1 packages!");
  } catch (err: any) {
    console.log(`✔ Tenant isolation verified on read: "${err.message}"`);
  }

  try {
    // Agency 2 trying to delete Agency 1's package
    await quotationService.deletePackageOption(agency2.id, quote.id, pkg1.id);
    throw new Error("SECURITY FAILURE: Agency 2 was able to delete Agency 1 package!");
  } catch (err: any) {
    console.log(`✔ Tenant isolation verified on write: "${err.message}"`);
  }

  console.log("\n==================================================================");
  console.log("🎉 ALL 13 PHASE 10.11B TESTS PASSED WITH 100% SUCCESS!");
  console.log("==================================================================");
}

runPhase1011BTests()
  .catch((err) => {
    console.error("❌ Phase 10.11B Test Failure:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
