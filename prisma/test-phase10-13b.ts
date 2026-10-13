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
  OperationStatus,
  ConfirmationStatus,
  DispatchStatus,
  IssuePriority,
  IssueStatus,
  TripStatus,
} from "@prisma/client";

async function runPhase1013BTests() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING PHASE 10.13B INTEGRATION TEST SUITE (Operations UI & API)");
  console.log("══════════════════════════════════════════════════════════════\n");

  const timestamp = Date.now();
  const agencyA_Email = `ops-13b-a-${timestamp}@test.com`;
  const agencyB_Email = `ops-13b-b-${timestamp}@test.com`;

  // 1. Setup Test Agencies & Users
  const agencyA = await prisma.agency.create({
    data: {
      name: `Ops 13B Agency A-${timestamp}`,
      email: agencyA_Email,
      phone: "+919876543210",
      status: "ACTIVE",
    },
  });

  const agencyB = await prisma.agency.create({
    data: {
      name: `Ops 13B Agency B-${timestamp}`,
      email: agencyB_Email,
      phone: "+919876543211",
      status: "ACTIVE",
    },
  });

  const userA = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `ops-13b-user-a-${timestamp}@test.com`,
      name: "Ops Manager A",
      role: "AGENCY_OWNER",
      agencyId: agencyA.id,
    },
  });

  const userB = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `ops-13b-user-b-${timestamp}@test.com`,
      name: "Ops Manager B",
      role: "AGENCY_OWNER",
      agencyId: agencyB.id,
    },
  });

  console.log(`✅ Test Agencies initialized: ${agencyA.name} and ${agencyB.name}`);

  let passedAssertions = 0;
  function assert(condition: boolean, message: string) {
    if (!condition) {
      console.error(`❌ Assertion Failed: ${message}`);
      throw new Error(`Assertion Failed: ${message}`);
    }
    passedAssertions++;
    console.log(`  ✓ ${message}`);
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Setup Customer, Hotel Master, and Trip with Items
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 1: Setup Customer, Trip & Inventory for Operations...");

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: "Aarav Mehta",
        email: `aarav-${timestamp}@example.com`,
        phone: "+919822334455",
      },
    });

    const hotelMasterA = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        name: "Taj Lake Palace, Udaipur",
        city: "Udaipur",
        state: "Rajasthan",
      },
    });

    const vehicleMasterA = await prisma.vehicle.create({
      data: {
        agencyId: agencyA.id,
        name: "Toyota Innova Crysta Luxury",
        type: "SUV",
        registrationNumber: "RJ 27 CC 1234",
      },
    });

    const activityMasterA = await prisma.activity.create({
      data: {
        agencyId: agencyA.id,
        name: "Lake Pichola Sunset Boat Cruise",
        location: "Udaipur",
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-13B-${timestamp}-01`,
        title: "Udaipur Royal Heritage Experience",
        startDate: new Date("2026-11-10"),
        endDate: new Date("2026-11-15"),
        status: TripStatus.CONFIRMED,
      },
    });

    const tripHotelA = await prisma.tripHotel.create({
      data: {
        tripId: tripA.id,
        hotelId: hotelMasterA.id,
        roomType: "Palace Lake View Suite",
        checkIn: new Date("2026-11-10"),
        checkOut: new Date("2026-11-15"),
        rooms: 1,
        nightlyRate: 35000,
        totalAmount: 175000,
      },
    });

    const tripVehicleA = await prisma.tripVehicle.create({
      data: {
        tripId: tripA.id,
        vehicleId: vehicleMasterA.id,
        vehicleName: "Toyota Innova Crysta Luxury",
        vehicleType: "SUV",
        startDate: new Date("2026-11-10"),
        endDate: new Date("2026-11-15"),
        pickupLocation: "Udaipur Airport (UDR)",
        dropLocation: "Taj Lake Palace",
        totalRate: 18000,
      },
    });

    const tripActivityA = await prisma.tripActivity.create({
      data: {
        tripId: tripA.id,
        activityId: activityMasterA.id,
        name: "Lake Pichola Sunset Boat Cruise",
        date: new Date("2026-11-12"),
        time: "05:00 PM",
        numberOfParticipants: 2,
        totalPrice: 4500,
      },
    });

    const bookingA = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA.id,
        customerId: customerA.id,
        bookingNumber: `BK-13B-${timestamp}-01`,
        totalAmount: 197500,
        paidAmount: 100000,
        balanceAmount: 97500,
        status: "CONFIRMED",
      },
    });

    assert(tripA.id !== undefined, "Trip and child inventory components created");

    // -------------------------------------------------------------
    // TEST 2: Initialize Operation and Verify Component Hydration
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 2: Initialize Operation and Component Hydration...");

    const operationA = await operationsService.initializeOperation(
      agencyA.id,
      {
        tripId: tripA.id,
        bookingId: bookingA.id,
        status: OperationStatus.PREPARING,
      },
      userA.id
    );

    assert(operationA.id !== undefined, "Operation created with valid ID");
    assert(operationA.status === OperationStatus.PREPARING, "Operation status is PREPARING");
    assert(operationA.hotelConfirmations.length === 1, "Hotel confirmation auto-hydrated");
    assert(operationA.vehicleDispatches.length === 1, "Vehicle dispatch auto-hydrated");
    assert(operationA.activityConfirmations.length === 1, "Activity confirmation auto-hydrated");
    assert(operationA.events.length >= 1, "Initial audit timeline event logged");

    // -------------------------------------------------------------
    // TEST 3: Calculate Initial Readiness
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 3: Readiness Score Calculation (Unconfirmed State)...");

    const initialReadiness = await operationsService.calculateReadiness(agencyA.id, operationA.id);
    assert(initialReadiness.score === 25, "Initial readiness score is 25% (0/1 hotels, 0/1 fleet, 0/1 activities, 0 open critical issues)");
    assert(initialReadiness.isReady === false, "isReady flag is false");

    // -------------------------------------------------------------
    // TEST 4: Hotel Confirmation & Voucher Update
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 4: Hotel Confirmation & Voucher Assignment...");

    const hotelConf = operationA.hotelConfirmations[0];
    const updatedHotel = await operationsService.updateHotelConfirmation(
      agencyA.id,
      operationA.id,
      hotelConf.id,
      {
        confirmationNumber: "TAJ-UDR-CONF-9921",
        status: ConfirmationStatus.CONFIRMED,
        roomDetails: "Palace Lake View Suite (Confirmed)",
      },
      userA.id
    );

    assert(updatedHotel.status === ConfirmationStatus.CONFIRMED, "Hotel status updated to CONFIRMED");
    assert(updatedHotel.confirmationNumber === "TAJ-UDR-CONF-9921", "Hotel confirmation number recorded");

    // -------------------------------------------------------------
    // TEST 5: Vehicle Dispatch & Chauffeur Assignment
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 5: Vehicle Dispatch & Driver Allocation...");

    const vehicleDispatch = operationA.vehicleDispatches[0];
    const updatedDispatch = await operationsService.updateVehicleDispatch(
      agencyA.id,
      operationA.id,
      vehicleDispatch.id,
      {
        driverName: "Vikram Singh",
        driverPhone: "+91 94140 12345",
        vehicleNumber: "RJ 27 CC 1234",
        status: DispatchStatus.CONFIRMED,
        pickupTime: "10:30 AM",
      },
      userA.id
    );

    assert(updatedDispatch.status === DispatchStatus.CONFIRMED, "Vehicle dispatch status updated to CONFIRMED");
    assert(updatedDispatch.driverName === "Vikram Singh", "Driver Vikram Singh assigned");

    // -------------------------------------------------------------
    // TEST 6: Activity Confirmation & Ticket Issuance
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 6: Activity Confirmation & Ticket Number Issuance...");

    const activityConf = operationA.activityConfirmations[0];
    const updatedActivity = await operationsService.updateActivityConfirmation(
      agencyA.id,
      operationA.id,
      activityConf.id,
      {
        confirmationNumber: "CRUISE-PICHOLA-001",
        ticketNumber: "TKT-BOAT-7788",
        status: ConfirmationStatus.CONFIRMED,
      },
      userA.id
    );

    assert(updatedActivity.status === ConfirmationStatus.CONFIRMED, "Activity status updated to CONFIRMED");
    assert(updatedActivity.ticketNumber === "TKT-BOAT-7788", "Ticket number TKT-BOAT-7788 issued");

    // -------------------------------------------------------------
    // TEST 7: 100% Readiness Verification
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 7: Verify 100% Operational Readiness...");

    const fullReadiness = await operationsService.calculateReadiness(agencyA.id, operationA.id);
    assert(fullReadiness.score === 100, "Readiness score is 100%");
    assert(fullReadiness.isReady === true, "isReady flag is true");
    assert(fullReadiness.confirmedHotels === 1, "1/1 hotels confirmed");
    assert(fullReadiness.confirmedVehicles === 1, "1/1 vehicles assigned/confirmed");
    assert(fullReadiness.confirmedActivities === 1, "1/1 activities confirmed");

    // -------------------------------------------------------------
    // TEST 8: Operational Issue Creation & Resolution Flow
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 8: Operational Issue Tracking & Resolution Flow...");

    const issue = await operationsService.createIssue(
      agencyA.id,
      operationA.id,
      {
        title: "Guest requested airport pickup 30 mins earlier",
        description: "Flight arriving at 10:00 AM instead of 10:30 AM",
        priority: IssuePriority.HIGH,
        assignedTo: "Fleet Coordinator",
        reportedBy: "Guest WhatsApp",
      },
      userA.id
    );

    assert(issue.status === IssueStatus.OPEN, "Issue opened with status OPEN");
    assert(issue.priority === IssuePriority.HIGH, "Issue priority set to HIGH");

    // Resolve issue
    const resolvedIssue = await operationsService.updateIssue(
      agencyA.id,
      operationA.id,
      issue.id,
      {
        status: IssueStatus.RESOLVED,
        resolution: "Driver Vikram Singh notified and schedule adjusted to 10:00 AM pickup.",
      },
      userA.id
    );

    assert(resolvedIssue.status === IssueStatus.RESOLVED, "Issue marked as RESOLVED");
    assert(resolvedIssue.resolvedAt !== null, "resolvedAt timestamp populated");

    // -------------------------------------------------------------
    // TEST 9: Status Transition & Timeline Event Verification
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 9: Operation Status Transitions & Audit Events...");

    await operationsService.updateOperation(
      agencyA.id,
      operationA.id,
      { status: OperationStatus.READY },
      userA.id
    );

    await operationsService.updateOperation(
      agencyA.id,
      operationA.id,
      { status: OperationStatus.ONGOING },
      userA.id
    );

    const timeline = await operationsService.getTimeline(agencyA.id, operationA.id);
    assert(timeline.length >= 6, "Audit timeline recorded all operational events (>= 6 events logged)");

    // -------------------------------------------------------------
    // TEST 10: Multi-Tenant Security & Isolation
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 10: Multi-Tenant Security & Isolation Enforcement...");

    let unauthorizedBlocked = false;
    try {
      // Agency B attempts to access Agency A's operation
      await operationsService.getOperationById(agencyB.id, operationA.id);
    } catch {
      unauthorizedBlocked = true;
    }
    assert(unauthorizedBlocked, "Agency B blocked from reading Agency A's operation");

    let crossTenantUpdateBlocked = false;
    try {
      // Agency B attempts to update Agency A's hotel confirmation
      await operationsService.updateHotelConfirmation(
        agencyB.id,
        operationA.id,
        hotelConf.id,
        { status: ConfirmationStatus.CANCELLED }
      );
    } catch {
      crossTenantUpdateBlocked = true;
    }
    assert(crossTenantUpdateBlocked, "Agency B blocked from modifying Agency A's hotel confirmation");

    // -------------------------------------------------------------
    // Clean up
    // -------------------------------------------------------------
    console.log("\n🧹 Cleaning up Phase 10.13B test records...");
    await prisma.operationEvent.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.operationalIssue.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.activityConfirmation.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.vehicleDispatch.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.hotelConfirmation.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.tripOperation.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.booking.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.tripActivity.deleteMany({ where: { tripId: tripA.id } });
    await prisma.tripVehicle.deleteMany({ where: { tripId: tripA.id } });
    await prisma.tripHotel.deleteMany({ where: { tripId: tripA.id } });
    await prisma.trip.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.activity.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.vehicle.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.hotel.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.customer.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await prisma.agency.deleteMany({ where: { id: { in: [agencyA.id, agencyB.id] } } });
    console.log("  ✓ Teardown complete.");

    console.log("\n══════════════════════════════════════════════════════════════");
    console.log(`🎉 ALL ${passedAssertions} PHASE 10.13B INTEGRATION TESTS PASSED (100% SUCCESS)!`);
    console.log("══════════════════════════════════════════════════════════════\n");
  } catch (err) {
    console.error("❌ TEST FAILED:", err);
    throw err;
  }
}

runPhase1013BTests()
  .catch(() => process.exit(1))
  .finally(async () => {
    await prisma.$disconnect();
  });
