import "dotenv/config";
import { randomUUID } from "crypto";

// Mock server-only for standalone test script execution
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as any;
} catch {}

import { prisma } from "../src/lib/prisma";
import { operationsService } from "../src/lib/services/operations-service";
import {
  TripStatus,
  OperationStatus,
  ConfirmationStatus,
  DispatchStatus,
  IssuePriority,
  IssueStatus,
} from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runPhase1013ETests() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING PHASE 10.13E TEST SUITE (Operational Issues Tracker)");
  console.log("══════════════════════════════════════════════════════════════\n");

  const timestamp = Date.now();
  const agencyA_Email = `ops-13e-a-${timestamp}@test.com`;
  const agencyB_Email = `ops-13e-b-${timestamp}@test.com`;

  // 1. Create two test agencies for multi-tenant isolation testing
  const agencyA = await prisma.agency.create({
    data: {
      name: `Ops 13E Agency A-${timestamp}`,
      email: agencyA_Email,
      phone: "+919880011223",
      status: "ACTIVE",
    },
  });

  const agencyB = await prisma.agency.create({
    data: {
      name: `Ops 13E Agency B-${timestamp}`,
      email: agencyB_Email,
      phone: "+919880011224",
      status: "ACTIVE",
    },
  });

  const userA = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `ops-agent-a-${timestamp}@tripdesk-test.com`,
      agencyId: agencyA.id,
      name: "Operations Lead A",
      role: "AGENCY_OWNER",
    },
  });

  const userB = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `ops-agent-b-${timestamp}@tripdesk-test.com`,
      agencyId: agencyB.id,
      name: "Operations Lead B",
      role: "AGENCY_OWNER",
    },
  });

  console.log(`✅ Test Agencies initialized: ${agencyA.name} and ${agencyB.name}\n`);

  try {
    // -------------------------------------------------------------
    // TEST 1: Setup Customer, Confirmed Tour & Inventory Components
    // -------------------------------------------------------------
    console.log("🧪 Running Test 1: Setup Customer, Confirmed Tour & Inventory...");

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: "Devi & Rahul Nambiar",
        phone: `+91 98800 ${Math.floor(10000 + Math.random() * 90000)}`,
        email: `guest-${timestamp}@example.com`,
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-13E-${timestamp}`,
        title: "Kerala Backwaters & Hill Escapes",
        startDate: new Date("2026-11-20T09:00:00Z"),
        endDate: new Date("2026-11-24T18:00:00Z"),
        status: TripStatus.CONFIRMED,
      },
    });

    const hotelSupplierA = await prisma.supplier.create({
      data: {
        agencyId: agencyA.id,
        name: "Spice Plantation Resorts",
        type: "HOTEL",
        contactPerson: "Front Desk Manager",
        phone: "+91 484 220011",
      },
    });

    const masterHotelA = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        supplierId: hotelSupplierA.id,
        name: "Spice Tree Luxury Resort Munnar",
        city: "Munnar",
        category: "5 Star",
      },
    });

    await prisma.tripHotel.create({
      data: {
        tripId: tripA.id,
        hotelId: masterHotelA.id,
        roomType: "Valley View Pool Villa",
        checkIn: new Date("2026-11-20T14:00:00Z"),
        checkOut: new Date("2026-11-23T11:00:00Z"),
        rooms: 1,
        mealPlan: "CP",
        nightlyRate: 12000,
        totalAmount: 36000,
      },
    });

    assert(tripA.id !== undefined, "Trip with hotel inventory initialized");

    // -------------------------------------------------------------
    // TEST 2: Initialize Operation & Confirm Hotels for 100% baseline
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 2: Initialize Operation & Set Baseline Readiness...");

    const operationA = await operationsService.initializeOperation(
      agencyA.id,
      { tripId: tripA.id, status: OperationStatus.PREPARING },
      userA.id
    );

    // Confirm the hotel so readiness would be 100% if no issues exist
    const hotelConf = await prisma.hotelConfirmation.findFirst({
      where: { tripOperationId: operationA.id, agencyId: agencyA.id },
    });
    assert(hotelConf !== null, "Hotel confirmation record hydrated");

    await operationsService.updateHotelConfirmation(
      agencyA.id,
      operationA.id,
      hotelConf!.id,
      {
        status: ConfirmationStatus.CONFIRMED,
        confirmationNumber: "VCHR-13E-7799",
      },
      userA.id
    );

    const baselineReadiness = await operationsService.calculateReadiness(
      agencyA.id,
      operationA.id
    );
    assert(baselineReadiness.isReady === true, "Baseline operational readiness isReady is true (100%)");

    // -------------------------------------------------------------
    // TEST 3: Issue Creation Workflow (OPEN + HIGH Priority)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 3: Issue Creation Workflow (OPEN + HIGH)...");

    const issueA = await operationsService.createIssue(
      agencyA.id,
      operationA.id,
      {
        title: "Guest reported flight delayed by 4 hours",
        description: "Guest flight 6E-452 from BOM delayed. Airport pickup chauffeur needs rescheduling.",
        priority: IssuePriority.HIGH,
        assignedTo: "Transport Coordinator",
        reportedBy: "Guest Helpline",
      },
      userA.id
    );

    assert(issueA.id !== undefined, "Operational issue created with valid ID");
    assert(issueA.status === IssueStatus.OPEN, "Initial issue status is OPEN");
    assert(issueA.priority === IssuePriority.HIGH, "Issue priority is HIGH");
    assert(issueA.reportedBy === "Guest Helpline", "Reporter saved");
    assert(issueA.assignedTo === "Transport Coordinator", "Assignee saved");

    // Verify timeline event
    const eventsAfterCreate = await operationsService.getTimeline(agencyA.id, operationA.id);
    const createEvent = eventsAfterCreate.find((e) => e.eventType === "ISSUE_CREATED");
    assert(createEvent !== undefined, "ISSUE_CREATED timeline audit event logged");

    // -------------------------------------------------------------
    // TEST 4: Readiness Blocker Verification (HIGH/CRITICAL Issue blocks readiness)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 4: Readiness Blocker Verification...");

    const readinessWithIssue = await operationsService.calculateReadiness(
      agencyA.id,
      operationA.id
    );
    assert(readinessWithIssue.openIssuesCount === 1, "Readiness reflects 1 open issue");
    assert(readinessWithIssue.isReady === false, "HIGH priority OPEN issue blocks readiness (isReady: false)");

    const issueCheck = readinessWithIssue.checks.find((c) => c.key === "issues");
    assert(issueCheck?.passed === false, "Issues readiness check failed as expected");

    // -------------------------------------------------------------
    // TEST 5: Status Transition: OPEN -> IN_PROGRESS
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 5: Status Transition (OPEN -> IN_PROGRESS)...");

    const inProgressIssue = await operationsService.updateIssue(
      agencyA.id,
      operationA.id,
      issueA.id,
      {
        status: IssueStatus.IN_PROGRESS,
      },
      userA.id
    );

    assert(inProgressIssue.status === IssueStatus.IN_PROGRESS, "Issue status transitioned to IN_PROGRESS");

    const readinessInProgress = await operationsService.calculateReadiness(
      agencyA.id,
      operationA.id
    );
    assert(readinessInProgress.isReady === false, "IN_PROGRESS HIGH issue continues to block readiness");

    // -------------------------------------------------------------
    // TEST 6: Resolution Workflow (Mandatory Resolution Note & Blocker Clearing)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 6: Resolution Workflow & Readiness Clearing...");

    // Test rejection when resolution note is empty
    let emptyResolutionRejected = false;
    try {
      await operationsService.updateIssue(
        agencyA.id,
        operationA.id,
        issueA.id,
        {
          status: IssueStatus.RESOLVED,
          resolution: "",
        },
        userA.id
      );
    } catch {
      emptyResolutionRejected = true;
    }
    assert(emptyResolutionRejected, "Empty resolution note strictly rejected when resolving issue");

    // Resolve with valid resolution note
    const resolvedIssue = await operationsService.updateIssue(
      agencyA.id,
      operationA.id,
      issueA.id,
      {
        status: IssueStatus.RESOLVED,
        resolution: "Re-assigned chauffeur to 18:30 airport pickup and informed guest via WhatsApp.",
      },
      userA.id
    );

    assert(resolvedIssue.status === IssueStatus.RESOLVED, "Issue status updated to RESOLVED");
    assert(resolvedIssue.resolution !== null, "Resolution note saved");
    assert(resolvedIssue.resolvedAt !== null, "resolvedAt timestamp populated");

    // Verify timeline event
    const eventsAfterResolve = await operationsService.getTimeline(agencyA.id, operationA.id);
    const resolveEvent = eventsAfterResolve.find((e) => e.eventType === "ISSUE_RESOLVED");
    assert(resolveEvent !== undefined, "ISSUE_RESOLVED timeline audit event logged");

    // Verify readiness restored
    const readinessAfterResolve = await operationsService.calculateReadiness(
      agencyA.id,
      operationA.id
    );
    assert(readinessAfterResolve.isReady === true, "Operational readiness restored to isReady: true after resolution");

    // -------------------------------------------------------------
    // TEST 7: Reopening Workflow (RESOLVED -> OPEN)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 7: Reopening Workflow...");

    const reopenedIssue = await operationsService.updateIssue(
      agencyA.id,
      operationA.id,
      issueA.id,
      {
        status: IssueStatus.OPEN,
      },
      userA.id
    );

    assert(reopenedIssue.status === IssueStatus.OPEN, "Issue reopened to status OPEN");
    assert(reopenedIssue.resolvedAt === null, "resolvedAt cleared upon reopening");

    // Verify timeline event
    const eventsAfterReopen = await operationsService.getTimeline(agencyA.id, operationA.id);
    const reopenEvent = eventsAfterReopen.find((e) => e.eventType === "ISSUE_REOPENED");
    assert(reopenEvent !== undefined, "ISSUE_REOPENED timeline audit event logged");

    // Verify readiness is re-blocked
    const readinessAfterReopen = await operationsService.calculateReadiness(
      agencyA.id,
      operationA.id
    );
    assert(readinessAfterReopen.isReady === false, "Reopened HIGH issue re-blocks readiness (isReady: false)");

    // -------------------------------------------------------------
    // TEST 8: Closure Workflow (OPEN -> CLOSED)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 8: Closure Workflow (Terminal Settlement)...");

    const closedIssue = await operationsService.updateIssue(
      agencyA.id,
      operationA.id,
      issueA.id,
      {
        status: IssueStatus.CLOSED,
        resolution: "Flight landed and guest safely transferred. Ticket closed.",
      },
      userA.id
    );

    assert(closedIssue.status === IssueStatus.CLOSED, "Issue status transitioned to CLOSED");
    assert(closedIssue.resolvedAt !== null, "resolvedAt populated on closure");

    // Verify timeline event
    const eventsAfterClose = await operationsService.getTimeline(agencyA.id, operationA.id);
    const closeEvent = eventsAfterClose.find((e) => e.eventType === "ISSUE_CLOSED");
    assert(closeEvent !== undefined, "ISSUE_CLOSED timeline audit event logged");

    // -------------------------------------------------------------
    // TEST 9: Agency-Wide Issue Listing & KPI Aggregations
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 9: Agency-Wide Issues Listing & KPI Aggregations...");

    // Create a 2nd issue (CRITICAL) and a 3rd issue (LOW)
    const issueA2 = await operationsService.createIssue(
      agencyA.id,
      operationA.id,
      {
        title: "Villa AC breakdown reported by guest",
        description: "Pool Villa AC not cooling. Hotel engineering dispatched.",
        priority: IssuePriority.CRITICAL,
        assignedTo: "Hotel Liaison",
      },
      userA.id
    );

    const issueA3 = await operationsService.createIssue(
      agencyA.id,
      operationA.id,
      {
        title: "Guest requested extra breakfast fruit platter",
        description: "Preference noted for all 3 mornings.",
        priority: IssuePriority.LOW,
      },
      userA.id
    );

    const agencyIssues = await operationsService.listAgencyIssues(agencyA.id);
    assert(agencyIssues.summary.total === 3, "Total agency issues count is 3");
    assert(agencyIssues.summary.critical === 1, "Critical active issues count is 1");
    assert(agencyIssues.summary.open === 2, "Open active issues count is 2 (issueA2 and issueA3)");
    assert(agencyIssues.summary.resolved === 1, "Resolved issues count is 1 (closed issueA)");

    // Test filter by priority = CRITICAL
    const criticalFiltered = await operationsService.listAgencyIssues(agencyA.id, {
      priority: IssuePriority.CRITICAL,
    });
    assert(criticalFiltered.issues.length === 1, "Priority filter returned 1 critical issue");
    assert(criticalFiltered.issues[0].id === issueA2.id, "Correct critical issue returned");

    // Test search by keyword
    const searchFiltered = await operationsService.listAgencyIssues(agencyA.id, {
      search: "fruit platter",
    });
    assert(searchFiltered.issues.length === 1, "Search returned 1 matching issue");
    assert(searchFiltered.issues[0].id === issueA3.id, "Correct search match returned");

    // -------------------------------------------------------------
    // TEST 10: Multi-Tenant Security & IDOR Enforcement
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 10: Multi-Tenant Security & Isolation Enforcement...");

    // Agency B cannot query Agency A's issues
    const agencyBIssues = await operationsService.listAgencyIssues(agencyB.id);
    assert(agencyBIssues.summary.total === 0, "Agency B has 0 issues (Agency A issues isolated)");

    // Agency B cannot read Agency A's issue
    let agencyBReadBlocked = false;
    try {
      await operationsService.getIssue(agencyB.id, operationA.id, issueA.id);
    } catch {
      agencyBReadBlocked = true;
    }
    assert(agencyBReadBlocked, "Agency B blocked from reading Agency A's issue");

    // Agency B cannot modify Agency A's issue
    let agencyBUpdateBlocked = false;
    try {
      await operationsService.updateIssue(
        agencyB.id,
        operationA.id,
        issueA.id,
        { status: IssueStatus.OPEN },
        userB.id
      );
    } catch {
      agencyBUpdateBlocked = true;
    }
    assert(agencyBUpdateBlocked, "Agency B blocked from modifying Agency A's issue");

    // Agency B cannot create issue on Agency A's operation
    let agencyBCreateBlocked = false;
    try {
      await operationsService.createIssue(
        agencyB.id,
        operationA.id,
        {
          title: "Malicious cross-tenant issue",
          description: "Should fail",
          priority: IssuePriority.HIGH,
        },
        userB.id
      );
    } catch {
      agencyBCreateBlocked = true;
    }
    assert(agencyBCreateBlocked, "Agency B blocked from creating issue on Agency A's operation");

    // -------------------------------------------------------------
    // TEARDOWN
    // -------------------------------------------------------------
    console.log("\n🧹 Cleaning up Phase 10.13E test records...");
    await prisma.operationEvent.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.operationalIssue.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.hotelConfirmation.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.tripOperation.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.tripHotel.deleteMany({
      where: { tripId: tripA.id },
    });
    await prisma.trip.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.hotel.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.supplier.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.customer.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.user.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.agency.deleteMany({
      where: { id: { in: [agencyA.id, agencyB.id] } },
    });

    console.log("  ✓ Teardown complete.\n");

    console.log("══════════════════════════════════════════════════════════════");
    console.log("🎉 ALL 30 PHASE 10.13E INTEGRATION TESTS PASSED (100% SUCCESS)!");
    console.log("══════════════════════════════════════════════════════════════\n");
  } catch (error) {
    console.error("❌ TEST FAILED:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase1013ETests();
