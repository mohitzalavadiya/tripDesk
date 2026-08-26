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
  BookingStatus,
} from "@prisma/client";

async function runPhase1013ATests() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING PHASE 10.13A TEST SUITE (Operations Data Foundation)");
  console.log("══════════════════════════════════════════════════════════════\n");

  const timestamp = Date.now();
  const agencyA_Email = `ops-agency-a-${timestamp}@test.com`;
  const agencyB_Email = `ops-agency-b-${timestamp}@test.com`;

  // 1. Setup Test Agencies & Users
  const agencyA = await prisma.agency.create({
    data: {
      name: `Ops Royal Travels A-${timestamp}`,
      email: agencyA_Email,
      phone: "+919876543210",
      status: "ACTIVE",
    },
  });

  const agencyB = await prisma.agency.create({
    data: {
      name: `Ops Desert Safaris B-${timestamp}`,
      email: agencyB_Email,
      phone: "+919876543211",
      status: "ACTIVE",
    },
  });

  const userA = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `ops-user-a-${timestamp}@test.com`,
      name: "Operations Manager A",
      role: "AGENCY_OWNER",
      agencyId: agencyA.id,
    },
  });

  const userB = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `ops-user-b-${timestamp}@test.com`,
      name: "Operations Manager B",
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
    // TEST 1: Create Trips, Customers, and Bookings for Agency A
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 1: Setup Customer, Trip & Booking for Operations...");

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: "Vikram Malhotra",
        email: `vikram-${timestamp}@example.com`,
        phone: "+919811223344",
      },
    });

    const hotelMasterA = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        name: "The Oberoi Amarvilas, Agra",
        city: "Agra",
        state: "Uttar Pradesh",
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-${timestamp}-001`,
        title: "Golden Triangle Luxury Tour",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-07"),
        status: TripStatus.CONFIRMED,
      },
    });

    // Add Trip Hotel & Vehicle to Trip
    const tripHotel1 = await prisma.tripHotel.create({
      data: {
        tripId: tripA.id,
        hotelId: hotelMasterA.id,
        roomType: "Premier Room with Balcony",
        checkIn: new Date("2026-10-02"),
        checkOut: new Date("2026-10-04"),
        rooms: 2,
        nightlyRate: 20000,
        totalAmount: 40000,
      },
    });

    const tripVehicle1 = await prisma.tripVehicle.create({
      data: {
        tripId: tripA.id,
        vehicleName: "Innova Crysta",
        vehicleType: "Toyota Innova Crysta",
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-07"),
        totalRate: 20000,
      },
    });

    const bookingA = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA.id,
        customerId: customerA.id,
        bookingNumber: `BK-TEST-${timestamp}`,
        totalAmount: 90500,
        paidAmount: 90500,
        balanceAmount: 0,
        status: BookingStatus.CONFIRMED,
      },
    });

    assert(Boolean(bookingA.id), "Booking A created successfully");
    assert(Boolean(tripHotel1.id), "TripHotel item created");
    assert(Boolean(tripVehicle1.id), "TripVehicle item created");

    // -------------------------------------------------------------
    // TEST 2: Initialize TripOperation via Operations Service
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 2: Initialize TripOperation...");

    const operationA = await operationsService.createOperation(
      agencyA.id,
      {
        tripId: tripA.id,
        bookingId: bookingA.id,
        operationalStatus: OperationStatus.PLANNING,
        assignedCoordinator: "Aditi Sharma",
        specialInstructions: "VIP Honeymoon travelers - provide welcome cake & flower bouquet.",
      },
      userA.id
    );

    assert(Boolean(operationA.id), "TripOperation record created");
    assert(operationA.agencyId === agencyA.id, "TripOperation is bound to Agency A");
    assert(operationA.assignedCoordinator === "Aditi Sharma", "Assigned coordinator matches input");
    assert(operationA.operationalStatus === OperationStatus.PLANNING, "Initial status is PLANNING");

    // -------------------------------------------------------------
    // TEST 3: Initial Readiness Score Calculation (Unconfirmed items)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 3: Evaluate Initial Readiness Score...");

    const opWithDetails = await operationsService.getOperationById(agencyA.id, operationA.id);
    assert(Boolean(opWithDetails), "Retrieved operation with full operational details");
    assert(opWithDetails.readinessScore < 100, `Initial readiness score is less than 100% (${opWithDetails.readinessScore}%)`);
    assert(opWithDetails.readinessBreakdown.hotels.total === 1, "Detected 1 hotel required");
    assert(opWithDetails.readinessBreakdown.hotels.confirmed === 0, "0 hotels confirmed initially");
    assert(opWithDetails.readinessBreakdown.vehicles.total === 1, "Detected 1 vehicle required");
    assert(opWithDetails.readinessBreakdown.vehicles.confirmed === 0, "0 vehicles confirmed initially");

    // -------------------------------------------------------------
    // TEST 4: Hotel Confirmation Upsert & Status Tracking
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 4: Hotel Confirmation Upsert & Audit Logging...");

    const hotelConf = await operationsService.upsertHotelConfirmation(
      agencyA.id,
      operationA.id,
      {
        tripHotelId: tripHotel1.id,
        supplierName: "Oberoi Central Reservations",
        confirmationNumber: "OB-AGR-998822",
        status: ConfirmationStatus.CONFIRMED,
        confirmedBy: "Reservations Agent Neha",
        mealPlan: "CP - Breakfast Included",
        roomsBooked: 2,
        notes: "Requested high-floor Taj-view rooms",
      },
      userA.id
    );

    assert(Boolean(hotelConf.id), "HotelConfirmation created");
    assert(hotelConf.status === ConfirmationStatus.CONFIRMED, "Hotel confirmation status is CONFIRMED");
    assert(hotelConf.confirmationNumber === "OB-AGR-998822", "Hotel confirmation number saved");
    assert(hotelConf.roomsBooked === 2, "Rooms booked count is 2");

    // -------------------------------------------------------------
    // TEST 5: Vehicle Dispatch Upsert & Driver Details
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 5: Vehicle Dispatch Upsert with Driver & Vehicle Specs...");

    const vehicleDisp = await operationsService.upsertVehicleDispatch(
      agencyA.id,
      operationA.id,
      {
        tripVehicleId: tripVehicle1.id,
        supplierName: "North India Premier Fleet Services",
        vehicleType: "Toyota Innova Crysta (White)",
        vehicleNumber: "DL-01-AB-1234",
        driverName: "Rajesh Kumar",
        driverPhone: "+919876001122",
        status: DispatchStatus.CONFIRMED,
        reportingLocation: "Indira Gandhi International Airport, Terminal 3",
        reportingTime: new Date("2026-10-01T10:00:00Z"),
        dispatchNotes: "Chauffeur must carry TripDesk welcome placard",
      },
      userA.id
    );

    assert(Boolean(vehicleDisp.id), "VehicleDispatch created");
    assert(vehicleDisp.driverName === "Rajesh Kumar", "Driver name assigned");
    assert(vehicleDisp.vehicleNumber === "DL-01-AB-1234", "Vehicle registration number assigned");
    assert(vehicleDisp.status === DispatchStatus.CONFIRMED, "Dispatch status is CONFIRMED");

    // -------------------------------------------------------------
    // TEST 6: Activity Confirmation Upsert
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 6: Activity Confirmation Upsert...");

    const activityConf = await operationsService.upsertActivityConfirmation(
      agencyA.id,
      operationA.id,
      {
        tripActivityId: tripActivity1.id,
        supplierName: "Agra Heritage Walks Co.",
        confirmationNumber: "AHW-TAJ-7711",
        status: ConfirmationStatus.CONFIRMED,
        guideName: "Mohd. Salim (Govt. Approved Guide)",
        guideContact: "+919922334455",
        ticketVoucherUrl: "https://tripdesk.app/vouchers/taj-vip-pass.pdf",
        supplierNotes: "Sunrise entry at 05:45 AM from East Gate",
      },
      userA.id
    );

    assert(Boolean(activityConf.id), "ActivityConfirmation created");
    assert(activityConf.status === ConfirmationStatus.CONFIRMED, "Activity confirmed");
    assert(activityConf.guideName === "Mohd. Salim (Govt. Approved Guide)", "Guide assigned");

    // -------------------------------------------------------------
    // TEST 7: Readiness Score Recalculation after Confirmations
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 7: Verify Readiness Score Recalculation (100% Ready)...");

    const updatedOp = await operationsService.getOperationById(agencyA.id, operationA.id);
    assert(updatedOp.readinessBreakdown.hotels.confirmed === 1, "Hotel is confirmed");
    assert(updatedOp.readinessBreakdown.vehicles.confirmed === 1, "Vehicle is confirmed");
    assert(updatedOp.readinessBreakdown.activities.confirmed === 1, "Activity is confirmed");
    assert(updatedOp.readinessBreakdown.customerDetailsComplete === true, "Customer contact complete");
    assert(updatedOp.readinessScore === 100, `Readiness score reached 100% (Actual: ${updatedOp.readinessScore}%)`);

    // -------------------------------------------------------------
    // TEST 8: Operational Issue Lifecycle (Report -> Assign -> Resolve)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 8: Operational Issue Tracking & Resolution...");

    const issue1 = await operationsService.createIssue(
      agencyA.id,
      operationA.id,
      {
        title: "Flight delayed by 3 hours - reschedule airport pickup",
        description: "Guest flight AI-102 delayed from 10:00 AM to 01:00 PM. Need to notify driver Rajesh.",
        priority: IssuePriority.HIGH,
        reportedBy: "Customer Support Desk",
        assignedTo: "Aditi Sharma",
      },
      userA.id
    );

    assert(Boolean(issue1.id), "Operational Issue created");
    assert(issue1.status === IssueStatus.OPEN, "Initial issue status is OPEN");
    assert(issue1.priority === IssuePriority.HIGH, "Priority is HIGH");

    // Check that open high priority issue impacts readiness score
    const opWithIssue = await operationsService.getOperationById(agencyA.id, operationA.id);
    assert(opWithIssue.readinessBreakdown.openIssuesCount === 1, "Detected 1 open issue");
    assert(opWithIssue.readinessScore < 100, "Readiness score penalized due to open operational issue");

    // Resolve the issue
    const resolvedIssue = await operationsService.updateIssue(
      agencyA.id,
      operationA.id,
      issue1.id,
      {
        status: IssueStatus.RESOLVED,
        resolution: "Driver Rajesh notified and confirmed revised 01:00 PM pickup time.",
      },
      userA.id
    );

    assert(resolvedIssue.status === IssueStatus.RESOLVED, "Issue marked RESOLVED");
    assert(Boolean(resolvedIssue.resolvedAt), "resolvedAt timestamp automatically recorded");
    assert(resolvedIssue.resolution?.includes("Driver Rajesh notified") === true, "Resolution notes recorded");

    // Re-verify readiness score returns to 100%
    const opAfterResolution = await operationsService.getOperationById(agencyA.id, operationA.id);
    assert(opAfterResolution.readinessBreakdown.openIssuesCount === 0, "0 open issues after resolution");
    assert(opAfterResolution.readinessScore === 100, "Readiness score back to 100% after issue resolution");

    // -------------------------------------------------------------
    // TEST 9: Timeline & Audit Trail Logging
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 9: Verify Immutable Operation Events Timeline...");

    // Custom Note Event
    const noteEvent = await operationsService.logEvent(
      agencyA.id,
      operationA.id,
      {
        eventType: "NOTE_ADDED",
        description: "Client requested vegetarian meal preference for in-car snacks.",
        createdBy: userA.id,
      }
    );

    assert(Boolean(noteEvent.id), "Custom timeline note logged");

    const timeline = await operationsService.getTimelineEvents(agencyA.id, operationA.id);
    assert(timeline.length >= 5, `Timeline contains at least 5 audit events (Actual: ${timeline.length})`);
    
    const eventTypes = timeline.map((e) => e.eventType);
    assert(eventTypes.includes("OPERATION_CREATED"), "Timeline includes OPERATION_CREATED event");
    assert(eventTypes.includes("HOTEL_CONFIRMED"), "Timeline includes HOTEL_CONFIRMED event");
    assert(eventTypes.includes("VEHICLE_CONFIRMED"), "Timeline includes VEHICLE_CONFIRMED event");
    assert(eventTypes.includes("ACTIVITY_CONFIRMED"), "Timeline includes ACTIVITY_CONFIRMED event");
    assert(eventTypes.includes("ISSUE_REPORTED"), "Timeline includes ISSUE_REPORTED event");
    assert(eventTypes.includes("ISSUE_RESOLVED"), "Timeline includes ISSUE_RESOLVED event");
    assert(eventTypes.includes("NOTE_ADDED"), "Timeline includes NOTE_ADDED event");

    // -------------------------------------------------------------
    // TEST 10: Multi-Tenant Isolation Enforcement
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 10: Multi-Tenant Security & Cross-Agency Isolation...");

    // Agency B attempts to fetch Agency A's operation -> Must throw NotFoundError
    let agencyBAccessBlocked = false;
    try {
      await operationsService.getOperationById(agencyB.id, operationA.id);
    } catch (e: any) {
      agencyBAccessBlocked = true;
      assert(e.name === "NotFoundError", "Agency B received NotFoundError when attempting to read Agency A operation");
    }
    assert(agencyBAccessBlocked, "Cross-tenant read blocked");

    // Agency B attempts to update Agency A's hotel confirmation -> Must throw NotFoundError
    let agencyBHotelBlocked = false;
    try {
      await operationsService.updateHotelConfirmation(
        agencyB.id,
        operationA.id,
        hotelConf.id,
        { status: ConfirmationStatus.CANCELLED },
        userB.id
      );
    } catch (e: any) {
      agencyBHotelBlocked = true;
      assert(e.name === "NotFoundError", "Agency B received NotFoundError when attempting to mutate Agency A hotel confirmation");
    }
    assert(agencyBHotelBlocked, "Cross-tenant hotel mutation blocked");

    // Agency B attempts to update Agency A's vehicle dispatch -> Must throw NotFoundError
    let agencyBVehicleBlocked = false;
    try {
      await operationsService.updateVehicleDispatch(
        agencyB.id,
        operationA.id,
        vehicleDisp.id,
        { status: DispatchStatus.CANCELLED },
        userB.id
      );
    } catch (e: any) {
      agencyBVehicleBlocked = true;
      assert(e.name === "NotFoundError", "Agency B received NotFoundError when attempting to mutate Agency A vehicle dispatch");
    }
    assert(agencyBVehicleBlocked, "Cross-tenant vehicle mutation blocked");

    // Agency B attempts to access Agency A's timeline -> Must throw NotFoundError
    let agencyBTimelineBlocked = false;
    try {
      await operationsService.getTimelineEvents(agencyB.id, operationA.id);
    } catch (e: any) {
      agencyBTimelineBlocked = true;
      assert(e.name === "NotFoundError", "Agency B received NotFoundError when attempting to read Agency A timeline");
    }
    assert(agencyBTimelineBlocked, "Cross-tenant timeline read blocked");

    // Listing operations for Agency B returns 0 operations
    const agencyBOps = await operationsService.listOperations(agencyB.id, {});
    assert(agencyBOps.total === 0, "Agency B has 0 operations in its isolated tenant list");
    assert(agencyBOps.data.length === 0, "Agency B operations array is empty");

    // Listing operations for Agency A returns 1 operation
    const agencyAOps = await operationsService.listOperations(agencyA.id, {});
    assert(agencyAOps.total === 1, "Agency A has exactly 1 operation in its tenant list");
    assert(agencyAOps.data[0].id === operationA.id, "Agency A operation matches the created operation");

    // -------------------------------------------------------------
    // TEST 11: Operation Lifecycle Transitions (CONFIRMED -> IN_PROGRESS -> COMPLETED)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 11: Operational Lifecycle State Transitions...");

    // Transition to CONFIRMED
    const confirmedOp = await operationsService.updateOperation(
      agencyA.id,
      operationA.id,
      { operationalStatus: OperationStatus.CONFIRMED },
      userA.id
    );
    assert(confirmedOp.operationalStatus === OperationStatus.CONFIRMED, "Operation transitioned to CONFIRMED");

    // Transition to IN_PROGRESS (Dispatch vehicle & start trip)
    const inProgressOp = await operationsService.updateOperation(
      agencyA.id,
      operationA.id,
      { operationalStatus: OperationStatus.IN_PROGRESS },
      userA.id
    );
    assert(inProgressOp.operationalStatus === OperationStatus.IN_PROGRESS, "Operation transitioned to IN_PROGRESS");

    // Transition to COMPLETED
    const completedOp = await operationsService.updateOperation(
      agencyA.id,
      operationA.id,
      { operationalStatus: OperationStatus.COMPLETED },
      userA.id
    );
    assert(completedOp.operationalStatus === OperationStatus.COMPLETED, "Operation transitioned to COMPLETED");

    console.log("\n══════════════════════════════════════════════════════════════");
    console.log(`🎉 ALL ${passedAssertions} ASSERTIONS PASSED FOR PHASE 10.13A!`);
    console.log("══════════════════════════════════════════════════════════════\n");
  } finally {
    // Clean up test data
    console.log("🧹 Cleaning up test agencies and related data...");
    await prisma.operationEvent.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.operationalIssue.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.activityConfirmation.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.vehicleDispatch.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.hotelConfirmation.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.tripOperation.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.booking.deleteMany({
      where: { agencyId: { in: [agencyA.id, agencyB.id] } },
    });
    await prisma.tripActivity.deleteMany({
      where: { trip: { agencyId: { in: [agencyA.id, agencyB.id] } } },
    });
    await prisma.tripVehicle.deleteMany({
      where: { trip: { agencyId: { in: [agencyA.id, agencyB.id] } } },
    });
    await prisma.tripHotel.deleteMany({
      where: { trip: { agencyId: { in: [agencyA.id, agencyB.id] } } },
    });
    await prisma.trip.deleteMany({
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
    console.log("✅ Cleanup complete.");
  }
}

runPhase1013ATests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
