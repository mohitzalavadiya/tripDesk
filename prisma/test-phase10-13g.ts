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
import { operationsDocumentService } from "../src/lib/services/operations-document-service";
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

async function runPhase1013GTests() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING PHASE 10.13G TEST SUITE (Activities Operational Workflow)");
  console.log("══════════════════════════════════════════════════════════════\n");

  const timestamp = Date.now();
  const agencyA_Email = `ops-13g-a-${timestamp}@test.com`;
  const agencyB_Email = `ops-13g-b-${timestamp}@test.com`;

  // 1. Create two test agencies for multi-tenant isolation testing
  const agencyA = await prisma.agency.create({
    data: {
      name: `Ops 13G Agency A-${timestamp}`,
      email: agencyA_Email,
      phone: "+91 98800 22334",
      address: "100 MG Road, Bangalore, India",
      status: "ACTIVE",
    },
  });

  const agencyB = await prisma.agency.create({
    data: {
      name: `Ops 13G Agency B-${timestamp}`,
      email: agencyB_Email,
      phone: "+91 98800 22335",
      status: "ACTIVE",
    },
  });

  const userA = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `ops-lead-13g-a-${timestamp}@tripdesk-test.com`,
      agencyId: agencyA.id,
      name: "Activities Ops Lead A",
      role: "AGENCY_OWNER",
    },
  });

  const userB = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `ops-lead-13g-b-${timestamp}@tripdesk-test.com`,
      agencyId: agencyB.id,
      name: "Activities Ops Lead B",
      role: "AGENCY_OWNER",
    },
  });

  console.log(`✅ Test Agencies initialized: ${agencyA.name} and ${agencyB.name}\n`);

  try {
    // -------------------------------------------------------------
    // TEST 1: Setup Customer, Confirmed Tour & Activities Inventory
    // -------------------------------------------------------------
    console.log("🧪 Running Test 1: Setup Customer, Tour & Activities Inventory...");

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: "Rahul & Sneha Kapoor",
        email: `rahul-${timestamp}@kapoor.in`,
        phone: "+91 98765 43210",
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-13G-${timestamp}-01`,
        title: "Goa Watersports, Scuba & Sunset Catamaran Cruise",
        startDate: new Date("2026-11-15T09:00:00Z"),
        endDate: new Date("2026-11-20T18:00:00Z"),
        status: TripStatus.CONFIRMED,
      },
    });

    // Add Travelers
    await prisma.traveler.createMany({
      data: [
        { tripId: tripA.id, name: "Rahul Kapoor", type: "ADULT", gender: "MALE" },
        { tripId: tripA.id, name: "Sneha Kapoor", type: "ADULT", gender: "FEMALE" },
      ],
    });

    // Add Excursion Supplier & Activity Master
    const supplierA = await prisma.supplier.create({
      data: {
        agencyId: agencyA.id,
        name: "Goa Aqua Adventures & Scuba Diving",
        type: "ACTIVITY",
        contactPerson: "Captain Ronald D'Souza",
        phone: "+91 832 2456789",
      },
    });

    const activityMasterA = await prisma.activity.create({
      data: {
        agencyId: agencyA.id,
        supplierId: supplierA.id,
        name: "Grande Island Scuba Diving & Dolphin Cruise",
        location: "Sinquerim Boat Jetty, Candolim, Goa",
        description: "PADI certified dive instructor, underwater video/photos, and equipment included.",
        duration: "4 Hours",
      },
    });

    const tripActivityA = await prisma.tripActivity.create({
      data: {
        tripId: tripA.id,
        activityId: activityMasterA.id,
        name: "Grande Island Scuba Diving & Dolphin Cruise",
        date: new Date("2026-11-16T08:30:00Z"),
        time: "08:30 AM",
        location: "Sinquerim Boat Jetty, Candolim, Goa",
        numberOfParticipants: 2,
        totalPrice: 7000,
      },
    });

    assert(tripActivityA.id !== undefined, "Trip activity record created successfully");

    // -------------------------------------------------------------
    // TEST 2: Initialize Operation & Auto-Hydration
    // -------------------------------------------------------------
    console.log("🧪 Running Test 2: Initialize Operation & Auto-Hydrate Activity Confirmation...");

    const opA = await operationsService.initializeOperation(agencyA.id, {
      tripId: tripA.id,
      status: OperationStatus.PREPARING,
    });
    assert(opA.id !== undefined, "Operation created successfully");

    const actConfA = await prisma.activityConfirmation.findFirst({
      where: { tripOperationId: opA.id, tripActivityId: tripActivityA.id },
    });
    assert(actConfA !== null, "Activity confirmation automatically hydrated");
    assert(actConfA!.status === ConfirmationStatus.PENDING, "Initial activity status is PENDING");
    assert(actConfA!.confirmationNumber === null, "Initial confirmation number is null");

    // -------------------------------------------------------------
    // TEST 3: Activity Request Workflow (PENDING -> REQUESTED)
    // -------------------------------------------------------------
    console.log("🧪 Running Test 3: Activity Request Workflow (PENDING -> REQUESTED)...");

    const requestedAct = await operationsService.updateActivityConfirmation(
      agencyA.id,
      opA.id,
      actConfA!.id,
      {
        status: ConfirmationStatus.REQUESTED,
        supplierNotes: "Dive slot reservation request sent to Capt. Ronald via operations desk.",
      },
      userA.id
    );

    assert(requestedAct.status === ConfirmationStatus.REQUESTED, "Status updated to REQUESTED");
    assert(requestedAct.supplierNotes?.includes("Capt. Ronald") === true, "Supplier notes recorded");

    const reqEvent = await prisma.operationEvent.findFirst({
      where: { tripOperationId: opA.id, eventType: "ACTIVITY_REQUESTED" },
    });
    assert(reqEvent !== null, "ACTIVITY_REQUESTED timeline audit event logged");

    // -------------------------------------------------------------
    // TEST 4: Activity Confirmation Workflow (REQUESTED -> CONFIRMED)
    // -------------------------------------------------------------
    console.log("🧪 Running Test 4: Activity Confirmation Workflow (REQUESTED -> CONFIRMED)...");

    const confirmedAct = await operationsService.updateActivityConfirmation(
      agencyA.id,
      opA.id,
      actConfA!.id,
      {
        status: ConfirmationStatus.CONFIRMED,
        confirmationNumber: "GOA-DIVE-9900",
        ticketNumber: "TKT-PADI-88221",
        supplierNotes: "Confirmed for 08:30 AM slot. Arrive 15 mins prior with swimwear.",
      },
      userA.id
    );

    assert(confirmedAct.status === ConfirmationStatus.CONFIRMED, "Status updated to CONFIRMED");
    assert(confirmedAct.confirmationNumber === "GOA-DIVE-9900", "Confirmation reference saved");
    assert(confirmedAct.ticketNumber === "TKT-PADI-88221", "E-Ticket / Pass number saved");
    assert(confirmedAct.confirmedAt !== null, "confirmedAt timestamp recorded");

    const confEvent = await prisma.operationEvent.findFirst({
      where: { tripOperationId: opA.id, eventType: "ACTIVITY_CONFIRMED" },
    });
    assert(confEvent !== null, "ACTIVITY_CONFIRMED timeline audit event logged");

    // -------------------------------------------------------------
    // TEST 5: Readiness Score Calculation with Confirmed Activity
    // -------------------------------------------------------------
    console.log("🧪 Running Test 5: Operational Readiness Calculation with Confirmed Activity...");

    const readiness1 = await operationsService.calculateReadiness(agencyA.id, opA.id);
    assert(readiness1.totalActivities === 1, "Total activities is 1");
    assert(readiness1.confirmedActivities === 1, "Confirmed activities is 1");
    assert(readiness1.isReady === true, "Operational readiness isReady is true");
    assert(readiness1.score === 100, "Readiness score is 100%");

    // -------------------------------------------------------------
    // TEST 6: Activity Amendment Workflow (CONFIRMED -> AMENDED)
    // -------------------------------------------------------------
    console.log("🧪 Running Test 6: Activity Amendment Workflow (CONFIRMED -> AMENDED)...");

    const amendedAct = await operationsService.updateActivityConfirmation(
      agencyA.id,
      opA.id,
      actConfA!.id,
      {
        status: ConfirmationStatus.AMENDED,
        time: "10:00 AM",
        location: "Baga Beach Water Sports Center",
        supplierNotes: "Shifted to 10:00 AM due to morning high tide conditions.",
      },
      userA.id
    );

    assert(amendedAct.status === ConfirmationStatus.AMENDED, "Status updated to AMENDED");

    // Verify underlying tripActivity was updated
    const updatedTripAct = await prisma.tripActivity.findUnique({
      where: { id: tripActivityA.id },
    });
    assert(updatedTripAct?.time === "10:00 AM", "TripActivity time updated to 10:00 AM");
    assert(updatedTripAct?.location === "Baga Beach Water Sports Center", "TripActivity location updated");

    const amendEvent = await prisma.operationEvent.findFirst({
      where: { tripOperationId: opA.id, eventType: "ACTIVITY_AMENDED" },
    });
    assert(amendEvent !== null, "ACTIVITY_AMENDED timeline audit event logged");

    // Verify amended activity still counts towards readiness as scheduled
    const readiness2 = await operationsService.calculateReadiness(agencyA.id, opA.id);
    assert(readiness2.confirmedActivities === 1, "Amended activity remains counted as scheduled in readiness");

    // -------------------------------------------------------------
    // TEST 7: Reconfirmation Workflow (AMENDED -> CONFIRMED)
    // -------------------------------------------------------------
    console.log("🧪 Running Test 7: Reconfirmation Workflow (AMENDED -> CONFIRMED)...");

    const reconfirmedAct = await operationsService.updateActivityConfirmation(
      agencyA.id,
      opA.id,
      actConfA!.id,
      {
        status: ConfirmationStatus.CONFIRMED,
        confirmationNumber: "GOA-DIVE-9900-REV1",
        ticketNumber: "TKT-PADI-88221-R",
        supplierNotes: "Reconfirmed by supplier for 10:00 AM Baga Jetty.",
      },
      userA.id
    );

    assert(reconfirmedAct.status === ConfirmationStatus.CONFIRMED, "Status updated back to CONFIRMED");
    assert(reconfirmedAct.confirmationNumber === "GOA-DIVE-9900-REV1", "Revised confirmation number saved");

    // -------------------------------------------------------------
    // TEST 8: Cancellation Workflow (CONFIRMED -> CANCELLED) & Exclusion
    // -------------------------------------------------------------
    console.log("🧪 Running Test 8: Cancellation Workflow & Readiness Exclusion...");

    const cancelledAct = await operationsService.updateActivityConfirmation(
      agencyA.id,
      opA.id,
      actConfA!.id,
      {
        status: ConfirmationStatus.CANCELLED,
        cancellationReason: "Severe tropical storm warning issued by coast guard.",
      },
      userA.id
    );

    assert(cancelledAct.status === ConfirmationStatus.CANCELLED, "Status updated to CANCELLED");

    const cancelEvent = await prisma.operationEvent.findFirst({
      where: { tripOperationId: opA.id, eventType: "ACTIVITY_CANCELLED" },
    });
    assert(cancelEvent !== null, "ACTIVITY_CANCELLED timeline audit event logged");

    // Cancelled activity must be excluded from active denominator
    const readiness3 = await operationsService.calculateReadiness(agencyA.id, opA.id);
    assert(readiness3.totalActivities === 0, "Cancelled activity excluded from active denominator (total: 0)");
    assert(readiness3.isReady === true, "isReady true because 0 active activities are pending");

    // -------------------------------------------------------------
    // TEST 9: Transition Safety & Validation Rules
    // -------------------------------------------------------------
    console.log("🧪 Running Test 9: Transition Safety & Validation Rules...");

    // Rule 1: Cannot transition from CANCELLED to CONFIRMED
    let cancelReopenBlocked = false;
    try {
      await operationsService.updateActivityConfirmation(
        agencyA.id,
        opA.id,
        actConfA!.id,
        { status: ConfirmationStatus.CONFIRMED }
      );
    } catch {
      cancelReopenBlocked = true;
    }
    assert(cancelReopenBlocked, "Transition from CANCELLED to CONFIRMED strictly rejected");

    // Rule 2: Cannot confirm with empty confirmation AND ticket number
    const tripActivityB = await prisma.tripActivity.create({
      data: {
        tripId: tripA.id,
        name: "Old Goa Heritage Walk",
        date: new Date("2026-11-17T15:00:00Z"),
        numberOfParticipants: 2,
        totalPrice: 2000,
      },
    });

    const actConfB = await operationsService.createActivityConfirmation(
      agencyA.id,
      opA.id,
      { tripActivityId: tripActivityB.id, status: ConfirmationStatus.PENDING }
    );

    let emptyConfirmBlocked = false;
    try {
      await operationsService.updateActivityConfirmation(
        agencyA.id,
        opA.id,
        actConfB.id,
        {
          status: ConfirmationStatus.CONFIRMED,
          confirmationNumber: "   ",
          ticketNumber: "",
        }
      );
    } catch {
      emptyConfirmBlocked = true;
    }
    assert(emptyConfirmBlocked, "Confirming activity without reference or ticket number rejected");

    // Confirm actConfB properly for PDF tests
    await operationsService.updateActivityConfirmation(
      agencyA.id,
      opA.id,
      actConfB.id,
      {
        status: ConfirmationStatus.CONFIRMED,
        confirmationNumber: "HERITAGE-8822",
        ticketNumber: "TKT-WALK-11",
      }
    );

    // -------------------------------------------------------------
    // TEST 10: Multi-Tenant Security & Isolation Enforcement
    // -------------------------------------------------------------
    console.log("🧪 Running Test 10: Multi-Tenant Security & Isolation Enforcement...");

    // Agency B attempts to list Agency A's activity confirmations
    let crossListBlocked = false;
    try {
      await operationsService.listActivityConfirmations(agencyB.id, opA.id);
    } catch {
      crossListBlocked = true;
    }
    assert(crossListBlocked, "Agency B strictly blocked from listing Agency A's activity confirmations");

    // Agency B attempts to read Agency A's single activity confirmation
    let crossGetBlocked = false;
    try {
      await operationsService.getActivityConfirmation(agencyB.id, opA.id, actConfB.id);
    } catch {
      crossGetBlocked = true;
    }
    assert(crossGetBlocked, "Agency B strictly blocked from viewing Agency A's activity confirmation");

    // Agency B attempts to update Agency A's activity confirmation
    let crossUpdateBlocked = false;
    try {
      await operationsService.updateActivityConfirmation(
        agencyB.id,
        opA.id,
        actConfB.id,
        { supplierNotes: "Hacked by Agency B" }
      );
    } catch {
      crossUpdateBlocked = true;
    }
    assert(crossUpdateBlocked, "Agency B strictly blocked from modifying Agency A's activity confirmation");

    // Agency B attempts to generate Agency A's Activity Voucher PDF
    let crossVoucherBlocked = false;
    try {
      await operationsDocumentService.generateActivityVoucher(agencyB.id, opA.id, actConfB.id);
    } catch {
      crossVoucherBlocked = true;
    }
    assert(crossVoucherBlocked, "Agency B strictly blocked from generating Agency A's activity voucher PDF");

  } finally {
    // -------------------------------------------------------------
    // CLEANUP / TEARDOWN
    // -------------------------------------------------------------
    console.log("\n🧹 Cleaning up Phase 10.13G test records...");
    await prisma.agency.deleteMany({
      where: { id: { in: [agencyA.id, agencyB.id] } },
    });
    console.log("  ✓ Teardown complete.\n");
  }

  console.log("══════════════════════════════════════════════════════════════");
  console.log("🎉 ALL 27 PHASE 10.13G INTEGRATION TESTS PASSED (100% SUCCESS)!");
  console.log("══════════════════════════════════════════════════════════════\n");
}

runPhase1013GTests()
  .catch((err) => {
    console.error("❌ TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
