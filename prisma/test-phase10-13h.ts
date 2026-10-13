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
  BookingStatus,
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

async function runPhase1013HTests() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING PHASE 10.13H TEST SUITE (Operations Lifecycle & Handover)");
  console.log("══════════════════════════════════════════════════════════════\n");

  const timestamp = Date.now();
  const agencyA_Email = `ops-13h-a-${timestamp}@test.com`;
  const agencyB_Email = `ops-13h-b-${timestamp}@test.com`;

  // 1. Create two test agencies for multi-tenant isolation testing
  const agencyA = await prisma.agency.create({
    data: {
      name: `Ops 13H Agency A-${timestamp}`,
      email: agencyA_Email,
      phone: "+91 98800 44556",
      address: "200 Brigade Road, Bangalore, India",
      status: "ACTIVE",
    },
  });

  const agencyB = await prisma.agency.create({
    data: {
      name: `Ops 13H Agency B-${timestamp}`,
      email: agencyB_Email,
      phone: "+91 98800 44557",
      address: "201 Brigade Road, Bangalore, India",
      status: "ACTIVE",
    },
  });

  const userA = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `ops-lead-13h-a-${timestamp}@tripdesk-test.com`,
      agencyId: agencyA.id,
      name: "Operations Manager A",
      role: "AGENCY_OWNER",
    },
  });

  const userB = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `ops-lead-13h-b-${timestamp}@tripdesk-test.com`,
      agencyId: agencyB.id,
      name: "Operations Manager B",
      role: "AGENCY_OWNER",
    },
  });

  console.log(`✅ Test Agencies initialized: ${agencyA.name} and ${agencyB.name}\n`);

  try {
    // -------------------------------------------------------------
    // TEST 1: Setup Customer, Trip, Booking & Service Inventory
    // -------------------------------------------------------------
    console.log("🧪 Running Test 1: Setup Customer, Trip, Booking & Inventory...");

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: "Vikram & Ananya Malhotra",
        email: `vikram-${timestamp}@malhotra.com`,
        phone: "+91 98111 22334",
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-13H-${timestamp}-01`,
        title: "Kashmir Luxury Snow & Dal Lake Houseboat Experience",
        startDate: new Date("2026-12-10T09:00:00Z"),
        endDate: new Date("2026-12-16T18:00:00Z"),
        status: TripStatus.BOOKED,
      },
    });

    const bookingA = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripA.id,
        bookingNumber: `BK-13H-${timestamp}-01`,
        status: BookingStatus.CONFIRMED,
        totalAmount: 125000,
        paidAmount: 125000,
        balanceAmount: 0,
        currency: "INR",
      },
    });

    // Add Hotel Component
    const supplierHotel = await prisma.supplier.create({
      data: {
        agencyId: agencyA.id,
        name: "The Khyber Himalayan Resort & Spa",
        type: "HOTEL",
        contactPerson: "Mr. Farooq",
        phone: "+91 1954 238567",
      },
    });

    const hotelMaster = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        supplierId: supplierHotel.id,
        name: "The Khyber Himalayan Resort",
        city: "Gulmarg",
      },
    });

    const tripHotelA = await prisma.tripHotel.create({
      data: {
        tripId: tripA.id,
        hotelId: hotelMaster.id,
        checkIn: new Date("2026-12-10T12:00:00Z"),
        checkOut: new Date("2026-12-14T11:00:00Z"),
        roomType: "Premier Mountain View Room",
        mealPlan: "MAPAI",
      },
    });

    // Add Vehicle Component
    const tripVehicleA = await prisma.tripVehicle.create({
      data: {
        tripId: tripA.id,
        vehicleName: "Innova Crysta 4x4 Luxury",
        vehicleType: "SUV",
        pickupLocation: "Srinagar International Airport (SXR)",
        dropLocation: "The Khyber Resort, Gulmarg",
        startDate: new Date("2026-12-10T09:00:00Z"),
        endDate: new Date("2026-12-16T18:00:00Z"),
      },
    });

    assert(tripHotelA.id !== undefined, "Hotel inventory created");
    assert(tripVehicleA.id !== undefined, "Vehicle inventory created");

    // -------------------------------------------------------------
    // TEST 2: Initialize Operation (Initial Status: PREPARING)
    // -------------------------------------------------------------
    console.log("🧪 Running Test 2: Initialize TripOperation in PREPARING status...");

    const opA = await operationsService.initializeOperation(agencyA.id, {
      tripId: tripA.id,
      bookingId: bookingA.id,
      status: OperationStatus.PREPARING,
    });

    assert(opA.status === OperationStatus.PREPARING, "Initial status is PREPARING");
    assert(opA.bookingId === bookingA.id, "Operation is linked to Booking");

    // Hydrated confirmation records
    const hotelConfA = await prisma.hotelConfirmation.findFirst({
      where: { tripOperationId: opA.id },
    });
    const vehicleDispA = await prisma.vehicleDispatch.findFirst({
      where: { tripOperationId: opA.id },
    });

    assert(hotelConfA !== null, "Hotel confirmation record auto-hydrated");
    assert(vehicleDispA !== null, "Vehicle dispatch record auto-hydrated");

    // Confirm hotel and assign driver
    await operationsService.updateHotelConfirmation(
      agencyA.id,
      opA.id,
      hotelConfA!.id,
      {
        status: ConfirmationStatus.CONFIRMED,
        confirmationNumber: "KHYBER-2026-9911",
      }
    );

    await operationsService.updateVehicleDispatch(
      agencyA.id,
      opA.id,
      vehicleDispA!.id,
      {
        status: DispatchStatus.CONFIRMED,
        driverName: "Tariq Ahmad Bhat",
        driverPhone: "+91 94190 55443",
        vehiclePlate: "JK-01-AB-7788",
      }
    );

    // -------------------------------------------------------------
    // TEST 3: Blocker Enforcement (CRITICAL Issue Prevents READY/ONGOING)
    // -------------------------------------------------------------
    console.log("🧪 Running Test 3: Blocker Enforcement with Open CRITICAL Issue...");

    const criticalIssue = await operationsService.createIssue(
      agencyA.id,
      opA.id,
      {
        title: "Severe Gulmarg Road Landslide / Chain Requirement Alert",
        description: "Heavy snow accumulation on Tangmarg-Gulmarg road requires 4x4 wheel chains.",
        priority: IssuePriority.CRITICAL,
      },
      userA.id
    );

    assert(criticalIssue.priority === IssuePriority.CRITICAL, "CRITICAL issue created");

    // Attempt to set operation to READY while CRITICAL issue is open
    let readyBlocked = false;
    try {
      await operationsService.updateOperation(
        agencyA.id,
        opA.id,
        { status: OperationStatus.READY },
        userA.id
      );
    } catch (e: any) {
      readyBlocked = true;
      assert(e.message.includes("critical issue"), "Correct blocker validation message returned");
    }
    assert(readyBlocked, "Transition to READY blocked while CRITICAL issue is open");

    // Attempt to set operation to ONGOING while CRITICAL issue is open
    let ongoingBlocked = false;
    try {
      await operationsService.updateOperation(
        agencyA.id,
        opA.id,
        { status: OperationStatus.ONGOING },
        userA.id
      );
    } catch {
      ongoingBlocked = true;
    }
    assert(ongoingBlocked, "Transition to ONGOING blocked while CRITICAL issue is open");

    // Resolve the critical issue
    await operationsService.updateIssue(
      agencyA.id,
      opA.id,
      criticalIssue.id,
      {
        status: IssueStatus.RESOLVED,
        resolution: "Snow chains fitted on Innova 4x4. Road cleared by Beacon authorities.",
      },
      userA.id
    );

    // Now transition to READY succeeds
    const readyOp = await operationsService.updateOperation(
      agencyA.id,
      opA.id,
      { status: OperationStatus.READY },
      userA.id
    );

    assert(readyOp.status === OperationStatus.READY, "Operation transitioned to READY after issue resolution");

    const readyEvent = await prisma.operationEvent.findFirst({
      where: { tripOperationId: opA.id, eventType: "OPERATION_READY" },
    });
    assert(readyEvent !== null, "OPERATION_READY timeline audit event logged");

    // -------------------------------------------------------------
    // TEST 4: Departure Dispatch & Cascade Synchronization
    // -------------------------------------------------------------
    console.log("🧪 Running Test 4: Departure Dispatch & Cascade Synchronization...");

    const departedOp = await operationsService.updateOperation(
      agencyA.id,
      opA.id,
      { status: OperationStatus.ONGOING },
      userA.id
    );

    assert(departedOp.status === OperationStatus.ONGOING, "Operation transitioned to ONGOING");

    // Verify cascade to Trip
    const updatedTrip1 = await prisma.trip.findUnique({
      where: { id: tripA.id },
    });
    assert(updatedTrip1?.status === TripStatus.ONGOING, "Trip status cascaded to ONGOING");

    // Verify cascade to Booking
    const updatedBooking1 = await prisma.booking.findUnique({
      where: { id: bookingA.id },
    });
    assert(updatedBooking1?.status === BookingStatus.ONGOING, "Booking status cascaded to ONGOING");

    const departedEvent = await prisma.operationEvent.findFirst({
      where: { tripOperationId: opA.id, eventType: "OPERATION_DEPARTED" },
    });
    assert(departedEvent !== null, "OPERATION_DEPARTED timeline audit event logged");

    // -------------------------------------------------------------
    // TEST 5: Operational Communication Message Dispatch
    // -------------------------------------------------------------
    console.log("🧪 Running Test 5: Operational Communication Message Dispatch...");

    // 1. Dispatch Driver details
    const commEvent1 = await operationsService.logCommunicationDispatch(
      agencyA.id,
      opA.id,
      {
        channel: "WHATSAPP",
        recipientName: customerA.name,
        recipientPhone: customerA.phone,
        templateType: "DRIVER_PICKUP",
        messageBody: "Driver Tariq Ahmad Bhat dispatched in Innova JK-01-AB-7788.",
      },
      userA.id
    );

    assert(commEvent1.eventType === "COMMUNICATION_DISPATCHED", "Driver dispatch logged in timeline");
    assert((commEvent1.metadata as any).channel === "WHATSAPP", "Communication channel is WHATSAPP");

    // 2. Dispatch Hotel voucher details
    const commEvent2 = await operationsService.logCommunicationDispatch(
      agencyA.id,
      opA.id,
      {
        channel: "WHATSAPP",
        recipientName: customerA.name,
        recipientPhone: customerA.phone,
        templateType: "HOTEL_VOUCHER",
        messageBody: "Khyber Resort Gulmarg confirmed with Voucher KHYBER-2026-9911.",
      },
      userA.id
    );

    assert(commEvent2.eventType === "COMMUNICATION_DISPATCHED", "Hotel voucher communication logged");

    // -------------------------------------------------------------
    // TEST 6: Post-Tour Completion & Settlement Cascade
    // -------------------------------------------------------------
    console.log("🧪 Running Test 6: Post-Tour Completion & Settlement Cascade...");

    const completedOp = await operationsService.updateOperation(
      agencyA.id,
      opA.id,
      {
        status: OperationStatus.COMPLETED,
        notes: "[Rating: 5/5 Stars] Tour completed with exceptional guest feedback.",
      },
      userA.id
    );

    assert(completedOp.status === OperationStatus.COMPLETED, "Operation transitioned to COMPLETED");

    // Verify cascade to Trip
    const updatedTrip2 = await prisma.trip.findUnique({
      where: { id: tripA.id },
    });
    assert(updatedTrip2?.status === TripStatus.COMPLETED, "Trip status cascaded to COMPLETED");

    // Verify cascade to Booking
    const updatedBooking2 = await prisma.booking.findUnique({
      where: { id: bookingA.id },
    });
    assert(updatedBooking2?.status === BookingStatus.COMPLETED, "Booking status cascaded to COMPLETED");

    const completedEvent = await prisma.operationEvent.findFirst({
      where: { tripOperationId: opA.id, eventType: "OPERATION_COMPLETED" },
    });
    assert(completedEvent !== null, "OPERATION_COMPLETED timeline audit event logged");

    // -------------------------------------------------------------
    // TEST 7: Terminal State Transition Rejection
    // -------------------------------------------------------------
    console.log("🧪 Running Test 7: Terminal State Transition Rejection...");

    let modifyCompletedBlocked = false;
    try {
      await operationsService.updateOperation(
        agencyA.id,
        opA.id,
        { status: OperationStatus.PREPARING },
        userA.id
      );
    } catch {
      modifyCompletedBlocked = true;
    }
    assert(modifyCompletedBlocked, "Modifying COMPLETED operation back to active status rejected");

    // -------------------------------------------------------------
    // TEST 8: Cancellation & Cascade Workflow
    // -------------------------------------------------------------
    console.log("🧪 Running Test 8: Cancellation & Cascade Workflow...");

    const tripB = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-13H-${timestamp}-02`,
        title: "Ladakh Bike Expedition",
        startDate: new Date("2026-08-01T09:00:00Z"),
        endDate: new Date("2026-08-10T18:00:00Z"),
        status: TripStatus.BOOKED,
      },
    });

    const bookingB = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripId: tripB.id,
        bookingNumber: `BK-13H-${timestamp}-02`,
        status: BookingStatus.CONFIRMED,
        totalAmount: 90000,
        paidAmount: 90000,
        balanceAmount: 0,
        currency: "INR",
      },
    });

    const opB = await operationsService.initializeOperation(agencyA.id, {
      tripId: tripB.id,
      bookingId: bookingB.id,
      status: OperationStatus.PREPARING,
    });

    // Cancel operation
    await operationsService.updateOperation(
      agencyA.id,
      opB.id,
      {
        status: OperationStatus.CANCELLED,
        notes: "Trip cancelled per guest medical emergency.",
      },
      userA.id
    );

    const cancelledTrip = await prisma.trip.findUnique({
      where: { id: tripB.id },
    });
    assert(cancelledTrip?.status === TripStatus.CANCELLED, "Trip status cascaded to CANCELLED");

    const cancelledBooking = await prisma.booking.findUnique({
      where: { id: bookingB.id },
    });
    assert(cancelledBooking?.status === BookingStatus.CANCELLED, "Booking status cascaded to CANCELLED");

    let modifyCancelledBlocked = false;
    try {
      await operationsService.updateOperation(
        agencyA.id,
        opB.id,
        { status: OperationStatus.READY }
      );
    } catch {
      modifyCancelledBlocked = true;
    }
    assert(modifyCancelledBlocked, "Transition from CANCELLED back to active status rejected");

    // -------------------------------------------------------------
    // TEST 9: Multi-Tenant Security & Isolation Enforcement
    // -------------------------------------------------------------
    console.log("🧪 Running Test 9: Multi-Tenant Security & Isolation Enforcement...");

    // Agency B attempts to update Agency A's operation
    let crossUpdateBlocked = false;
    try {
      await operationsService.updateOperation(
        agencyB.id,
        opA.id,
        { notes: "Tampered by Agency B" }
      );
    } catch {
      crossUpdateBlocked = true;
    }
    assert(crossUpdateBlocked, "Agency B strictly blocked from updating Agency A's operation");

    // Agency B attempts to log communication on Agency A's operation
    let crossCommBlocked = false;
    try {
      await operationsService.logCommunicationDispatch(
        agencyB.id,
        opA.id,
        {
          channel: "WHATSAPP",
          recipientName: "Test",
          templateType: "DRIVER_PICKUP",
          messageBody: "Hacked",
        }
      );
    } catch {
      crossCommBlocked = true;
    }
    assert(crossCommBlocked, "Agency B strictly blocked from logging communication on Agency A's operation");

    // -------------------------------------------------------------
    // TEST 10: Timeline Audit Integrity Verification
    // -------------------------------------------------------------
    console.log("🧪 Running Test 10: Timeline Audit Integrity Verification...");

    const timelineEvents = await prisma.operationEvent.findMany({
      where: { tripOperationId: opA.id },
      orderBy: { createdAt: "asc" },
    });

    const eventTypes = timelineEvents.map((e) => e.eventType);
    assert(eventTypes.includes("OPERATION_READY"), "Timeline contains OPERATION_READY");
    assert(eventTypes.includes("OPERATION_DEPARTED"), "Timeline contains OPERATION_DEPARTED");
    assert(eventTypes.includes("COMMUNICATION_DISPATCHED"), "Timeline contains COMMUNICATION_DISPATCHED");
    assert(eventTypes.includes("OPERATION_COMPLETED"), "Timeline contains OPERATION_COMPLETED");

  } finally {
    // -------------------------------------------------------------
    // CLEANUP / TEARDOWN
    // -------------------------------------------------------------
    console.log("\n🧹 Cleaning up Phase 10.13H test records...");
    await prisma.agency.deleteMany({
      where: { id: { in: [agencyA.id, agencyB.id] } },
    });
    console.log("  ✓ Teardown complete.\n");
  }

  console.log("══════════════════════════════════════════════════════════════");
  console.log("🎉 ALL 25 PHASE 10.13H INTEGRATION TESTS PASSED (100% SUCCESS)!");
  console.log("══════════════════════════════════════════════════════════════\n");
}

runPhase1013HTests()
  .catch((err) => {
    console.error("❌ TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
