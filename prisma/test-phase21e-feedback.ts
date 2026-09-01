import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { feedbackService } from "../src/lib/services/feedback-service";
import { customerPublicFeedbackSchema } from "../src/lib/validation/feedback-schema";
import { TripStatus } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function main() {
  console.log("═════════════════════════════════════════════════════════════════════");
  console.log("TRIPDESK PHASE 21-E: CUSTOMER PORTAL FEEDBACK AUTOMATED TEST SUITE");
  console.log("═════════════════════════════════════════════════════════════════════");

  let testAgencyB: any = null;
  let testCustomerA: any = null;
  let testTripCompleted: any = null;
  let testTripOngoing: any = null;
  let testTripDraft: any = null;
  let shareLinkCompleted: any = null;
  let shareLinkOngoing: any = null;

  try {
    // ─── 1. BASELINE PILOT VERIFICATION ──────────────────────────────────────
    console.log("\n--- 1. Baseline Pilot Verification ---");
    const pilotAgency = await prisma.agency.findFirst({
      where: { name: "TripDesk Pilot Agency" },
    });
    assert(!!pilotAgency, "TripDesk Pilot Agency exists");
    const pilotAgencyId = pilotAgency!.id;

    // Create / find a controlled test customer
    testCustomerA = await prisma.customer.findFirst({
      where: { agencyId: pilotAgencyId, phone: "+919999921001" },
    });
    if (!testCustomerA) {
      testCustomerA = await prisma.customer.create({
        data: {
          agencyId: pilotAgencyId,
          customerNumber: "CUST-21E-001",
          name: "Rohan Varma (Feedback Tester)",
          phone: "+919999921001",
          email: "rohan.varma.test@tripdesk.io",
          city: "Mumbai",
        },
      });
    }
    assert(!!testCustomerA, "Test customer exists in Pilot Agency");

    // Create a COMPLETED test trip
    testTripCompleted = await prisma.trip.create({
      data: {
        agencyId: pilotAgencyId,
        customerId: testCustomerA.id,
        tripNumber: `TRIP-21E-COMP-${Date.now().toString().slice(-4)}`,
        title: "Himachal Serenity Tour (Completed)",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-07"),
        status: TripStatus.COMPLETED,
        tripOperation: {
          create: {
            agencyId: pilotAgencyId,
            status: "COMPLETED",
          },
        },
      },
      include: { tripOperation: true },
    });
    assert(!!testTripCompleted, "Created COMPLETED test trip fixture");

    // Create an ONGOING test trip (not eligible)
    testTripOngoing = await prisma.trip.create({
      data: {
        agencyId: pilotAgencyId,
        customerId: testCustomerA.id,
        tripNumber: `TRIP-21E-ONGO-${Date.now().toString().slice(-4)}`,
        title: "Goa Beach Getaway (Ongoing)",
        startDate: new Date("2026-08-25"),
        endDate: new Date("2026-09-05"),
        status: TripStatus.ONGOING,
      },
    });
    assert(!!testTripOngoing, "Created ONGOING test trip fixture");

    // Create a DRAFT test trip (not eligible)
    testTripDraft = await prisma.trip.create({
      data: {
        agencyId: pilotAgencyId,
        customerId: testCustomerA.id,
        tripNumber: `TRIP-21E-DRFT-${Date.now().toString().slice(-4)}`,
        title: "Kerala Backwaters (Draft)",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-07"),
        status: TripStatus.DRAFT,
      },
    });
    assert(!!testTripDraft, "Created DRAFT test trip fixture");

    // Create PublicShareLinks for the trips
    const tokenCompleted = `token_completed_${Date.now()}`;
    shareLinkCompleted = await prisma.publicShareLink.create({
      data: {
        agencyId: pilotAgencyId,
        tripId: testTripCompleted.id,
        tokenHash: tokenCompleted,
        status: "ACTIVE",
      },
    });

    const tokenOngoing = `token_ongoing_${Date.now()}`;
    shareLinkOngoing = await prisma.publicShareLink.create({
      data: {
        agencyId: pilotAgencyId,
        tripId: testTripOngoing.id,
        tokenHash: tokenOngoing,
        status: "ACTIVE",
      },
    });
    assert(!!shareLinkCompleted && !!shareLinkOngoing, "Created PublicShareLinks for test tokens");

    // ─── 2. ELIGIBILITY ENFORCEMENT ──────────────────────────────────────────
    console.log("\n--- 2. Eligibility Enforcement ---");
    const eligibleStatus = await feedbackService.getPublicFeedbackStatus(tokenCompleted);
    assert(eligibleStatus.isEligible === true, "Completed trip is marked eligible for feedback");
    assert(eligibleStatus.hasFeedback === false, "Initial feedback status is hasFeedback: false");
    assert(eligibleStatus.trip?.status === "COMPLETED", "Status payload reflects COMPLETED");
    assert(eligibleStatus.customer?.name === testCustomerA.name, "Customer name resolved correctly");
    assert(eligibleStatus.agency?.name === pilotAgency.name, "Agency name resolved correctly");

    const ongoingStatus = await feedbackService.getPublicFeedbackStatus(tokenOngoing);
    assert(ongoingStatus.isEligible === false, "Ongoing trip is NOT eligible for feedback");
    assert(ongoingStatus.reason?.includes("after your tour is completed") ?? false, "Reason explains feedback is unavailable until completion");

    // Rejection on direct submission attempt for non-completed trip
    let ongoingSubmitBlocked = false;
    try {
      await feedbackService.submitPublicFeedback(tokenOngoing, { rating: 5 });
    } catch (err: any) {
      if (err.message.includes("TRIP_NOT_COMPLETED")) {
        ongoingSubmitBlocked = true;
      }
    }
    assert(ongoingSubmitBlocked, "Direct submission on ONGOING trip strictly rejected with TRIP_NOT_COMPLETED");

    // ─── 3. VALID SUBMISSION & RATING PERSISTENCE ────────────────────────────
    console.log("\n--- 3. Valid Submission & Rating Persistence ---");
    const submitResult1 = await feedbackService.submitPublicFeedback(tokenCompleted, {
      rating: 5,
      hotelRating: 5,
      driverRating: 5,
      vehicleRating: 4,
      activityRating: 5,
      supportRating: 5,
      positiveComment: "Absolutely flawless experience! Driver Rahul was extremely polite and punctual.",
      improvementComment: "None, loved everything!",
      travelAgain: "Yes",
      comments: "Best trip ever.",
    });

    assert(!!submitResult1.id, "Feedback submitted and returned record ID");
    assert(submitResult1.rating === 5, "Overall rating persisted as 5");
    assert(submitResult1.hotelRating === 5, "Hotel rating persisted as 5");
    assert(submitResult1.driverRating === 5, "Driver rating persisted as 5");
    assert(submitResult1.vehicleRating === 4, "Vehicle rating persisted as 4");
    assert(submitResult1.positiveComment?.includes("Rahul") ?? false, "Positive comment persisted correctly");
    assert(submitResult1.travelAgain === "Yes", "travelAgain persisted as Yes");

    // Verify DB record directly
    const dbFeedback = await prisma.customerFeedback.findUnique({
      where: { id: submitResult1.id },
    });
    assert(!!dbFeedback, "CustomerFeedback record exists in PostgreSQL database");
    assert(dbFeedback!.agencyId === pilotAgencyId, "agencyId correctly linked to Pilot Agency");
    assert(dbFeedback!.customerId === testCustomerA.id, "customerId correctly linked to Test Customer");
    assert(dbFeedback!.tripId === testTripCompleted.id, "tripId correctly linked to Completed Trip");
    assert(dbFeedback!.source === "PORTAL", "source recorded as PORTAL");
    assert(dbFeedback!.serviceRecoveryStatus === "Not Needed", "5-star rating sets service recovery to 'Not Needed'");

    // Verify getPublicFeedbackStatus now reflects submitted state
    const afterSubmitStatus = await feedbackService.getPublicFeedbackStatus(tokenCompleted);
    assert(afterSubmitStatus.hasFeedback === true, "getPublicFeedbackStatus reports hasFeedback: true");
    assert(afterSubmitStatus.feedback?.rating === 5, "Reported feedback rating matches 5");
    assert(afterSubmitStatus.feedback?.id === submitResult1.id, "Reported feedback ID matches created record");

    // ─── 4. INPUT VALIDATION & BOUNDARY CHECKS ───────────────────────────────
    console.log("\n--- 4. Input Validation & Boundary Checks ---");
    const validParse = customerPublicFeedbackSchema.safeParse({ rating: 4 });
    assert(validParse.success === true, "Valid 4-star input passes Zod schema");

    const zeroRatingParse = customerPublicFeedbackSchema.safeParse({ rating: 0 });
    assert(zeroRatingParse.success === false, "0-star rating rejected by schema (min 1)");

    const sixRatingParse = customerPublicFeedbackSchema.safeParse({ rating: 6 });
    assert(sixRatingParse.success === false, "6-star rating rejected by schema (max 5)");

    const longComment = "A".repeat(2001);
    const longCommentParse = customerPublicFeedbackSchema.safeParse({ rating: 5, positiveComment: longComment });
    assert(longCommentParse.success === false, "Comment > 2000 characters rejected by schema");

    let invalidTokenBlocked = false;
    try {
      await feedbackService.submitPublicFeedback("invalid_token_xyz", { rating: 5 });
    } catch (err: any) {
      if (err.message.includes("INVALID_TOKEN")) {
        invalidTokenBlocked = true;
      }
    }
    assert(invalidTokenBlocked, "Invalid token submission rejected with INVALID_TOKEN error");

    // ─── 5. DUPLICATE PREVENTION & IDEMPOTENT UPDATES ─────────────────────────
    console.log("\n--- 5. Duplicate Prevention & Idempotent Updates ---");
    const feedbackCountBefore = await prisma.customerFeedback.count({
      where: { tripId: testTripCompleted.id, customerId: testCustomerA.id },
    });
    assert(feedbackCountBefore === 1, "Exactly 1 feedback record exists before retry");

    // Resubmit / update review
    const submitResult2 = await feedbackService.submitPublicFeedback(tokenCompleted, {
      rating: 4,
      hotelRating: 4,
      driverRating: 5,
      positiveComment: "Updated: Great trip, slight hotel delay.",
      travelAgain: "Yes",
    });

    const feedbackCountAfter = await prisma.customerFeedback.count({
      where: { tripId: testTripCompleted.id, customerId: testCustomerA.id },
    });
    assert(feedbackCountAfter === 1, "Duplicate submission prevented: count remains strictly 1");
    assert(submitResult2.id === submitResult1.id, "Existing feedback record was updated (same ID)");
    assert(submitResult2.rating === 4, "Updated rating (4★) reflected in record");
    assert(submitResult2.positiveComment?.includes("Updated") ?? false, "Updated comment reflected in record");

    // ─── 6. SERVICE RECOVERY AUTOMATION (≤ 3★) ──────────────────────────────
    console.log("\n--- 6. Service Recovery Automation (≤ 3★) ---");
    // Update to 2-star rating to trigger service recovery
    const lowRatingResult = await feedbackService.submitPublicFeedback(tokenCompleted, {
      rating: 2,
      driverRating: 2,
      positiveComment: "Driver was late and vehicle AC was broken.",
      travelAgain: "No",
    });

    const lowRatingDb = await prisma.customerFeedback.findUnique({
      where: { id: lowRatingResult.id },
    });
    assert(lowRatingDb!.serviceRecoveryStatus === "Follow-up Required", "Rating <= 3 automatically transitions serviceRecoveryStatus to 'Follow-up Required'");

    // ─── 7. MULTI-TENANT & IDOR SECURITY ──────────────────────────────────────
    console.log("\n--- 7. Multi-Tenant & IDOR Security ---");
    // Create an isolated Agency B
    testAgencyB = await prisma.agency.create({
      data: {
        name: "Phase 21-E Isolated Security Agency",
        phone: "+919999921002",
        email: "agency.b.21e@tripdesk.io",
      },
    });

    const customerB = await prisma.customer.create({
      data: {
        agencyId: testAgencyB.id,
        customerNumber: "CUST-21E-B01",
        name: "Security Isolation Customer",
        phone: "+919999921003",
        email: "cust.b.21e@tripdesk.io",
      },
    });

    const tripB = await prisma.trip.create({
      data: {
        agencyId: testAgencyB.id,
        customerId: customerB.id,
        tripNumber: `TRIP-21E-B-${Date.now().toString().slice(-4)}`,
        title: "Agency B Secret Tour (Completed)",
        startDate: new Date("2026-07-10"),
        endDate: new Date("2026-07-15"),
        status: TripStatus.COMPLETED,
      },
    });

    const tokenB = `token_agency_b_${Date.now()}`;
    await prisma.publicShareLink.create({
      data: {
        agencyId: testAgencyB.id,
        tripId: tripB.id,
        tokenHash: tokenB,
        status: "ACTIVE",
      },
    });

    // Token B querying feedback should resolve to Agency B, never Agency A
    const statusB = await feedbackService.getPublicFeedbackStatus(tokenB);
    assert(statusB.agency?.name === testAgencyB.name, "Token B resolves exclusively to Agency B");
    assert(statusB.trip?.id === tripB.id, "Token B resolves exclusively to Trip B");
    assert(statusB.customer?.name === customerB.name, "Token B resolves exclusively to Customer B");

    // List feedbacks for Pilot Agency should NEVER return Agency B records
    const pilotList = await feedbackService.listFeedbacks(pilotAgencyId);
    const agencyBFoundInPilot = pilotList.items.some((item) => item.tripId === tripB.id);
    assert(!agencyBFoundInPilot, "Multi-tenant isolation: Pilot Agency listFeedbacks has 0 records from Agency B");

    // ─── 8. OPERATIONAL EVENT AUDIT TRAIL ────────────────────────────────────
    console.log("\n--- 8. Operational Event Audit Trail ---");
    const opEvents = await prisma.operationEvent.findMany({
      where: {
        agencyId: pilotAgencyId,
        tripOperationId: testTripCompleted.tripOperation.id,
        eventType: "CUSTOMER_FEEDBACK",
      },
    });
    assert(opEvents.length >= 1, "OperationEvent of type CUSTOMER_FEEDBACK was recorded in operation audit trail");

    // ─── 9. AGENCY DASHBOARD INTEGRATION ────────────────────────────────────
    console.log("\n--- 9. Agency Dashboard Integration ---");
    const agencyFeedbacks = await feedbackService.listFeedbacks(pilotAgencyId);
    assert(agencyFeedbacks.items.length >= 1, "Agency Owner can list feedbacks in /feedback");
    assert(agencyFeedbacks.stats.totalFeedbacks >= 1, "Agency feedback stats reflect total feedback count");
    assert(agencyFeedbacks.stats.attentionCount >= 1, "Agency feedback stats reflect attention count for 2★ review");

    console.log("\n═════════════════════════════════════════════════════════════════════");
    console.log("PHASE 21-E TEST RESULTS: ALL ASSERTIONS PASSED (100%)");
    console.log("═════════════════════════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("Test execution encountered an error:", error);
    process.exit(1);
  } finally {
    // Teardown test fixtures
    console.log("🧹 Cleaning up test fixtures...");
    try {
      if (testCustomerA) {
        await prisma.customerFeedback.deleteMany({
          where: { customerId: testCustomerA.id },
        });
        await prisma.operationEvent.deleteMany({
          where: { tripOperation: { trip: { customerId: testCustomerA.id } } },
        });
        await prisma.publicShareLink.deleteMany({
          where: { trip: { customerId: testCustomerA.id } },
        });
        await prisma.tripOperation.deleteMany({
          where: { trip: { customerId: testCustomerA.id } },
        });
        await prisma.trip.deleteMany({
          where: { customerId: testCustomerA.id },
        });
        await prisma.customer.delete({
          where: { id: testCustomerA.id },
        });
      }
      if (testAgencyB) {
        await prisma.customerFeedback.deleteMany({ where: { agencyId: testAgencyB.id } });
        await prisma.publicShareLink.deleteMany({ where: { agencyId: testAgencyB.id } });
        await prisma.trip.deleteMany({ where: { agencyId: testAgencyB.id } });
        await prisma.customer.deleteMany({ where: { agencyId: testAgencyB.id } });
        await prisma.agency.delete({ where: { id: testAgencyB.id } });
      }
      console.log("🧹 Teardown complete.");
    } catch (cleanupErr) {
      console.error("Error during teardown:", cleanupErr);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
