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
  TripStatus,
} from "@prisma/client";

async function runPhase1013DTests() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING PHASE 10.13D TEST SUITE (Driver / Vehicle Dispatch Workflow)");
  console.log("══════════════════════════════════════════════════════════════\n");

  const timestamp = Date.now();
  const agencyA_Email = `ops-13d-a-${timestamp}@test.com`;
  const agencyB_Email = `ops-13d-b-${timestamp}@test.com`;

  // 1. Setup Test Agencies & Users
  const agencyA = await prisma.agency.create({
    data: {
      name: `Ops 13D Agency A-${timestamp}`,
      email: agencyA_Email,
      phone: "+919876543210",
      status: "ACTIVE",
    },
  });

  const agencyB = await prisma.agency.create({
    data: {
      name: `Ops 13D Agency B-${timestamp}`,
      email: agencyB_Email,
      phone: "+919876543211",
      status: "ACTIVE",
    },
  });

  const userA = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `ops-13d-user-a-${timestamp}@test.com`,
      name: "Fleet Coordinator A",
      role: "AGENCY_OWNER",
      agencyId: agencyA.id,
    },
  });

  const userB = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `ops-13d-user-b-${timestamp}@test.com`,
      name: "Fleet Coordinator B",
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
    // TEST 1: Setup Customer, Supplier, Master Vehicles & Trips
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 1: Setup Customer, Vehicles & Confirmed Tour Itinerary...");

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: "Vikram Malhotra",
        email: `vikram-${timestamp}@example.com`,
        phone: "+919811223344",
      },
    });

    const supplierA = await prisma.supplier.create({
      data: {
        agencyId: agencyA.id,
        name: "God's Own Cabs & Luxury Coaches",
        type: "VEHICLE",
        email: `fleet-${timestamp}@godsowncabs.com`,
        phone: "+91 94470 11223",
      },
    });

    const masterVehicleA = await prisma.vehicle.create({
      data: {
        agencyId: agencyA.id,
        supplierId: supplierA.id,
        name: "Toyota Innova HyCross (7-Seater Luxury)",
        type: "SUV / MUV",
        registrationNumber: "KL 07 CC 7788",
        capacity: 7,
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-13D-${timestamp}-01`,
        title: "Kochi to Munnar Scenic Hill Journey",
        startDate: new Date("2026-11-15T09:00:00Z"),
        endDate: new Date("2026-11-18T18:00:00Z"),
        status: TripStatus.CONFIRMED,
      },
    });

    const tripVehicleA = await prisma.tripVehicle.create({
      data: {
        tripId: tripA.id,
        vehicleId: masterVehicleA.id,
        vehicleName: "Toyota Innova HyCross",
        vehicleType: "SUV / MUV",
        capacity: 7,
        startDate: new Date("2026-11-15T09:00:00Z"),
        endDate: new Date("2026-11-18T18:00:00Z"),
        pickupLocation: "Cochin International Airport (COK)",
        dropLocation: "Fragrant Nature Munnar Resort",
        pricingType: "TOTAL",
        totalRate: 18000,
      },
    });

    const bookingA = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA.id,
        customerId: customerA.id,
        bookingNumber: `BK-13D-${timestamp}-01`,
        totalAmount: 18000,
        paidAmount: 18000,
        balanceAmount: 0,
        status: "CONFIRMED",
      },
    });

    assert(tripVehicleA.id !== undefined, "Trip vehicle component created with complete itinerary route");

    // -------------------------------------------------------------
    // TEST 2: Initialize Operation and Auto-Hydrate VehicleDispatch
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 2: Initialize Operation & Verify Initial VehicleDispatch...");

    const operationA = await operationsService.initializeOperation(
      agencyA.id,
      {
        tripId: tripA.id,
        bookingId: bookingA.id,
        status: OperationStatus.PREPARING,
      },
      userA.id
    );

    assert(operationA.vehicleDispatches.length === 1, "VehicleDispatch automatically hydrated from TripVehicle");
    const initialDispatch = operationA.vehicleDispatches[0];
    assert(initialDispatch.status === DispatchStatus.PENDING, "Initial dispatch status is PENDING");
    assert(initialDispatch.driverName === null, "Initial driver name is null");

    // -------------------------------------------------------------
    // TEST 3: Workflow Step 1: Assign Driver & Vehicle (PENDING -> ASSIGNED)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 3: Assign Driver & Vehicle Workflow (PENDING -> ASSIGNED)...");

    const assignedDispatch = await operationsService.updateVehicleDispatch(
      agencyA.id,
      operationA.id,
      initialDispatch.id,
      {
        vehicleId: masterVehicleA.id,
        vehicleNumber: "KL 07 CC 7788",
        driverName: "Suresh Babu",
        driverPhone: "+91 94471 88990",
        pickupTime: "09:30 AM",
        notes: "Chauffeur assigned. Uniformed driver with airport placard.",
        status: DispatchStatus.ASSIGNED,
      },
      userA.id
    );

    assert(assignedDispatch.status === DispatchStatus.ASSIGNED, "Dispatch status updated to ASSIGNED");
    assert(assignedDispatch.driverName === "Suresh Babu", "Driver name assigned");
    assert(assignedDispatch.driverPhone === "+91 94471 88990", "Driver phone assigned");
    assert(assignedDispatch.vehicleNumber === "KL 07 CC 7788", "Vehicle plate number assigned");

    // Verify timeline event
    const eventsAfterAssign = await operationsService.getTimeline(agencyA.id, operationA.id);
    const assignEvent = eventsAfterAssign.find((e) => e.eventType === "VEHICLE_ASSIGNED");
    assert(assignEvent !== undefined, "VEHICLE_ASSIGNED timeline audit event logged");

    // -------------------------------------------------------------
    // TEST 4: Workflow Step 2: Confirm Dispatch (ASSIGNED -> CONFIRMED)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 4: Confirm Dispatch Workflow (ASSIGNED -> CONFIRMED)...");

    const confirmedDispatch = await operationsService.updateVehicleDispatch(
      agencyA.id,
      operationA.id,
      initialDispatch.id,
      {
        status: DispatchStatus.CONFIRMED,
        notes: "Confirmed with driver Suresh Babu. Chauffeur notified of flight details.",
      },
      userA.id
    );

    assert(confirmedDispatch.status === DispatchStatus.CONFIRMED, "Dispatch status updated to CONFIRMED");

    // Verify timeline event
    const eventsAfterConfirm = await operationsService.getTimeline(agencyA.id, operationA.id);
    const confirmEvent = eventsAfterConfirm.find((e) => e.eventType === "VEHICLE_CONFIRMED");
    assert(confirmEvent !== undefined, "VEHICLE_CONFIRMED timeline audit event logged");

    // Verify readiness calculation
    const readinessAfterConfirm = await operationsService.calculateReadiness(agencyA.id, operationA.id);
    assert(readinessAfterConfirm.confirmedVehicles === 1, "1/1 vehicles confirmed in readiness summary");
    assert(readinessAfterConfirm.isReady === true, "Operational readiness isReady is true");

    // -------------------------------------------------------------
    // TEST 5: Workflow Step 3: Start Duty / Dispatched (CONFIRMED -> ON_DUTY)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 5: Start Duty Workflow (CONFIRMED -> ON_DUTY)...");

    const onDutyDispatch = await operationsService.updateVehicleDispatch(
      agencyA.id,
      operationA.id,
      initialDispatch.id,
      {
        status: DispatchStatus.ON_DUTY,
        notes: "Driver reported on duty outside Kochi Airport Terminal 3.",
      },
      userA.id
    );

    assert(onDutyDispatch.status === DispatchStatus.ON_DUTY, "Dispatch status updated to ON_DUTY");

    // Verify timeline event
    const eventsAfterOnDuty = await operationsService.getTimeline(agencyA.id, operationA.id);
    const onDutyEvent = eventsAfterOnDuty.find((e) => e.eventType === "VEHICLE_DISPATCHED");
    assert(onDutyEvent !== undefined, "VEHICLE_DISPATCHED timeline audit event logged");

    // -------------------------------------------------------------
    // TEST 6: Workflow Step 4: Complete Duty (ON_DUTY -> COMPLETED)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 6: Complete Duty Workflow (ON_DUTY -> COMPLETED)...");

    const completedDispatch = await operationsService.updateVehicleDispatch(
      agencyA.id,
      operationA.id,
      initialDispatch.id,
      {
        status: DispatchStatus.COMPLETED,
        notes: "Guests dropped safely at Fragrant Nature Munnar Resort.",
      },
      userA.id
    );

    assert(completedDispatch.status === DispatchStatus.COMPLETED, "Dispatch status updated to COMPLETED");

    // Verify timeline event
    const eventsAfterComplete = await operationsService.getTimeline(agencyA.id, operationA.id);
    const completeEvent = eventsAfterComplete.find((e) => e.eventType === "VEHICLE_COMPLETED");
    assert(completeEvent !== undefined, "VEHICLE_COMPLETED timeline audit event logged");

    // -------------------------------------------------------------
    // TEST 7: Workflow Step 5: Cancellation & Reinstatement
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 7: Cancellation & Record Retention Workflow...");

    // Create a 2nd trip vehicle to test cancellation
    const tripVehicle2 = await prisma.tripVehicle.create({
      data: {
        tripId: tripA.id,
        vehicleName: "Supplementary Luggage Van",
        vehicleType: "Van",
        startDate: new Date("2026-11-15T09:00:00Z"),
        endDate: new Date("2026-11-15T14:00:00Z"),
        pricingType: "TOTAL",
        totalRate: 3000,
      },
    });

    const dispatch2 = await operationsService.createVehicleDispatch(
      agencyA.id,
      operationA.id,
      {
        tripVehicleId: tripVehicle2.id,
        driverName: "Anil Kumar",
        driverPhone: "+91 94470 55443",
        status: DispatchStatus.ASSIGNED,
      },
      userA.id
    );

    const cancelledDispatch = await operationsService.updateVehicleDispatch(
      agencyA.id,
      operationA.id,
      dispatch2.id,
      {
        status: DispatchStatus.CANCELLED,
        notes: "Luggage van cancelled by customer.",
      },
      userA.id
    );

    assert(cancelledDispatch.status === DispatchStatus.CANCELLED, "Status updated to CANCELLED");
    assert(cancelledDispatch.id === dispatch2.id, "Record preserved in database (not physically deleted)");

    const eventsAfterCancel = await operationsService.getTimeline(agencyA.id, operationA.id);
    const cancelEvent = eventsAfterCancel.find((e) => e.eventType === "VEHICLE_CANCELLED");
    assert(cancelEvent !== undefined, "VEHICLE_CANCELLED timeline audit event logged");

    // Verify readiness excludes cancelled dispatch
    const readinessAfterCancel = await operationsService.calculateReadiness(agencyA.id, operationA.id);
    assert(readinessAfterCancel.totalVehicles === 1, "Cancelled vehicle excluded from active vehicle count");
    assert(readinessAfterCancel.isReady === true, "isReady true because 1/1 active vehicles are completed");

    // -------------------------------------------------------------
    // TEST 8: Validation & Status Transition Safety
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 8: Status Transition Safety & Driver Validation...");

    // 8a. Invalid jump from COMPLETED -> ON_DUTY
    let invalidJumpBlocked = false;
    try {
      await operationsService.updateVehicleDispatch(
        agencyA.id,
        operationA.id,
        initialDispatch.id,
        { status: DispatchStatus.ON_DUTY }
      );
    } catch (e: any) {
      invalidJumpBlocked = e.message.includes("Invalid dispatch status transition");
    }
    assert(invalidJumpBlocked, "Invalid transition from COMPLETED to ON_DUTY rejected");

    // 8b. Empty driver name rejected on assignment
    let emptyDriverBlocked = false;
    try {
      await operationsService.updateVehicleDispatch(
        agencyA.id,
        operationA.id,
        dispatch2.id,
        {
          status: DispatchStatus.ASSIGNED,
          driverName: "   ",
        }
      );
    } catch (e: any) {
      emptyDriverBlocked = e.message.includes("Driver name cannot be empty");
    }
    assert(emptyDriverBlocked, "Empty driver name rejected on assignment");

    // -------------------------------------------------------------
    // TEST 9: Vehicle Conflict Detection
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 9: Vehicle Schedule Conflict Detection...");

    // Create a 2nd operation on the same agency with overlapping date
    const tripA2 = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-13D-${timestamp}-02`,
        title: "Kochi City Tour",
        startDate: new Date("2026-11-15T09:00:00Z"),
        endDate: new Date("2026-11-15T18:00:00Z"),
        status: TripStatus.CONFIRMED,
      },
    });

    const tripVehicleA2 = await prisma.tripVehicle.create({
      data: {
        tripId: tripA2.id,
        vehicleName: "Sedan Car",
        vehicleType: "Sedan",
        startDate: new Date("2026-11-15T09:00:00Z"),
      },
    });

    const operationA2 = await operationsService.initializeOperation(
      agencyA.id,
      { tripId: tripA2.id, status: OperationStatus.PREPARING },
      userA.id
    );

    const dispatchForConflictTest = operationA2.vehicleDispatches[0];

    let conflictDetected = false;
    try {
      // Try assigning masterVehicleA (which was on duty on 2026-11-15) as active ASSIGNED
      // First set dispatch2 (on operationA) to active ASSIGNED on same date with masterVehicleA
      await operationsService.updateVehicleDispatch(
        agencyA.id,
        operationA.id,
        dispatch2.id,
        {
          vehicleId: masterVehicleA.id,
          pickupDate: new Date("2026-11-15T10:00:00Z"),
          driverName: "Ramesh Sharma",
          status: DispatchStatus.ASSIGNED,
        },
        userA.id
      );

      // Now attempt assigning masterVehicleA on operationA2 on the same day
      await operationsService.updateVehicleDispatch(
        agencyA.id,
        operationA2.id,
        dispatchForConflictTest.id,
        {
          vehicleId: masterVehicleA.id,
          pickupDate: new Date("2026-11-15T12:00:00Z"),
          driverName: "Praveen Nair",
          status: DispatchStatus.ASSIGNED,
        },
        userA.id
      );
    } catch (e: any) {
      conflictDetected = e.message.includes("already assigned to another active trip");
    }
    assert(conflictDetected, "Vehicle schedule conflict correctly flagged and prevented");

    // -------------------------------------------------------------
    // TEST 10: Multi-Tenant Security & Isolation
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 10: Multi-Tenant Security Enforcement...");

    // 10a. Agency B cannot read Agency A dispatch
    let crossTenantReadBlocked = false;
    try {
      await operationsService.getOperationById(agencyB.id, operationA.id);
    } catch {
      crossTenantReadBlocked = true;
    }
    assert(crossTenantReadBlocked, "Agency B blocked from reading Agency A's operation");

    // 10b. Agency B cannot modify Agency A dispatch
    let crossTenantUpdateBlocked = false;
    try {
      await operationsService.updateVehicleDispatch(
        agencyB.id,
        operationA.id,
        initialDispatch.id,
        { driverName: "Malicious Driver" }
      );
    } catch {
      crossTenantUpdateBlocked = true;
    }
    assert(crossTenantUpdateBlocked, "Agency B blocked from modifying Agency A's vehicle dispatch");

    // 10c. Agency A cannot assign a vehicle belonging to Agency B
    const vehicleAgencyB = await prisma.vehicle.create({
      data: {
        agencyId: agencyB.id,
        name: "Agency B Private Coach",
        type: "Bus",
        registrationNumber: "KL 01 BB 9999",
      },
    });

    let crossTenantVehicleAssignBlocked = false;
    try {
      await operationsService.updateVehicleDispatch(
        agencyA.id,
        operationA.id,
        dispatch2.id,
        {
          vehicleId: vehicleAgencyB.id,
          driverName: "Valid Driver",
          status: DispatchStatus.ASSIGNED,
        }
      );
    } catch {
      crossTenantVehicleAssignBlocked = true;
    }
    assert(crossTenantVehicleAssignBlocked, "Agency A blocked from assigning Agency B's vehicle");

    // -------------------------------------------------------------
    // Clean up
    // -------------------------------------------------------------
    console.log("\n🧹 Cleaning up Phase 10.13D test records...");
    await prisma.operationEvent.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.operationalIssue.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.activityConfirmation.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.vehicleDispatch.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.hotelConfirmation.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.tripOperation.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.booking.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.tripVehicle.deleteMany({ where: { tripId: { in: [tripA.id, tripA2.id] } } });
    await prisma.trip.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.vehicle.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.supplier.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.customer.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await prisma.agency.deleteMany({ where: { id: { in: [agencyA.id, agencyB.id] } } });
    console.log("  ✓ Teardown complete.");

    console.log("\n══════════════════════════════════════════════════════════════");
    console.log(`🎉 ALL ${passedAssertions} PHASE 10.13D INTEGRATION TESTS PASSED (100% SUCCESS)!`);
    console.log("══════════════════════════════════════════════════════════════\n");
  } catch (err) {
    console.error("❌ TEST FAILED:", err);
    throw err;
  }
}

runPhase1013DTests()
  .catch(() => process.exit(1))
  .finally(async () => {
    await prisma.$disconnect();
  });
