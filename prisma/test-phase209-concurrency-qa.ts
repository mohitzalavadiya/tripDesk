import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { tripService } from "../src/lib/services/trip-service";
import { feedbackService } from "../src/lib/services/feedback-service";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function main() {
  console.log("═════════════════════════════════════════════════════════════════════");
  console.log("TRIPDESK PHASE 209: FEEDBACK LINK CONCURRENCY QA VERIFICATION");
  console.log("═════════════════════════════════════════════════════════════════════");

  let agencyA: any = null;
  let agencyB: any = null;
  let testCustomerA: any = null;
  let testCustomerB: any = null;
  let trip1Completed: any = null;
  let trip2Draft: any = null;
  let trip3AgencyB: any = null;
  let trip4Feedback: any = null;

  try {
    // ─── 0. SETUP TEST FIXTURES ───────────────────────────────────────────────
    console.log("\n--- 0. Setup Test Fixtures ---");
    agencyA = await prisma.agency.findFirst();
    if (!agencyA) {
      agencyA = await prisma.agency.create({
        data: {
          name: `QA Agency A ${Date.now()}`,
          slug: `qa-agency-a-${Date.now()}`,
          email: `agencya-${Date.now()}@test.com`,
        },
      });
    }
    assert(!!agencyA, "Agency A exists");

    agencyB = await prisma.agency.create({
      data: {
        name: `QA Agency B ${Date.now()}`,
        email: `agencyb-${Date.now()}@test.com`,
        phone: "+919876543210",
      },
    });
    assert(!!agencyB, "Temporary Agency B created");

    testCustomerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        customerNumber: `CUST-209-${Date.now().toString().slice(-4)}`,
        name: "QA Customer A",
        email: `cust-a-${Date.now()}@test.com`,
        phone: "+919999900001",
      },
    });
    assert(!!testCustomerA, "Test Customer A created under Agency A");

    testCustomerB = await prisma.customer.create({
      data: {
        agencyId: agencyB.id,
        customerNumber: `CUST-209-B-${Date.now().toString().slice(-4)}`,
        name: "QA Customer B",
        email: `cust-b-${Date.now()}@test.com`,
        phone: "+919999900002",
      },
    });
    assert(!!testCustomerB, "Test Customer B created under Agency B");

    trip1Completed = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: testCustomerA.id,
        tripNumber: `TRIP-209-COMP1-${Date.now().toString().slice(-4)}`,
        title: "Phase 209 Concurrency Test Trip 1",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-10"),
        status: "COMPLETED",
      },
    });
    assert(!!trip1Completed, "Trip 1 (Completed, Agency A) created");

    trip2Draft = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: testCustomerA.id,
        tripNumber: `TRIP-209-DRAFT-${Date.now().toString().slice(-4)}`,
        title: "Phase 209 Concurrency Test Trip 2 (Draft)",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-10"),
        status: "DRAFT",
      },
    });
    assert(!!trip2Draft, "Trip 2 (Draft, Agency A) created");

    trip3AgencyB = await prisma.trip.create({
      data: {
        agencyId: agencyB.id,
        customerId: testCustomerB.id,
        tripNumber: `TRIP-209-AGB-${Date.now().toString().slice(-4)}`,
        title: "Phase 209 Concurrency Test Trip 3 (Agency B)",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-10"),
        status: "COMPLETED",
      },
    });
    assert(!!trip3AgencyB, "Trip 3 (Completed, Agency B) created");

    // ─── CASE A: CONCURRENT REQUESTS (NO EXISTING ACTIVE LINK) ───────────────
    console.log("\n--- Case A: Concurrent Requests (No Existing Link) ---");
    const [resA1, resA2] = await Promise.all([
      tripService.getOrCreateFeedbackLink(agencyA.id, trip1Completed.id),
      tripService.getOrCreateFeedbackLink(agencyA.id, trip1Completed.id),
    ]);

    assert(!!resA1 && !!resA2, "Both concurrent requests resolved successfully");
    assert(resA1.tokenHash === resA2.tokenHash, `Both requests returned exact same tokenHash (${resA1.tokenHash})`);
    assert(resA1.id === resA2.id, `Both requests returned exact same PublicShareLink ID (${resA1.id})`);

    const activeLinksCountA = await prisma.publicShareLink.count({
      where: { tripId: trip1Completed.id, status: "ACTIVE" },
    });
    assert(activeLinksCountA === 1, `DB contains exactly 1 ACTIVE PublicShareLink for Trip 1 (count: ${activeLinksCountA})`);

    // ─── CASE B: CONCURRENT REQUESTS (EXISTING ACTIVE LINK REUSE) ───────────
    console.log("\n--- Case B: Concurrent Requests (Existing Active Link Reuse) ---");
    const [resB1, resB2] = await Promise.all([
      tripService.getOrCreateFeedbackLink(agencyA.id, trip1Completed.id),
      tripService.getOrCreateFeedbackLink(agencyA.id, trip1Completed.id),
    ]);

    assert(resB1.tokenHash === resA1.tokenHash, "Request B1 reused existing tokenHash");
    assert(resB2.tokenHash === resA1.tokenHash, "Request B2 reused existing tokenHash");

    const totalLinksCountB = await prisma.publicShareLink.count({
      where: { tripId: trip1Completed.id },
    });
    assert(totalLinksCountB === 1, `Total link count remains exactly 1 for Trip 1 (count: ${totalLinksCountB})`);

    // ─── CASE C: CONCURRENT REQUESTS (EXISTING REVOKED LINK) ─────────────────
    console.log("\n--- Case C: Concurrent Requests (Existing Revoked Link) ---");
    await prisma.publicShareLink.update({
      where: { id: resA1.id },
      data: { status: "REVOKED", revokedAt: new Date() },
    });

    const resultsC = await Promise.allSettled([
      tripService.getOrCreateFeedbackLink(agencyA.id, trip1Completed.id),
      tripService.getOrCreateFeedbackLink(agencyA.id, trip1Completed.id),
    ]);

    assert(resultsC[0].status === "rejected", "Concurrent Request C1 rejected for revoked link");
    assert(resultsC[1].status === "rejected", "Concurrent Request C2 rejected for revoked link");

    const activeLinksCountC = await prisma.publicShareLink.count({
      where: { tripId: trip1Completed.id, status: "ACTIVE" },
    });
    assert(activeLinksCountC === 0, `No replacement ACTIVE link created after revocation (count: ${activeLinksCountC})`);

    // ─── CASE D: CONCURRENT REQUESTS (NON-COMPLETED TRIP) ────────────────────
    console.log("\n--- Case D: Concurrent Requests (Non-Completed Trip) ---");
    const resultsD = await Promise.allSettled([
      tripService.getOrCreateFeedbackLink(agencyA.id, trip2Draft.id),
      tripService.getOrCreateFeedbackLink(agencyA.id, trip2Draft.id),
    ]);

    assert(resultsD[0].status === "rejected", "Concurrent Request D1 rejected for non-completed trip");
    assert(resultsD[1].status === "rejected", "Concurrent Request D2 rejected for non-completed trip");

    const linksCountD = await prisma.publicShareLink.count({
      where: { tripId: trip2Draft.id },
    });
    assert(linksCountD === 0, `0 share links created for DRAFT trip (count: ${linksCountD})`);

    // ─── CASE E: CROSS-TENANT ISOLATION ──────────────────────────────────────
    console.log("\n--- Case E: Cross-Tenant Isolation ---");
    const resultsE = await Promise.allSettled([
      tripService.getOrCreateFeedbackLink(agencyA.id, trip3AgencyB.id),
    ]);

    assert(resultsE[0].status === "rejected", "Agency A request for Agency B's trip rejected");

    const linksCountE = await prisma.publicShareLink.count({
      where: { tripId: trip3AgencyB.id },
    });
    assert(linksCountE === 0, `0 share links created for Agency B trip via Agency A request (count: ${linksCountE})`);

    // ─── PHASE 208 REGRESSION & PUBLIC FEEDBACK FLOW ────────────────────────
    console.log("\n--- Phase 208 & Public Feedback Flow Regression ---");
    trip4Feedback = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: testCustomerA.id,
        tripNumber: `TRIP-209-FB-${Date.now().toString().slice(-4)}`,
        title: "Phase 209 Feedback Flow Trip 4",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-10"),
        status: "COMPLETED",
      },
    });

    const link4 = await tripService.getOrCreateFeedbackLink(agencyA.id, trip4Feedback.id);
    assert(!!link4, "PublicShareLink generated for Trip 4");

    const resolved = await feedbackService.resolveTripByToken(link4.tokenHash);
    assert(resolved?.id === trip4Feedback.id, "Public token resolves correctly to Trip 4");
    assert(resolved?.agencyId === agencyA.id, "Public token resolves agency ID correctly");

    const fbSubmission1 = await feedbackService.submitPublicFeedback(link4.tokenHash, {
      rating: 5,
      comments: "Outstanding trip service!",
    });
    assert(fbSubmission1.rating === 5, "Feedback submitted successfully with rating 5");

    const fbSubmission2 = await feedbackService.submitPublicFeedback(link4.tokenHash, {
      rating: 4,
      comments: "Updated rating comment.",
    });
    assert(fbSubmission2.rating === 4, "Feedback updated successfully (idempotency preserved)");

    const totalFeedbacksCount = await prisma.customerFeedback.count({
      where: { tripId: trip4Feedback.id },
    });
    assert(totalFeedbacksCount === 1, `CustomerFeedback record updated, not duplicated (count: ${totalFeedbacksCount})`);

    console.log("\n=====================================================================");
    console.log("  ALL PHASE 209 CONCURRENCY & REGRESSION TESTS PASSED SUCCESSFULLY!  ");
    console.log("=====================================================================");

  } catch (err: any) {
    console.error("\n❌ TEST SUITE FAILED WITH ERROR:", err);
    process.exitCode = 1;
  } finally {
    // ─── CLEANUP TEMPORARY FIXTURES ──────────────────────────────────────────
    console.log("\n--- Cleaning Temporary QA Fixtures ---");
    if (trip4Feedback) {
      await prisma.customerFeedback.deleteMany({ where: { tripId: trip4Feedback.id } });
      await prisma.publicShareLink.deleteMany({ where: { tripId: trip4Feedback.id } });
      await prisma.trip.delete({ where: { id: trip4Feedback.id } }).catch(() => {});
    }
    if (trip1Completed) {
      await prisma.publicShareLink.deleteMany({ where: { tripId: trip1Completed.id } });
      await prisma.trip.delete({ where: { id: trip1Completed.id } }).catch(() => {});
    }
    if (trip2Draft) {
      await prisma.trip.delete({ where: { id: trip2Draft.id } }).catch(() => {});
    }
    if (trip3AgencyB) {
      await prisma.trip.delete({ where: { id: trip3AgencyB.id } }).catch(() => {});
    }
    if (testCustomerA) {
      await prisma.customer.delete({ where: { id: testCustomerA.id } }).catch(() => {});
    }
    if (testCustomerB) {
      await prisma.customer.delete({ where: { id: testCustomerB.id } }).catch(() => {});
    }
    if (agencyB) {
      await prisma.agency.delete({ where: { id: agencyB.id } }).catch(() => {});
    }
    console.log("✅ Temporary QA fixtures cleaned completely.");
    await prisma.$disconnect();
  }
}

main();
