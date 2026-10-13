import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, SubscriptionStatus, Prisma } from "@prisma/client";
import { tripService } from "../src/lib/services/trip-service";
import { quotationService } from "../src/lib/services/quotation-service";
import { bookingService } from "../src/lib/services/booking-service";
import { entitlementService } from "../src/lib/services/entitlement-service";
import { QuotaExceededError, NoActiveSubscriptionError, ReadOnlyAccessError, EntitlementConfigError } from "../src/lib/api/errors";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 Starting Phase C Transactional Quota & Concurrency Test Suite...\n");

  const starterPlan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { name: "Starter" } });
  const proPlan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { name: "Professional" } });

  // Create temporary isolated QA agencies
  const agencyStarter = await prisma.agency.create({
    data: { name: "QA Phase C Starter Agency", email: "phasec-starter@example.com", phone: "9876543210" },
  });
  const agencyPro = await prisma.agency.create({
    data: { name: "QA Phase C Pro Agency", email: "phasec-pro@example.com", phone: "9876543211" },
  });
  const agencyIsolated = await prisma.agency.create({
    data: { name: "QA Phase C Isolated Agency", email: "phasec-iso@example.com", phone: "9876543212" },
  });

  const now = new Date();
  const periodStart = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const periodEnd = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000);

  // Active Starter subscription
  await prisma.subscription.create({
    data: {
      agencyId: agencyStarter.id,
      planId: starterPlan.id,
      status: SubscriptionStatus.ACTIVE,
      subscriptionStart: periodStart,
      subscriptionEnd: periodEnd,
    },
  });

  // Active Professional subscription
  await prisma.subscription.create({
    data: {
      agencyId: agencyPro.id,
      planId: proPlan.id,
      status: SubscriptionStatus.ACTIVE,
      subscriptionStart: periodStart,
      subscriptionEnd: periodEnd,
    },
  });

  // Active Starter subscription for isolated agency
  await prisma.subscription.create({
    data: {
      agencyId: agencyIsolated.id,
      planId: starterPlan.id,
      status: SubscriptionStatus.ACTIVE,
      subscriptionStart: periodStart,
      subscriptionEnd: periodEnd,
    },
  });

  // Create base customer for agencyStarter
  const customerStarter = await prisma.customer.create({
    data: {
      agencyId: agencyStarter.id,
      name: "Phase C Customer Starter",
      email: "cust-starter@example.com",
      phone: "9876543213",
    },
  });

  // Create base customer for agencyPro
  const customerPro = await prisma.customer.create({
    data: {
      agencyId: agencyPro.id,
      name: "Phase C Customer Pro",
      email: "cust-pro@example.com",
      phone: "9876543214",
    },
  });

  // Create base customer for agencyIsolated
  const customerIsolated = await prisma.customer.create({
    data: {
      agencyId: agencyIsolated.id,
      name: "Phase C Customer Isolated",
      email: "cust-iso@example.com",
      phone: "9876543215",
    },
  });

  try {
    // =========================================================================
    // SECTION 1: PERIOD BOUNDARY TESTS (Half-Open Interval: gte periodStart, lt periodEnd)
    // =========================================================================
    console.log("--------------------------------------------------");
    console.log("TEST 1: Period Boundary Half-Open Interval Verification");

    // 1A. Before period (createdAt < periodStart) -> MUST NOT COUNT
    const beforeDate = new Date(periodStart.getTime() - 1000);
    await prisma.trip.create({
      data: {
        agencyId: agencyStarter.id,
        customerId: customerStarter.id,
        tripNumber: "TRP-BOUNDARY-BEFORE",
        title: "Trip Before Period",
        startDate: now,
        endDate: periodEnd,
        createdAt: beforeDate,
      },
    });

    // 1B. Start boundary (createdAt = periodStart) -> MUST COUNT
    await prisma.trip.create({
      data: {
        agencyId: agencyStarter.id,
        customerId: customerStarter.id,
        tripNumber: "TRP-BOUNDARY-START",
        title: "Trip At Period Start",
        startDate: now,
        endDate: periodEnd,
        createdAt: periodStart,
      },
    });

    // 1C. End boundary (createdAt = periodEnd) -> MUST NOT COUNT
    await prisma.trip.create({
      data: {
        agencyId: agencyStarter.id,
        customerId: customerStarter.id,
        tripNumber: "TRP-BOUNDARY-END",
        title: "Trip At Period End",
        startDate: now,
        endDate: periodEnd,
        createdAt: periodEnd,
      },
    });

    const boundaryUsage = await entitlementService.getResourceUsage(agencyStarter.id, "TRIPS");
    console.log(`   Boundary Usage Count: ${boundaryUsage.currentUsage} (Expected: 1)`);
    if (boundaryUsage.currentUsage !== 1) {
      throw new Error(`FAIL: Period boundary interval incorrect. Expected 1, got ${boundaryUsage.currentUsage}`);
    }
    console.log("   ✅ PASSED");

    // Cleanup boundary test trips
    await prisma.trip.deleteMany({ where: { agencyId: agencyStarter.id } });

    // =========================================================================
    // SECTION 2: SOFT-DELETED / ARCHIVED ENTITY QUOTA CONSUMPTION TEST
    // =========================================================================
    console.log("--------------------------------------------------");
    console.log("TEST 2: Soft-Deleted / Archived Entity Quota Consumption");

    const activeTrip = await prisma.trip.create({
      data: {
        agencyId: agencyStarter.id,
        customerId: customerStarter.id,
        tripNumber: "TRP-ARCHIVED-TEST-1",
        title: "Active Trip",
        startDate: now,
        endDate: periodEnd,
        createdAt: now,
      },
    });

    const archivedTrip = await prisma.trip.create({
      data: {
        agencyId: agencyStarter.id,
        customerId: customerStarter.id,
        tripNumber: "TRP-ARCHIVED-TEST-2",
        title: "Archived Trip",
        startDate: now,
        endDate: periodEnd,
        createdAt: now,
        archivedAt: now, // Soft-deleted
      },
    });

    const archiveUsage = await entitlementService.getResourceUsage(agencyStarter.id, "TRIPS");
    console.log(`   Usage including archived trip: ${archiveUsage.currentUsage} (Expected: 2)`);
    if (archiveUsage.currentUsage !== 2) {
      throw new Error(`FAIL: Soft deleted record was not counted toward quota. Expected 2, got ${archiveUsage.currentUsage}`);
    }
    console.log("   ✅ PASSED (Soft deletion does not restore quota)");

    await prisma.trip.deleteMany({ where: { agencyId: agencyStarter.id } });

    // =========================================================================
    // SECTION 3: CONCURRENCY TEST FOR TRIPS (Starter 19/20 Boundary)
    // =========================================================================
    console.log("--------------------------------------------------");
    console.log("TEST 3: TRIPS Concurrency Check at 19/20 Boundary");

    // Backfill exactly 19 historical Trips for agencyStarter
    const tripDataArray = Array.from({ length: 19 }, (_, i) => ({
      agencyId: agencyStarter.id,
      customerId: customerStarter.id,
      tripNumber: `TRP-CONC-${String(i + 1).padStart(2, "0")}`,
      title: `Pre-populated Trip ${i + 1}`,
      startDate: now,
      endDate: periodEnd,
      createdAt: new Date(periodStart.getTime() + (i + 1) * 60 * 1000),
    }));
    await prisma.trip.createMany({ data: tripDataArray });

    const tripUsagePre = await entitlementService.getResourceUsage(agencyStarter.id, "TRIPS");
    console.log(`   Pre-concurrency TRIPS count: ${tripUsagePre.currentUsage} / ${tripUsagePre.limit}`);

    // Launch two creation requests simultaneously
    const tripReq1 = tripService.createTrip(agencyStarter.id, {
      customerId: customerStarter.id,
      title: "Concurrent Trip Req 1",
      startDate: now,
      endDate: periodEnd,
    });

    const tripReq2 = tripService.createTrip(agencyStarter.id, {
      customerId: customerStarter.id,
      title: "Concurrent Trip Req 2",
      startDate: now,
      endDate: periodEnd,
    });

    const tripResults = await Promise.allSettled([tripReq1, tripReq2]);

    let tripSuccesses = 0;
    let tripQuotaExceeded = 0;

    tripResults.forEach((res, idx) => {
      if (res.status === "fulfilled") {
        tripSuccesses++;
        console.log(`   Req ${idx + 1}: SUCCESS`);
      } else {
        if (res.reason instanceof QuotaExceededError) {
          tripQuotaExceeded++;
          console.log(`   Req ${idx + 1}: QUOTA_EXCEEDED (Caught QuotaExceededError)`);
        } else {
          console.error(`   Req ${idx + 1}: Unexpected error:`, res.reason);
        }
      }
    });

    const tripUsagePost = await entitlementService.getResourceUsage(agencyStarter.id, "TRIPS");
    console.log(`   TRIPS Concurrency Results: Success = ${tripSuccesses}, QuotaExceeded = ${tripQuotaExceeded}, Final DB Count = ${tripUsagePost.currentUsage}/20`);

    if (tripSuccesses !== 1 || tripQuotaExceeded !== 1 || tripUsagePost.currentUsage !== 20) {
      throw new Error(`FAIL TRIPS CONCURRENCY: Expected 1 success, 1 rejection, 20 final count. Got successes=${tripSuccesses}, rejections=${tripQuotaExceeded}, count=${tripUsagePost.currentUsage}`);
    }
    console.log("   ✅ PASSED (TRIPS Concurrency 19/20 -> 20/20 exact)");

    await prisma.trip.deleteMany({ where: { agencyId: agencyStarter.id } });

    // =========================================================================
    // SECTION 4: CONCURRENCY TEST FOR QUOTATIONS (Starter 19/20 Boundary)
    // =========================================================================
    console.log("--------------------------------------------------");
    console.log("TEST 4: QUOTATIONS Concurrency Check at 19/20 Boundary");

    // Base trip for quotations
    const baseTripQuote = await prisma.trip.create({
      data: {
        agencyId: agencyStarter.id,
        customerId: customerStarter.id,
        tripNumber: "TRP-QUOTE-BASE",
        title: "Base Trip for Quotes",
        startDate: now,
        endDate: periodEnd,
      },
    });

    // Backfill 19 historical Quotations
    const quoteDataArray = Array.from({ length: 19 }, (_, i) => ({
      agencyId: agencyStarter.id,
      tripId: baseTripQuote.id,
      customerId: customerStarter.id,
      quotationNumber: `QT-2026-${String(i + 1).padStart(5, "0")}`,
      version: 1,
      tier: "Deluxe",
      title: `Pre-populated Quote ${i + 1}`,
      createdAt: new Date(periodStart.getTime() + (i + 1) * 60 * 1000),
    }));
    await prisma.quotation.createMany({ data: quoteDataArray });

    const quoteUsagePre = await entitlementService.getResourceUsage(agencyStarter.id, "QUOTATIONS");
    console.log(`   Pre-concurrency QUOTATIONS count: ${quoteUsagePre.currentUsage} / ${quoteUsagePre.limit}`);

    // Launch two quotation creation requests simultaneously
    const quoteReq1 = quotationService.createQuotation(agencyStarter.id, {
      tripId: baseTripQuote.id,
      customerId: customerStarter.id,
      title: "Concurrent Quote Req 1",
    });

    const quoteReq2 = quotationService.createQuotation(agencyStarter.id, {
      tripId: baseTripQuote.id,
      customerId: customerStarter.id,
      title: "Concurrent Quote Req 2",
    });

    const quoteResults = await Promise.allSettled([quoteReq1, quoteReq2]);

    let quoteSuccesses = 0;
    let quoteQuotaExceeded = 0;

    quoteResults.forEach((res, idx) => {
      if (res.status === "fulfilled") {
        quoteSuccesses++;
        console.log(`   Req ${idx + 1}: SUCCESS`);
      } else {
        if (res.reason instanceof QuotaExceededError) {
          quoteQuotaExceeded++;
          console.log(`   Req ${idx + 1}: QUOTA_EXCEEDED (Caught QuotaExceededError)`);
        } else {
          console.error(`   Req ${idx + 1}: Unexpected error:`, res.reason);
        }
      }
    });

    const quoteUsagePost = await entitlementService.getResourceUsage(agencyStarter.id, "QUOTATIONS");
    console.log(`   QUOTATIONS Concurrency Results: Success = ${quoteSuccesses}, QuotaExceeded = ${quoteQuotaExceeded}, Final DB Count = ${quoteUsagePost.currentUsage}/20`);

    if (quoteSuccesses !== 1 || quoteQuotaExceeded !== 1 || quoteUsagePost.currentUsage !== 20) {
      throw new Error(`FAIL QUOTATIONS CONCURRENCY: Expected 1 success, 1 rejection, 20 final count. Got successes=${quoteSuccesses}, rejections=${quoteQuotaExceeded}, count=${quoteUsagePost.currentUsage}`);
    }
    console.log("   ✅ PASSED (QUOTATIONS Concurrency 19/20 -> 20/20 exact)");

    await prisma.quotation.deleteMany({ where: { agencyId: agencyStarter.id } });
    await prisma.trip.deleteMany({ where: { agencyId: agencyStarter.id } });

    // =========================================================================
    // SECTION 5: CONCURRENCY TEST FOR BOOKINGS (Starter 19/20 Boundary)
    // =========================================================================
    console.log("--------------------------------------------------");
    console.log("TEST 5: BOOKINGS Concurrency Check at 19/20 Boundary");

    // Pre-create trips for booking tests
    const baseTripBook = await prisma.trip.create({
      data: {
        agencyId: agencyStarter.id,
        customerId: customerStarter.id,
        tripNumber: "TRP-BOOK-BASE",
        title: "Base Trip for Bookings",
        startDate: now,
        endDate: periodEnd,
      },
    });

    // Backfill 19 historical Bookings
    const bookDataArray = Array.from({ length: 19 }, (_, i) => ({
      agencyId: agencyStarter.id,
      tripId: baseTripBook.id,
      customerId: customerStarter.id,
      bookingNumber: `BK-2026-${String(i + 1).padStart(5, "0")}`,
      totalAmount: new Prisma.Decimal(10000),
      paidAmount: new Prisma.Decimal(0),
      balanceAmount: new Prisma.Decimal(10000),
      createdAt: new Date(periodStart.getTime() + (i + 1) * 60 * 1000),
    }));
    await prisma.booking.createMany({ data: bookDataArray });

    const bookUsagePre = await entitlementService.getResourceUsage(agencyStarter.id, "BOOKINGS");
    console.log(`   Pre-concurrency BOOKINGS count: ${bookUsagePre.currentUsage} / ${bookUsagePre.limit}`);

    // Launch two booking creation requests simultaneously
    const bookReq1 = bookingService.createBooking(agencyStarter.id, {
      tripId: baseTripBook.id,
      customerId: customerStarter.id,
      totalAmount: 15000,
    });

    const bookReq2 = bookingService.createBooking(agencyStarter.id, {
      tripId: baseTripBook.id,
      customerId: customerStarter.id,
      totalAmount: 18000,
    });

    const bookResults = await Promise.allSettled([bookReq1, bookReq2]);

    let bookSuccesses = 0;
    let bookQuotaExceeded = 0;

    bookResults.forEach((res, idx) => {
      if (res.status === "fulfilled") {
        bookSuccesses++;
        console.log(`   Req ${idx + 1}: SUCCESS`);
      } else {
        if (res.reason instanceof QuotaExceededError) {
          bookQuotaExceeded++;
          console.log(`   Req ${idx + 1}: QUOTA_EXCEEDED (Caught QuotaExceededError)`);
        } else {
          console.error(`   Req ${idx + 1}: Unexpected error:`, res.reason);
        }
      }
    });

    const bookUsagePost = await entitlementService.getResourceUsage(agencyStarter.id, "BOOKINGS");
    console.log(`   BOOKINGS Concurrency Results: Success = ${bookSuccesses}, QuotaExceeded = ${bookQuotaExceeded}, Final DB Count = ${bookUsagePost.currentUsage}/20`);

    if (bookSuccesses !== 1 || bookQuotaExceeded !== 1 || bookUsagePost.currentUsage !== 20) {
      throw new Error(`FAIL BOOKINGS CONCURRENCY: Expected 1 success, 1 rejection, 20 final count. Got successes=${bookSuccesses}, rejections=${bookQuotaExceeded}, count=${bookUsagePost.currentUsage}`);
    }
    console.log("   ✅ PASSED (BOOKINGS Concurrency 19/20 -> 20/20 exact)");

    await prisma.booking.deleteMany({ where: { agencyId: agencyStarter.id } });
    await prisma.trip.deleteMany({ where: { agencyId: agencyStarter.id } });

    // =========================================================================
    // SECTION 6: PROFESSIONAL PLAN UNLIMITED CREATIONS TEST
    // =========================================================================
    console.log("--------------------------------------------------");
    console.log("TEST 6: Professional Plan Unlimited Creations");

    for (let i = 0; i < 5; i++) {
      await tripService.createTrip(agencyPro.id, {
        customerId: customerPro.id,
        title: `Pro Trip ${i + 1}`,
        startDate: now,
        endDate: periodEnd,
      });
    }

    const proUsage = await entitlementService.getResourceUsage(agencyPro.id, "TRIPS");
    console.log(`   Pro Trips Count: ${proUsage.currentUsage} / ${proUsage.limit === null ? "UNLIMITED" : proUsage.limit}`);
    if (proUsage.limit !== null || proUsage.currentUsage !== 5) {
      throw new Error("FAIL: Professional plan quota check rejected creation unexpectedly.");
    }
    console.log("   ✅ PASSED (Professional plan creates without quota limits)");

    await prisma.trip.deleteMany({ where: { agencyId: agencyPro.id } });

    // =========================================================================
    // SECTION 7: CROSS-AGENCY ISOLATION TEST
    // =========================================================================
    console.log("--------------------------------------------------");
    console.log("TEST 7: Cross-Agency Concurrency & Isolation");

    // Perform simultaneous creation for agencyStarter and agencyIsolated
    const isoReqStarter = tripService.createTrip(agencyStarter.id, {
      customerId: customerStarter.id,
      title: "Starter Trip Isolation Check",
      startDate: now,
      endDate: periodEnd,
    });

    const isoReqIsolated = tripService.createTrip(agencyIsolated.id, {
      customerId: customerIsolated.id,
      title: "Isolated Trip Isolation Check",
      startDate: now,
      endDate: periodEnd,
    });

    const isoResults = await Promise.allSettled([isoReqStarter, isoReqIsolated]);

    let isoSuccesses = 0;
    isoResults.forEach((res) => {
      if (res.status === "fulfilled") isoSuccesses++;
    });

    if (isoSuccesses !== 2) {
      throw new Error(`FAIL: Cross-agency simultaneous operations affected each other. Successes: ${isoSuccesses}`);
    }
    console.log("   ✅ PASSED (Independent agencies perform concurrent operations without interference)");

    await prisma.trip.deleteMany({ where: { agencyId: { in: [agencyStarter.id, agencyIsolated.id] } } });

    console.log("\n==================================================");
    console.log("🎉 ALL PHASE C TRANSACTIONAL QUOTA TESTS PASSED!");
    console.log("==================================================");
  } finally {
    // Safe QA Cleanup
    await prisma.booking.deleteMany({ where: { agencyId: { in: [agencyStarter.id, agencyPro.id, agencyIsolated.id] } } });
    await prisma.quotation.deleteMany({ where: { agencyId: { in: [agencyStarter.id, agencyPro.id, agencyIsolated.id] } } });
    await prisma.trip.deleteMany({ where: { agencyId: { in: [agencyStarter.id, agencyPro.id, agencyIsolated.id] } } });
    await prisma.customer.deleteMany({ where: { agencyId: { in: [agencyStarter.id, agencyPro.id, agencyIsolated.id] } } });
    await prisma.subscription.deleteMany({ where: { agencyId: { in: [agencyStarter.id, agencyPro.id, agencyIsolated.id] } } });
    await prisma.agency.deleteMany({ where: { id: { in: [agencyStarter.id, agencyPro.id, agencyIsolated.id] } } });
  }
}

main()
  .catch((e) => {
    console.error("❌ Phase C QA Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
