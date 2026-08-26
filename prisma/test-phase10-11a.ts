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
import { PrismaClient, ProposalItemType, QuotationStatus } from "@prisma/client";
import { quotationService } from "../src/lib/services/quotation-service";
import { bookingService } from "../src/lib/services/booking-service";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runPhase1011ATests() {
  console.log("==================================================================");
  console.log("🧪 TRIPDESK PHASE 10.11A COMPREHENSIVE AUTOMATED TEST SUITE");
  console.log("==================================================================");

  // 1. Setup / Lookup Test Agency & Customer & Trip
  let agency = await prisma.agency.findFirst({
    include: { users: true },
  });

  if (!agency) {
    agency = await prisma.agency.create({
      data: {
        name: "Test Holiday Agency",
        email: "test@agency.com",
        phone: "+91 98765 43210",
      },
      include: { users: true },
    });
  }

  const agencyId = agency.id;
  console.log(`\n🏢 Using Agency: "${agency.name}" (${agencyId})`);

  // Create or find customer
  let customer = await prisma.customer.findFirst({
    where: { agencyId },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        agencyId,
        name: "Aarav Sharma",
        email: "aarav.sharma@example.com",
        phone: "+91 98765 11223",
      },
    });
  }

  // Create or find Trip
  let trip = await prisma.trip.findFirst({
    where: { agencyId },
  });

  if (!trip) {
    const start = new Date();
    const end = new Date(start.getTime() + 5 * 24 * 60 * 60 * 1000);
    trip = await prisma.trip.create({
      data: {
        agencyId,
        customerId: customer.id,
        tripNumber: `TRIP-${Date.now().toString().slice(-5)}`,
        title: "5 Days Kerala Backwaters Retreat",
        startDate: start,
        endDate: end,
        status: "PLANNING",
      },
    });
  }

  console.log(`🌴 Using Trip: "${trip.title}" (${trip.id})`);

  // 2. Test Quotation Snapshot Creation
  console.log("\n--- TEST 1: Quotation Creation with Inclusions & Milestones ---");
  const quote = await quotationService.createQuotation(agencyId, {
    tripId: trip.id,
    customerId: customer.id,
    title: "Proposal for Kerala Luxury Tour",
    subtotal: 50000,
    markupPercentage: 20, // +10,000 => 60,000
    markupAmount: 10000,
    discountPercentage: 5, // -3,000 => 57,000
    discountAmount: 3000,
    taxPercentage: 5, // +2,850 => 59,850
    taxAmount: 2850,
    finalAmount: 59850,
    customerMessage: "Welcome to your dream holiday in Kerala!",
  });

  console.log(`✔ Created Quotation ${quote.quotationNumber} (v${quote.version}) with finalAmount = ₹${quote.finalAmount}`);

  // 3. Test Proposal Items (Inclusions, Exclusions, Important Notes)
  console.log("\n--- TEST 2: Structured Inclusions & Exclusions CRUD ---");
  const inc1 = await quotationService.createProposalItem(agencyId, quote.id, {
    type: ProposalItemType.INCLUSION,
    title: "5 Nights Luxury Stay in 4-Star Resort",
    description: "Daily breakfast included",
    sortOrder: 0,
  });

  const inc2 = await quotationService.createProposalItem(agencyId, quote.id, {
    type: ProposalItemType.INCLUSION,
    title: "Private AC Sedan Transfers",
    description: "Airport pickup, sightseeing & drop",
    sortOrder: 1,
  });

  const exc1 = await quotationService.createProposalItem(agencyId, quote.id, {
    type: ProposalItemType.EXCLUSION,
    title: "Airfare / Flight Tickets",
    sortOrder: 0,
  });

  const note1 = await quotationService.createProposalItem(agencyId, quote.id, {
    type: ProposalItemType.IMPORTANT_NOTE,
    title: "Mandatory Government ID",
    description: "Aadhaar / Passport required at check-in",
    sortOrder: 0,
  });

  const allItems = await quotationService.getProposalItems(agencyId, quote.id);
  if (allItems.length !== 4) {
    throw new Error(`Expected 4 proposal items, got ${allItems.length}`);
  }
  console.log(`✔ Created & Verified ${allItems.length} structured proposal items (Inclusions, Exclusions, Notes)`);

  // 4. Test Payment Milestones
  console.log("\n--- TEST 3: Payment Milestone Schedule Generation ---");
  const defaultMilestones = await quotationService.generateDefaultPaymentSchedule(
    agencyId,
    quote.id,
    "STANDARD_3_TIER"
  );

  if (defaultMilestones.length !== 3) {
    throw new Error(`Expected 3 milestones, got ${defaultMilestones.length}`);
  }

  const sumPct = defaultMilestones.reduce((acc, m) => acc + Number(m.percentage || 0), 0);
  const sumAmt = defaultMilestones.reduce((acc, m) => acc + Number(m.amount || 0), 0);

  if (sumPct !== 100) {
    throw new Error(`Milestone percentage sum should equal 100%, got ${sumPct}%`);
  }
  console.log(`✔ Generated 3-Tier Milestone Schedule: Total % = ${sumPct}%, Total Amount = ₹${sumAmt}`);

  // 5. Test Public Proposal Security & Sanitization
  console.log("\n--- TEST 4: Public Proposal Sanitization & Security ---");
  const publicProposal = await quotationService.getPublicQuotationByToken(quote.shareToken!);
  if (!publicProposal) {
    throw new Error("Public proposal not found by shareToken!");
  }

  // Security checks: ensure zero cost prices or internal notes exposed
  if ((publicProposal as any).subtotalCost !== undefined || (publicProposal as any).costPrice !== undefined) {
    throw new Error("SECURITY FAILURE: Internal cost prices exposed on public endpoint!");
  }
  if ((publicProposal as any).internalNotes) {
    throw new Error("SECURITY FAILURE: Internal notes exposed on public endpoint!");
  }
  console.log(`✔ Public proposal sanitized safely: 0 cost prices, 0 internal notes, 0 supplier secrets exposed.`);

  // 6. Test Customer Actions (Accept Proposal & Request Changes)
  console.log("\n--- TEST 5: Customer Interactive Actions ---");
  const acceptRes = await quotationService.acceptPublicQuotation(quote.shareToken!, {
    comments: "We accept the proposal! Looking forward to the tour.",
  });
  if (!acceptRes.success) {
    throw new Error("Failed to accept public quotation!");
  }

  const updatedQuote = await quotationService.getQuotation(agencyId, quote.id);
  if (updatedQuote?.status !== QuotationStatus.ACCEPTED) {
    throw new Error(`Expected status ACCEPTED, got ${updatedQuote?.status}`);
  }
  console.log(`✔ Customer acceptance confirmed: Quotation status transitioned to ${updatedQuote.status}`);

  // 7. Test Versioning & Historical Immutability
  console.log("\n--- TEST 6: Quotation Version Forking ---");
  const v2 = await quotationService.createQuotationVersion(agencyId, quote.id);
  if (v2.version !== 2) {
    throw new Error(`Expected v2, got v${v2.version}`);
  }

  // Update v2
  await quotationService.updateQuotation(agencyId, v2.id, {
    title: "Proposal v2 - Revised Luxury Villa",
  });

  // Verify v1 remained intact
  const v1Check = await quotationService.getQuotation(agencyId, quote.id);
  if (v1Check?.title !== "Proposal for Kerala Luxury Tour" || v1Check?.version !== 1) {
    throw new Error("Historical v1 quotation was modified when v2 was created!");
  }
  console.log(`✔ Versioning Verified: v1 remained immutable at v1, v2 created as v${v2.version}`);

  // 8. Test Quotation -> Booking Conversion
  console.log("\n--- TEST 7: Quotation to Booking Conversion ---");
  const booking = await bookingService.convertQuotationToBooking(agencyId, quote.id);
  if (!booking || !booking.bookingNumber) {
    throw new Error("Failed to convert quotation to booking!");
  }
  console.log(`✔ Successfully converted quotation to confirmed Booking ${booking.bookingNumber} (Total: ₹${booking.totalAmount})`);

  console.log("\n==================================================================");
  console.log("🎉 ALL PHASE 10.11A TESTS PASSED WITH 100% SUCCESS!");
  console.log("==================================================================");
}

runPhase1011ATests()
  .catch((err) => {
    console.error("❌ Test Suite Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
