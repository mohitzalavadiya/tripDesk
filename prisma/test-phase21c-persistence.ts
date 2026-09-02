import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { feedbackService } from "../src/lib/services/feedback-service";
import { referralService } from "../src/lib/services/referral-service";
import { customerInsightsService } from "../src/lib/services/customer-insights-service";
import { ReferralStatus } from "@prisma/client";

async function runPhase21CTests() {
  console.log("═════════════════════════════════════════════════════════════════════");
  console.log("TRIPDESK PHASE 21-C: PERSISTENCE & MOCK CLEANUP AUTOMATED TEST SUITE");
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

  try {
    // ─── 1. PILOT & TENANT SETUP ──────────────────────────────────────
    console.log("--- 1. Baseline Pilot Verification ---");
    const pilotAgency = await prisma.agency.findFirst({
      where: { name: "TripDesk Pilot Agency" },
      include: {
        customers: { take: 2 },
        trips: { take: 2 },
        bookings: { take: 2 },
      },
    });

    assert(!!pilotAgency, "TripDesk Pilot Agency exists");
    const agencyId = pilotAgency!.id;

    // Create or find a test customer and trip in pilot agency
    let testCustomer = pilotAgency?.customers[0];
    if (!testCustomer) {
      testCustomer = await prisma.customer.create({
        data: {
          agencyId,
          name: "Test Traveler Alpha",
          phone: "+91 9988776655",
          email: "traveler.alpha@test.com",
        },
      });
    }

    let testTrip = pilotAgency?.trips[0];
    if (!testTrip) {
      testTrip = await prisma.trip.create({
        data: {
          agencyId,
          customerId: testCustomer.id,
          title: "Golden Triangle Tour Test",
          tripNumber: `TRP-TEST-${Date.now()}`,
          startDate: new Date(),
          endDate: new Date(Date.now() + 5 * 86400000),
          status: "COMPLETED",
        },
      });
    }

    // Secondary isolated agency for cross-tenant testing
    let secondAgency = await prisma.agency.findFirst({
      where: { name: "Phase21C Cross-Tenant Test Agency" },
    });
    if (!secondAgency) {
      secondAgency = await prisma.agency.create({
        data: {
          name: "Phase21C Cross-Tenant Test Agency",
          email: `tenant2-${Date.now()}@tripdesk.io`,
          phone: "+91 9888877777",
          status: "ACTIVE",
        },
      });
    }

    // ─── 2. FEEDBACK PERSISTENCE & SERVICE RECOVERY ──────────────────
    console.log("\n--- 2. Customer Feedback Persistence & Service Recovery ---");

    // Create 5-star feedback
    const fb1 = await feedbackService.createFeedback(agencyId, {
      customerId: testCustomer.id,
      tripId: testTrip.id,
      rating: 5,
      hotelRating: 5,
      driverRating: 5,
      vehicleRating: 5,
      activityRating: 5,
      supportRating: 5,
      positiveComment: "Everything was magical, brilliant chauffeur!",
      travelAgain: "Yes",
      source: "MANUAL",
    });

    assert(!!fb1.id, "Created 5-star feedback record in database");
    assert(fb1.rating === 5, "Feedback rating persisted as 5");
    assert(fb1.serviceRecoveryStatus === "Not Needed", "5-star feedback defaults service recovery to 'Not Needed'");

    // Create 2-star feedback (should trigger Attention / Service Recovery)
    const fb2 = await feedbackService.createFeedback(agencyId, {
      customerId: testCustomer.id,
      tripId: testTrip.id,
      rating: 2,
      hotelRating: 2,
      driverRating: 3,
      vehicleRating: 2,
      activityRating: 4,
      supportRating: 3,
      improvementComment: "AC in vehicle was malfunctioning on Day 2.",
      travelAgain: "Maybe",
      source: "PORTAL",
    });

    assert(!!fb2.id, "Created 2-star feedback record");
    assert(fb2.serviceRecoveryStatus === "Follow-up Required", "Low rating (<=3) automatically flags 'Follow-up Required'");

    // List feedbacks and test stats
    const listResult = await feedbackService.listFeedbacks(agencyId);
    assert(listResult.items.length >= 2, "Listed feedback items contains created records");
    assert(listResult.stats.totalFeedbacks >= 2, "Summary stats accurately count total feedbacks");
    assert(listResult.stats.attentionCount >= 1, "Summary stats accurately count attention required feedbacks");

    // Filter by ATTENTION tab
    const attentionList = await feedbackService.listFeedbacks(agencyId, { tab: "ATTENTION" });
    assert(attentionList.items.some((i) => i.id === fb2.id), "Attention tab filter includes 2-star feedback");
    assert(!attentionList.items.some((i) => i.id === fb1.id), "Attention tab filter excludes 5-star feedback");

    // Update Service Recovery
    const updatedRecovery = await feedbackService.updateServiceRecovery(agencyId, fb2.id, {
      serviceRecoveryStatus: "Resolved",
      serviceRecoveryNotes: "Guest contacted by GM and provided ₹2,500 travel voucher.",
    });

    assert(updatedRecovery.serviceRecoveryStatus === "Resolved", "Service recovery updated to 'Resolved'");
    assert(updatedRecovery.serviceRecoveryNotes?.includes("₹2,500"), "Service recovery notes persisted correctly");

    // Cross-tenant protection on Feedback
    try {
      await feedbackService.getFeedback(secondAgency.id, fb1.id);
      const res = await feedbackService.getFeedback(secondAgency.id, fb1.id);
      assert(res === null, "Cross-tenant feedback get returns null (IDOR blocked)");
    } catch {
      assert(true, "Cross-tenant feedback read blocked");
    }

    try {
      await feedbackService.updateServiceRecovery(secondAgency.id, fb2.id, {
        serviceRecoveryStatus: "Contacted",
      });
      assert(false, "Cross-tenant service recovery update should fail");
    } catch (e: any) {
      assert(true, "Cross-tenant service recovery update blocked with error");
    }

    // ─── 3. REFERRALS & REWARDS PERSISTENCE ──────────────────────────
    console.log("\n--- 3. Referral Program & Rewards Persistence ---");

    // Create referral
    const ref1 = await referralService.createReferral(agencyId, {
      referrerCustomerId: testCustomer.id,
      referredName: "Rohan Varma",
      referredPhone: "+91 9123456789",
      referredEmail: "rohan.varma@gmail.com",
      rewardAmount: 750,
      notes: "Friend from college looking for Kerala trip.",
    });

    assert(!!ref1.id, "Created referral record in database");
    assert(ref1.status === ReferralStatus.PENDING, "Referral defaults to PENDING status");
    assert(ref1.referralCode.startsWith("REF-"), "Referral code has valid REF- prefix format");
    assert(Number(ref1.rewardAmount) === 750, "Referral reward amount persisted as ₹750");

    // List referrals
    const refList = await referralService.listReferrals(agencyId);
    assert(refList.items.length >= 1, "Listed referrals from database");
    assert(refList.stats.totalReferrals >= 1, "Stats reflect total referrals");

    // Transition status: PENDING -> CONVERTED
    const convertedRef = await referralService.updateReferralStatus(agencyId, ref1.id, {
      status: ReferralStatus.CONVERTED,
    });
    assert(convertedRef.status === ReferralStatus.CONVERTED, "Referral status updated to CONVERTED");

    // Transition status: CONVERTED -> REWARDED
    const rewardedRef = await referralService.updateReferralStatus(agencyId, ref1.id, {
      status: ReferralStatus.REWARDED,
      notes: "Rewarded via travel credits.",
    });
    assert(rewardedRef.status === ReferralStatus.REWARDED, "Referral status updated to REWARDED");

    // Cross-tenant protection on Referral
    const crossRef = await referralService.getReferral(secondAgency.id, ref1.id);
    assert(crossRef === null, "Cross-tenant referral lookup returns null");

    try {
      await referralService.updateReferralStatus(secondAgency.id, ref1.id, {
        status: ReferralStatus.CANCELLED,
      });
      assert(false, "Cross-tenant referral mutation should fail");
    } catch {
      assert(true, "Cross-tenant referral mutation blocked");
    }

    // ─── 4. CUSTOMER INSIGHTS REAL-TIME AGGREGATION ──────────────────
    console.log("\n--- 4. Real-Time Customer Insights Analytics ---");

    const insights = await customerInsightsService.getCustomerInsights(agencyId);

    assert(typeof insights.overview.totalCustomers === "number", "Insights returns totalCustomers");
    assert(insights.overview.totalCustomers >= 1, "Insights accurately counts active customers");
    assert(typeof insights.overview.repeatRate === "number", "Insights calculates repeatRate percentage");
    assert(typeof insights.overview.averageLTV === "number", "Insights calculates average LTV");
    assert(typeof insights.feedback.averageRating === "number", "Insights aggregates average feedback rating");
    assert(insights.feedback.totalFeedbacks >= 2, "Insights reflects verified feedback count");
    assert(insights.referrals.totalReferrals >= 1, "Insights reflects referral count");
    assert(Array.isArray(insights.topDestinations), "Insights returns top destinations array");
    assert(Array.isArray(insights.topCustomers), "Insights returns top VIP customers array");

    // Verify second agency insights are empty/isolated
    const tenant2Insights = await customerInsightsService.getCustomerInsights(secondAgency.id);
    assert(tenant2Insights.overview.totalCustomers === 0, "Cross-tenant insights show 0 customers for empty agency");
    assert(tenant2Insights.feedback.totalFeedbacks === 0, "Cross-tenant insights show 0 feedback for empty agency");

    // Clean up secondAgency test records
    await prisma.agency.delete({ where: { id: secondAgency.id } });
    console.log("  🧹 Cleaned up isolated test agency");

    // Clean up created test feedback & referral
    await prisma.customerFeedback.deleteMany({ where: { id: { in: [fb1.id, fb2.id] } } });
    await prisma.referral.deleteMany({ where: { id: ref1.id } });
    console.log("  🧹 Cleaned up temporary test feedback & referral");

    console.log("\n═════════════════════════════════════════════════════════════════════");
    console.log(`PHASE 21-C TEST RESULTS: ${passed} PASSED / ${failed} FAILED`);
    console.log("═════════════════════════════════════════════════════════════════════\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Test execution failed with unhandled error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase21CTests();
