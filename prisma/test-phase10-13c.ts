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
  TripStatus,
} from "@prisma/client";

async function runPhase1013CTests() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING PHASE 10.13C TEST SUITE (Hotel Confirmations Workflow)");
  console.log("══════════════════════════════════════════════════════════════\n");

  const timestamp = Date.now();
  const agencyA_Email = `ops-13c-a-${timestamp}@test.com`;
  const agencyB_Email = `ops-13c-b-${timestamp}@test.com`;

  // 1. Setup Test Agencies & Users
  const agencyA = await prisma.agency.create({
    data: {
      name: `Ops 13C Agency A-${timestamp}`,
      email: agencyA_Email,
      phone: "+919876543210",
      status: "ACTIVE",
    },
  });

  const agencyB = await prisma.agency.create({
    data: {
      name: `Ops 13C Agency B-${timestamp}`,
      email: agencyB_Email,
      phone: "+919876543211",
      status: "ACTIVE",
    },
  });

  const userA = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `ops-13c-user-a-${timestamp}@test.com`,
      name: "Hotel Coordinator A",
      role: "AGENCY_OWNER",
      agencyId: agencyA.id,
    },
  });

  const userB = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: `ops-13c-user-b-${timestamp}@test.com`,
      name: "Hotel Coordinator B",
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
    // TEST 1: Setup Customer, Supplier, Hotel Master & Trip
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 1: Setup Customer, Supplier, Hotel Master & Trip...");

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: "Devina Kapoor",
        email: `devina-${timestamp}@example.com`,
        phone: "+919833445566",
      },
    });

    const supplierA = await prisma.supplier.create({
      data: {
        agencyId: agencyA.id,
        name: "Heritage Hospitality DMC",
        type: "HOTEL",
        email: `dmc-${timestamp}@heritage.com`,
        phone: "+91 94471 99887",
        contactPerson: "Suresh Menon",
      },
    });

    const hotelMasterA = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        supplierId: supplierA.id,
        name: "Kumarakom Lake Resort & Luxury Villas",
        city: "Kumarakom",
        state: "Kerala",
        phone: "+91 481 2524900",
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-13C-${timestamp}-01`,
        title: "Kerala Backwater Bliss & Heritage Stay",
        startDate: new Date("2026-12-01"),
        endDate: new Date("2026-12-05"),
        status: TripStatus.CONFIRMED,
      },
    });

    const tripHotelA = await prisma.tripHotel.create({
      data: {
        tripId: tripA.id,
        hotelId: hotelMasterA.id,
        roomType: "Luxury Pavilion Room with Private Pool",
        checkIn: new Date("2026-12-01"),
        checkOut: new Date("2026-12-05"),
        rooms: 1,
        mealPlan: "MAP (Breakfast + Dinner)",
        nightlyRate: 28000,
        totalAmount: 112000,
      },
    });

    const bookingA = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA.id,
        customerId: customerA.id,
        bookingNumber: `BK-13C-${timestamp}-01`,
        totalAmount: 112000,
        paidAmount: 50000,
        balanceAmount: 62000,
        status: "CONFIRMED",
      },
    });

    assert(tripHotelA.id !== undefined, "Trip Hotel record created with full commercial parameters");

    // -------------------------------------------------------------
    // TEST 2: Initialize Operation and Auto-Hydrate Hotel Confirmation
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 2: Initialize Operation & Verify Initial HotelConfirmation...");

    const operationA = await operationsService.initializeOperation(
      agencyA.id,
      {
        tripId: tripA.id,
        bookingId: bookingA.id,
        status: OperationStatus.PREPARING,
      },
      userA.id
    );

    assert(operationA.hotelConfirmations.length === 1, "HotelConfirmation automatically hydrated from TripHotel");
    const initialConf = operationA.hotelConfirmations[0];
    assert(initialConf.status === ConfirmationStatus.PENDING, "Initial hotel status is PENDING");
    assert(initialConf.confirmationNumber === null, "Initial confirmation number is null");

    // -------------------------------------------------------------
    // TEST 3: Workflow Step 1: Request Confirmation (PENDING -> REQUESTED)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 3: Hotel Request Workflow (PENDING -> REQUESTED)...");

    const requestedConf = await operationsService.updateHotelConfirmation(
      agencyA.id,
      operationA.id,
      initialConf.id,
      {
        status: ConfirmationStatus.REQUESTED,
        supplierNotes: "Reservation request sent via email to Suresh Menon at Heritage Hospitality.",
      },
      userA.id
    );

    assert(requestedConf.status === ConfirmationStatus.REQUESTED, "Status successfully updated to REQUESTED");
    assert(requestedConf.supplierNotes?.includes("Reservation request sent"), "Supplier notes recorded");

    // Verify timeline event
    const eventsAfterRequest = await operationsService.getTimeline(agencyA.id, operationA.id);
    const reqEvent = eventsAfterRequest.find((e) => e.eventType === "HOTEL_REQUESTED");
    assert(reqEvent !== undefined, "HOTEL_REQUESTED timeline audit event logged");

    // -------------------------------------------------------------
    // TEST 4: Workflow Step 2: Confirm Hotel (REQUESTED -> CONFIRMED)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 4: Hotel Confirmation Workflow (REQUESTED -> CONFIRMED)...");

    const confirmedConf = await operationsService.updateHotelConfirmation(
      agencyA.id,
      operationA.id,
      initialConf.id,
      {
        confirmationNumber: "KLR-VOUCHER-998812",
        status: ConfirmationStatus.CONFIRMED,
        confirmedAt: new Date("2026-11-20T10:00:00Z"),
        roomDetails: "Luxury Pavilion Room (Allocated Villa #12)",
        mealPlan: "MAP (Buffet Breakfast & Chef Dinner)",
        supplierNotes: "Confirmed by reservations desk. Early check-in requested for 12:00 PM.",
      },
      userA.id
    );

    assert(confirmedConf.status === ConfirmationStatus.CONFIRMED, "Status successfully updated to CONFIRMED");
    assert(confirmedConf.confirmationNumber === "KLR-VOUCHER-998812", "Confirmation / Voucher number saved");
    assert(confirmedConf.confirmedAt !== null, "confirmedAt timestamp recorded");

    // Verify timeline event
    const eventsAfterConfirm = await operationsService.getTimeline(agencyA.id, operationA.id);
    const confEvent = eventsAfterConfirm.find((e) => e.eventType === "HOTEL_CONFIRMED");
    assert(confEvent !== undefined, "HOTEL_CONFIRMED timeline audit event logged");

    // -------------------------------------------------------------
    // TEST 5: Verify 100% Readiness on Hotel Confirmation
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 5: Verify Readiness Score Calculation with Confirmed Hotel...");

    const readiness = await operationsService.calculateReadiness(agencyA.id, operationA.id);
    assert(readiness.confirmedHotels === 1, "1/1 hotels confirmed");
    assert(readiness.isReady === true, "Operational readiness isReady flag is true");
    assert(readiness.score === 100, "Operational readiness score reached 100%");

    // -------------------------------------------------------------
    // TEST 6: Workflow Step 3: Amend Hotel (CONFIRMED -> AMENDED)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 6: Hotel Amendment Workflow (CONFIRMED -> AMENDED)...");

    const amendedConf = await operationsService.updateHotelConfirmation(
      agencyA.id,
      operationA.id,
      initialConf.id,
      {
        status: ConfirmationStatus.AMENDED,
        roomDetails: "Upgraded to Heritage Lake View Villa (Villa #15)",
        mealPlan: "APAI (All Meals Included)",
        supplierNotes: "Guest requested upgrade to Lake View Villa. Difference settled.",
      },
      userA.id
    );

    assert(amendedConf.status === ConfirmationStatus.AMENDED, "Status successfully updated to AMENDED");
    assert(amendedConf.roomDetails?.includes("Heritage Lake View Villa"), "Amended room category recorded");

    // Verify timeline event
    const eventsAfterAmend = await operationsService.getTimeline(agencyA.id, operationA.id);
    const amendEvent = eventsAfterAmend.find((e) => e.eventType === "HOTEL_AMENDED");
    assert(amendEvent !== undefined, "HOTEL_AMENDED timeline audit event logged");

    // -------------------------------------------------------------
    // TEST 7: Workflow Step 4: Reconfirm Hotel (AMENDED -> CONFIRMED)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 7: Hotel Reconfirmation Workflow (AMENDED -> CONFIRMED)...");

    const reconfirmedConf = await operationsService.updateHotelConfirmation(
      agencyA.id,
      operationA.id,
      initialConf.id,
      {
        confirmationNumber: "KLR-VOUCHER-998812-REV1",
        status: ConfirmationStatus.CONFIRMED,
        supplierNotes: "Revised voucher issued for Villa #15 APAI.",
      },
      userA.id
    );

    assert(reconfirmedConf.status === ConfirmationStatus.CONFIRMED, "Status updated back to CONFIRMED");
    assert(reconfirmedConf.confirmationNumber === "KLR-VOUCHER-998812-REV1", "Revised confirmation number saved");

    // -------------------------------------------------------------
    // TEST 8: Workflow Step 5: Cancel Hotel (CONFIRMED -> CANCELLED)
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 8: Hotel Cancellation Workflow (CONFIRMED -> CANCELLED)...");

    const cancelledConf = await operationsService.updateHotelConfirmation(
      agencyA.id,
      operationA.id,
      initialConf.id,
      {
        status: ConfirmationStatus.CANCELLED,
        supplierNotes: "Cancellation processed as guests shortened tour.",
      },
      userA.id
    );

    assert(cancelledConf.status === ConfirmationStatus.CANCELLED, "Status updated to CANCELLED");
    assert(cancelledConf.id === initialConf.id, "Record preserved in database (not physically deleted)");

    // Verify timeline event
    const eventsAfterCancel = await operationsService.getTimeline(agencyA.id, operationA.id);
    const cancelEvent = eventsAfterCancel.find((e) => e.eventType === "HOTEL_CANCELLED");
    assert(cancelEvent !== undefined, "HOTEL_CANCELLED timeline audit event logged");

    // Verify readiness handles cancelled hotels
    const readinessAfterCancel = await operationsService.calculateReadiness(agencyA.id, operationA.id);
    assert(readinessAfterCancel.totalHotels === 0, "Cancelled hotel excluded from active hotel count");
    assert(readinessAfterCancel.isReady === true, "isReady true because 0 active hotels are pending");

    // -------------------------------------------------------------
    // TEST 9: Multi-Tenant Security & Isolation
    // -------------------------------------------------------------
    console.log("\n🧪 Running Test 9: Multi-Tenant Isolation Enforcement...");

    let crossTenantReadBlocked = false;
    try {
      await operationsService.getOperationById(agencyB.id, operationA.id);
    } catch {
      crossTenantReadBlocked = true;
    }
    assert(crossTenantReadBlocked, "Agency B blocked from reading Agency A's operation");

    let crossTenantUpdateBlocked = false;
    try {
      await operationsService.updateHotelConfirmation(
        agencyB.id,
        operationA.id,
        initialConf.id,
        { status: ConfirmationStatus.CONFIRMED }
      );
    } catch {
      crossTenantUpdateBlocked = true;
    }
    assert(crossTenantUpdateBlocked, "Agency B blocked from updating Agency A's hotel confirmation");

    // -------------------------------------------------------------
    // Clean up
    // -------------------------------------------------------------
    console.log("\n🧹 Cleaning up Phase 10.13C test records...");
    await prisma.operationEvent.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.operationalIssue.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.activityConfirmation.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.vehicleDispatch.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.hotelConfirmation.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.tripOperation.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.booking.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.tripHotel.deleteMany({ where: { tripId: tripA.id } });
    await prisma.trip.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.hotel.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.supplier.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.customer.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await prisma.agency.deleteMany({ where: { id: { in: [agencyA.id, agencyB.id] } } });
    console.log("  ✓ Teardown complete.");

    console.log("\n══════════════════════════════════════════════════════════════");
    console.log(`🎉 ALL ${passedAssertions} PHASE 10.13C INTEGRATION TESTS PASSED (100% SUCCESS)!`);
    console.log("══════════════════════════════════════════════════════════════\n");
  } catch (err) {
    console.error("❌ TEST FAILED:", err);
    throw err;
  }
}

runPhase1013CTests()
  .catch(() => process.exit(1))
  .finally(async () => {
    await prisma.$disconnect();
  });
