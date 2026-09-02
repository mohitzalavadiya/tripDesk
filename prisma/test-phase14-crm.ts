import "dotenv/config";

// Mock server-only before importing service modules
import Module from "module";
const originalRequire = Module.prototype.require;
// @ts-ignore
Module.prototype.require = function (id: string) {
  if (id === "server-only") {
    return {};
  }
  // @ts-ignore
  return originalRequire.apply(this, arguments);
};

import { prisma } from "../src/lib/prisma";
import { EnquiryStatus, FollowUpStatus, FollowUpType, EnquiryPriority, EnquirySource } from "@prisma/client";
import { enquiryService } from "../src/lib/services/enquiry-service";
import { followUpService } from "../src/lib/services/follow-up-service";
import { customerService } from "../src/lib/services/customer-service";

let assertionCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  assertionCount++;
  console.log(`  ✅ [${assertionCount}] ${message}`);
}

async function runPhase14Tests() {
  console.log("\n=======================================================");
  console.log("🚀 STARTING TRIPDESK PHASE 14 (CRM & FOLLOW-UPS) TEST SUITE");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  let agencyA: any = null;
  let agencyB: any = null;

  try {
    // 1. Setup Test Agencies
    console.log("--- 1. Setting Up Test Agencies ---");
    agencyA = await prisma.agency.create({
      data: {
        name: `CRM Test Agency A ${timestamp}`,
        email: `crm-agency-a-${timestamp}@tripdesk.test`,
        phone: "+91 9876543210",
        status: "ACTIVE",
      },
    });

    agencyB = await prisma.agency.create({
      data: {
        name: `CRM Test Agency B ${timestamp}`,
        email: `crm-agency-b-${timestamp}@tripdesk.test`,
        phone: "+91 9876543211",
        status: "ACTIVE",
      },
    });

    assert(Boolean(agencyA.id && agencyB.id), "Agencies A and B initialized successfully");

    // 2. Setup Customers
    console.log("\n--- 2. Setting Up Customers & Repeat Customer Derivation ---");
    const customerA1 = await customerService.createCustomer(agencyA.id, {
      name: "Rohan Sharma",
      phone: "+919876500001",
      email: `rohan-${timestamp}@gmail.com`,
      city: "Mumbai",
    });

    const customerA2 = await customerService.createCustomer(agencyA.id, {
      name: "Priya Patel",
      phone: "+919876500002",
      email: `priya-${timestamp}@gmail.com`,
      city: "Ahmedabad",
    });

    const customerB1 = await customerService.createCustomer(agencyB.id, {
      name: "Sneha Reddy",
      phone: "+919876500003",
      email: `sneha-${timestamp}@gmail.com`,
      city: "Hyderabad",
    });

    // Check repeat customer derivation for new customer (should be false)
    const isRepeatInitial = await enquiryService.isCustomerRepeat(agencyA.id, customerA1.id);
    assert(isRepeatInitial === false, "Fresh customer with 0 converted leads/trips is NOT a repeat customer");

    // 3. Create Enquiries and Test Duplicate Detection
    console.log("\n--- 3. Enquiry Creation & Duplicate Detection ---");
    const today = new Date();
    const futureStart = new Date(today.getTime() + 86400000 * 10);
    const futureEnd = new Date(today.getTime() + 86400000 * 15);

    const enq1 = await enquiryService.createEnquiry(agencyA.id, {
      customerId: customerA1.id,
      title: "Shimla Family Vacation",
      destination: "Shimla",
      origin: "Mumbai",
      startDate: futureStart,
      endDate: futureEnd,
      adults: 2,
      children: 1,
      budget: 85000,
      source: EnquirySource.WEBSITE,
      priority: EnquiryPriority.HIGH,
    });

    assert(enq1.destination === "Shimla", "Enquiry 1 created under Agency A");
    assert(enq1.status === EnquiryStatus.NEW, "Initial enquiry status defaults to NEW");

    // Duplicate Check 1: Destination match for same customer
    const dupCheck1 = await enquiryService.checkDuplicateEnquiry(agencyA.id, {
      customerId: customerA1.id,
      destination: "Shimla",
    });
    assert(dupCheck1.matchCount === 1, "Duplicate enquiry check detected active lead by destination");
    assert(dupCheck1.duplicates[0].id === enq1.id, "Duplicate enquiry matches enq1 ID");

    // Duplicate Check 2: Different agency should see 0 duplicates (Tenant Isolation)
    const dupCheckB = await enquiryService.checkDuplicateEnquiry(agencyB.id, {
      customerId: customerA1.id,
      destination: "Shimla",
    });
    assert(dupCheckB.matchCount === 0, "Duplicate enquiry check is strictly tenant-isolated");

    // 4. Follow-up Operations: Scheduling, Scopes & Telemetry
    console.log("\n--- 4. Follow-up Operations, Scopes & Telemetry ---");
    const yesterday = new Date(today.getTime() - 86400000);
    const tomorrow = new Date(today.getTime() + 86400000);
    const inFiveDays = new Date(today.getTime() + 86400000 * 5);

    // Overdue Follow-up
    const fuOverdue = await followUpService.createFollowUp(agencyA.id, {
      enquiryId: enq1.id,
      type: FollowUpType.CALL,
      priority: EnquiryPriority.URGENT,
      scheduledAt: yesterday,
      notes: "Follow up regarding hotel customization in Shimla",
    });

    // Today Follow-up
    const fuToday = await followUpService.createFollowUp(agencyA.id, {
      enquiryId: enq1.id,
      type: FollowUpType.WHATSAPP,
      priority: EnquiryPriority.HIGH,
      scheduledAt: new Date(today.getTime() + 3600000 * 2),
      notes: "Send updated itinerary PDF on WhatsApp",
    });

    // Upcoming Follow-up on another enquiry
    const enq2 = await enquiryService.createEnquiry(agencyA.id, {
      customerId: customerA2.id,
      title: "Kerala Honeymoon",
      destination: "Munnar & Alleppey",
      startDate: inFiveDays,
      adults: 2,
      budget: 120000,
      source: EnquirySource.INSTAGRAM,
      priority: EnquiryPriority.MEDIUM,
    });

    const fuUpcoming = await followUpService.createFollowUp(agencyA.id, {
      enquiryId: enq2.id,
      type: FollowUpType.EMAIL,
      priority: EnquiryPriority.MEDIUM,
      scheduledAt: tomorrow,
      notes: "Email flight availability and inclusions",
    });

    // Verify nextFollowUpAt was updated on enquiry
    const updatedEnq1 = await prisma.enquiry.findUnique({ where: { id: enq1.id } });
    assert(Boolean(updatedEnq1?.nextFollowUpAt), "enquiry.nextFollowUpAt is synchronized on follow-up creation");

    // Check Summary Counts
    const summaryA = await followUpService.getFollowUpSummary(agencyA.id);
    assert(summaryA.overdueCount >= 1, "Follow-up summary correctly counts overdue follow-up");
    assert(summaryA.todayCount >= 1, "Follow-up summary correctly counts today's follow-up");
    assert(summaryA.upcomingCount >= 1, "Follow-up summary correctly counts upcoming follow-up");
    assert(summaryA.totalPending >= 3, "Total pending count reflects all 3 active follow-ups");

    // Global Follow-up Scopes Query
    const overdueList = await followUpService.getGlobalFollowUps(agencyA.id, { scope: "overdue" });
    assert(overdueList.data.some((f) => f.id === fuOverdue.id), "Global follow-up scope 'overdue' returns overdue tasks");

    const todayList = await followUpService.getGlobalFollowUps(agencyA.id, { scope: "today" });
    assert(todayList.data.some((f) => f.id === fuToday.id), "Global follow-up scope 'today' returns today tasks");

    const upcomingList = await followUpService.getGlobalFollowUps(agencyA.id, { scope: "upcoming" });
    assert(upcomingList.data.some((f) => f.id === fuUpcoming.id), "Global follow-up scope 'upcoming' returns upcoming tasks");

    // Tenant Isolation Check for Follow-ups
    const summaryB = await followUpService.getFollowUpSummary(agencyB.id);
    assert(summaryB.totalPending === 0, "Agency B has 0 follow-ups (tenant isolation preserved)");

    // 5. Complete Follow-up with Atomic Next Follow-up Creation
    console.log("\n--- 5. Atomic Follow-up Completion & Chaining ---");
    const completionResult = await followUpService.completeFollowUp(
      agencyA.id,
      fuOverdue.id,
      {
        outcome: "Client requested 4-star boutique resort with mountain view",
        notes: "Shared Taj Theog details",
        scheduleNext: true,
        nextFollowUp: {
          type: FollowUpType.CALL,
          priority: EnquiryPriority.HIGH,
          scheduledAt: inFiveDays,
          notes: "Call to confirm quotation acceptance",
        },
      }
    );

    assert(completionResult.completed.status === FollowUpStatus.COMPLETED, "Follow-up status marked COMPLETED");
    assert(completionResult.completed.outcome?.includes("4-star boutique"), "Follow-up outcome note recorded");
    assert(Boolean(completionResult.nextFollowUp), "Next follow-up was atomically scheduled");
    assert(completionResult.nextFollowUp?.type === FollowUpType.CALL, "Next follow-up type matches");

    // 6. Reschedule & Cancel Follow-up
    console.log("\n--- 6. Reschedule & Cancel Follow-up ---");
    const rescheduledDate = new Date(today.getTime() + 86400000 * 3);
    const rescheduled = await followUpService.rescheduleFollowUp(agencyA.id, fuToday.id, {
      scheduledAt: rescheduledDate,
      notes: "Client asked to call after 5 PM on Wednesday",
    });
    assert(
      new Date(rescheduled.scheduledAt).getTime() === rescheduledDate.getTime(),
      "Follow-up scheduledAt updated via reschedule"
    );

    const cancelled = await followUpService.cancelFollowUp(agencyA.id, fuUpcoming.id, {
      reason: "Client already emailed directly with confirmed dates",
    });
    assert(cancelled.status === FollowUpStatus.CANCELLED, "Follow-up status marked CANCELLED");

    // 7. Pipeline Stage Transitions & Lost Workflows
    console.log("\n--- 7. Pipeline Stage Transitions & Lost Workflows ---");
    // Transition enq1 from NEW -> CONTACTED -> QUALIFIED
    const stage1 = await enquiryService.transitionStage(agencyA.id, enq1.id, {
      status: EnquiryStatus.CONTACTED,
    });
    assert(stage1.status === EnquiryStatus.CONTACTED, "Transitioned enquiry to CONTACTED");

    const stage2 = await enquiryService.transitionStage(agencyA.id, enq1.id, {
      status: EnquiryStatus.QUALIFIED,
    });
    assert(stage2.status === EnquiryStatus.QUALIFIED, "Transitioned enquiry to QUALIFIED");

    // Try transitioning to LOST without lostReason (Should FAIL validation guardrail)
    let lostFailed = false;
    try {
      await enquiryService.transitionStage(agencyA.id, enq1.id, {
        status: EnquiryStatus.LOST,
      });
    } catch (e: any) {
      lostFailed = true;
      assert(e.message.includes("lostReason"), "Transitioning to LOST strictly requires lostReason");
    }
    assert(lostFailed, "Enforced mandatory lost reason validation");

    // Properly Mark enquiry enq2 as LOST
    const lostEnq2 = await enquiryService.markEnquiryLost(agencyA.id, enq2.id, {
      lostReason: "CHOSE_COMPETITOR",
      lostExplanation: "Client found a cheaper package with another local agent",
    });
    assert(lostEnq2.status === EnquiryStatus.LOST, "Enquiry marked LOST with structured reason");
    assert(lostEnq2.lostReason === "CHOSE_COMPETITOR", "Lost reason correctly saved");
    assert(lostEnq2.lostExplanation?.includes("cheaper package"), "Lost explanation saved");
    assert(Boolean(lostEnq2.closedAt), "Enquiry closedAt timestamped upon marking LOST");

    // 8. Conversion & Repeat Customer Validation
    console.log("\n--- 8. Enquiry Conversion & Repeat Customer Derivation ---");
    // Mark enq1 as WON / Converted
    const wonEnq1 = await enquiryService.markEnquiryWon(agencyA.id, enq1.id);
    assert(wonEnq1.status === EnquiryStatus.CONVERTED, "Enquiry marked CONVERTED (Won)");
    assert(Boolean(wonEnq1.closedAt), "Enquiry closedAt set on CONVERTED");

    // Check repeat customer derivation now that customerA1 has a converted enquiry
    const isRepeatAfterWon = await enquiryService.isCustomerRepeat(agencyA.id, customerA1.id);
    assert(isRepeatAfterWon === true, "Customer is now correctly identified as REPEAT CUSTOMER after won conversion");

    // Verify Customer 360 includes isRepeatCustomer
    const customerDetails = await customerService.getCustomerDetails360(agencyA.id, customerA1.id);
    assert(customerDetails?.isRepeatCustomer === true, "CustomerDetails360 returns isRepeatCustomer: true");

    // 9. Chronological CRM Activity Timeline Verification
    console.log("\n--- 9. CRM Activity Timeline Verification ---");
    const timeline = await enquiryService.getEnquiryTimeline(agencyA.id, enq1.id);
    assert(timeline.length >= 3, "CRM Activity Timeline aggregates multiple events");

    const createdEvent = timeline.find((e) => e.type === "ENQUIRY_CREATED");
    assert(Boolean(createdEvent), "Timeline includes ENQUIRY_CREATED event");

    const completedEvent = timeline.find((e) => e.type === "FOLLOW_UP_COMPLETED");
    assert(Boolean(completedEvent), "Timeline includes FOLLOW_UP_COMPLETED event");

    const convertedEvent = timeline.find((e) => e.type === "ENQUIRY_CONVERTED");
    assert(Boolean(convertedEvent), "Timeline includes ENQUIRY_CONVERTED event");

    // 10. CRM Dashboard Statistics Verification
    console.log("\n--- 10. CRM Dashboard Telemetry & Pipeline Analytics ---");
    const crmDashboard = await enquiryService.getCrmDashboardStats(agencyA.id);
    assert(crmDashboard.salesSummary.totalLeads >= 2, "CRM dashboard aggregates total leads");
    assert(crmDashboard.salesSummary.wonLeads >= 1, "CRM dashboard counts won leads");
    assert(crmDashboard.salesSummary.lostLeads >= 1, "CRM dashboard counts lost leads");
    assert(crmDashboard.salesSummary.conversionRate > 0, "CRM dashboard calculates conversion rate %");
    assert(crmDashboard.sourcesSummary.length > 0, "CRM dashboard provides lead sources distribution");

    // 11. Strict Architecture & Role Safety Check
    console.log("\n--- 11. Security & Role Architecture Invariant Verification ---");
    const customerUserCount = await prisma.user.count({
      where: {
        email: { in: [customerA1.email || "", customerA2.email || "", customerB1.email || ""] },
      },
    });
    assert(customerUserCount === 0, "ZERO customer records exist in User table (Customer is strictly NOT a system role)");

    console.log("\n=======================================================");
    console.log(`🎉 ALL ${assertionCount} PHASE 14 (CRM & FOLLOW-UPS) ASSERTIONS PASSED!`);
    console.log("=======================================================\n");
  } finally {
    // Cleanup test data
    console.log("Cleaning up test database fixtures...");
    if (agencyA?.id && agencyB?.id) {
      await prisma.enquiryFollowUp.deleteMany({
        where: { agencyId: { in: [agencyA.id, agencyB.id] } },
      });
      await prisma.enquiry.deleteMany({
        where: { agencyId: { in: [agencyA.id, agencyB.id] } },
      });
      await prisma.customer.deleteMany({
        where: { agencyId: { in: [agencyA.id, agencyB.id] } },
      });
      await prisma.agency.deleteMany({
        where: { id: { in: [agencyA.id, agencyB.id] } },
      });
    }
  }
}

runPhase14Tests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
