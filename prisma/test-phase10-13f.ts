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

async function runPhase1013FTests() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING PHASE 10.13F TEST SUITE (Voucher PDFs & Travel Documents)");
  console.log("══════════════════════════════════════════════════════════════\n");

  const timestamp = Date.now();
  const agencyA_Email = `ops-13f-a-${timestamp}@test.com`;
  const agencyB_Email = `ops-13f-b-${timestamp}@test.com`;

  // 1. Create two test agencies for multi-tenant isolation testing
  const agencyA = await prisma.agency.create({
    data: {
      name: `Ops 13F Agency A-${timestamp}`,
      email: agencyA_Email,
      phone: "+91 98800 11223",
      address: "123 MG Road, Bangalore, India",
      status: "ACTIVE",
    },
  });

  const agencyB = await prisma.agency.create({
    data: {
      name: `Ops 13F Agency B-${timestamp}`,
      email: agencyB_Email,
      phone: "+91 98800 11224",
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
    // TEST 1: Setup Customer, Trip with Itinerary, Hotels, Fleet, Activities
    // -------------------------------------------------------------
    console.log("🧪 Running Test 1: Setup Customer, Trip & Full Operations Inventory...");

    const customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: "Vikram & Ananya Malhotra",
        email: `vikram-${timestamp}@example.com`,
        phone: "+91 98200 44556",
      },
    });

    const tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-13F-${timestamp}-01`,
        title: "Royal Rajasthan Heritage & Luxury Desert Safari",
        startDate: new Date("2026-12-10T09:00:00Z"),
        endDate: new Date("2026-12-15T18:00:00Z"),
        status: TripStatus.CONFIRMED,
      },
    });

    // Add Travelers
    await prisma.traveler.createMany({
      data: [
        { tripId: tripA.id, name: "Vikram Malhotra", type: "ADULT", gender: "MALE" },
        { tripId: tripA.id, name: "Ananya Malhotra", type: "ADULT", gender: "FEMALE" },
      ],
    });

    // Add Itinerary Days
    await prisma.itineraryItem.createMany({
      data: [
        {
          tripId: tripA.id,
          dayNumber: 1,
          date: new Date("2026-12-10"),
          title: "Arrival in Jaipur & Royal Palace Tour",
          description: "Arrive at Jaipur International Airport. Private chauffeur pickup and transfer to Taj Rambagh Palace. Evening sunset visit to City Palace & Jantar Mantar Observatory.",
        },
        {
          tripId: tripA.id,
          dayNumber: 2,
          date: new Date("2026-12-11"),
          title: "Amber Fort Excursion & Traditional Bazaars",
          description: "Morning guided elephant / jeep safari at Amber Fort. Afternoon shopping at Johari Bazaar for authentic textiles and gemstones.",
        },
        {
          tripId: tripA.id,
          dayNumber: 3,
          date: new Date("2026-12-12"),
          title: "Scenic Transfer to Jodhpur & Mehrangarh Fort",
          description: "Scenic private highway transfer across Thar desert. Check-in at Umaid Bhawan Palace and evening heritage sunset walk.",
        },
      ],
    });

    // Add Supplier, Hotel, Vehicle, Activity
    const hotelSupplierA = await prisma.supplier.create({
      data: {
        agencyId: agencyA.id,
        name: "Taj Luxury Hotels & Palaces",
        type: "HOTEL",
        contactPerson: "Rajesh Sharma",
        phone: "+91 141 221199",
      },
    });

    const masterHotelA = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        supplierId: hotelSupplierA.id,
        name: "Taj Rambagh Palace Jaipur",
        city: "Jaipur",
        address: "Bhawani Singh Road, Jaipur, Rajasthan 302005",
        category: "5 Star Luxury Palace",
      },
    });

    const tripHotelA = await prisma.tripHotel.create({
      data: {
        tripId: tripA.id,
        hotelId: masterHotelA.id,
        roomType: "Palace Historical Suite with Garden View",
        checkIn: new Date("2026-12-10T14:00:00Z"),
        checkOut: new Date("2026-12-12T11:00:00Z"),
        rooms: 1,
        mealPlan: "MAP (Royal Breakfast + Palace Dinner)",
        nightlyRate: 45000,
        totalAmount: 90000,
      },
    });

    const vehicleMasterA = await prisma.vehicle.create({
      data: {
        agencyId: agencyA.id,
        name: "Toyota Innova Crysta Luxury 7-Seater",
        type: "SUV",
        capacity: 7,
        registrationNumber: "RJ 14 TA 8899",
      },
    });

    const tripVehicleA = await prisma.tripVehicle.create({
      data: {
        tripId: tripA.id,
        vehicleId: vehicleMasterA.id,
        vehicleName: "Toyota Innova Crysta Luxury",
        vehicleType: "SUV",
        totalRate: 24000,
      },
    });

    const activityMasterA = await prisma.activity.create({
      data: {
        agencyId: agencyA.id,
        name: "Amber Fort Royal Jeep Safari & Guided Tour",
        location: "Amer Fort Entrance, Amer, Jaipur",
      },
    });

    const tripActivityA = await prisma.tripActivity.create({
      data: {
        tripId: tripA.id,
        activityId: activityMasterA.id,
        name: "Amber Fort Royal Jeep Safari & Guided Tour",
        date: new Date("2026-12-11T09:00:00Z"),
        time: "09:30 AM",
        numberOfParticipants: 2,
        totalPrice: 4500,
      },
    });

    // 2. Initialize Operation
    const opA = await operationsService.initializeOperation(agencyA.id, {
      tripId: tripA.id,
      status: OperationStatus.PREPARING,
    });
    assert(opA.id !== undefined, "Operation created successfully");

    // Hydrate Hotel Confirmation
    const hotelConfA = await prisma.hotelConfirmation.findFirst({
      where: { tripOperationId: opA.id },
    });
    assert(hotelConfA !== null, "Hotel confirmation auto-hydrated");

    // Confirm Hotel
    const updatedHotel = await operationsService.updateHotelConfirmation(
      agencyA.id,
      opA.id,
      hotelConfA!.id,
      {
        status: ConfirmationStatus.CONFIRMED,
        confirmationNumber: "TAJ-RAJ-998822",
        supplierNotes: "VIP Welcome drink & traditional Rajasthani garland greeting upon arrival.",
      },
      userA.id
    );
    assert(updatedHotel.status === ConfirmationStatus.CONFIRMED, "Hotel confirmed with confirmation number");

    // Hydrate Vehicle Dispatch
    const vehicleDispA = await prisma.vehicleDispatch.findFirst({
      where: { tripOperationId: opA.id },
    });
    assert(vehicleDispA !== null, "Vehicle dispatch auto-hydrated");

    // Assign Driver to Vehicle
    const updatedVehicle = await operationsService.updateVehicleDispatch(
      agencyA.id,
      opA.id,
      vehicleDispA!.id,
      {
        status: DispatchStatus.ASSIGNED,
        driverName: "Kailash Singh Rathore",
        driverPhone: "+91 94140 33445",
        vehicleNumber: "RJ 14 TA 8899",
        pickupDate: new Date("2026-12-10T09:30:00Z"),
        pickupTime: "09:30 AM",
        pickupLocation: "Jaipur International Airport (JAI), Gate 2",
        dropLocation: "Taj Rambagh Palace Hotel",
      },
      userA.id
    );
    assert(updatedVehicle.driverName === "Kailash Singh Rathore", "Driver assigned with phone and vehicle plate");

    // Hydrate Activity Confirmation
    const actConfA = await prisma.activityConfirmation.findFirst({
      where: { tripOperationId: opA.id },
    });
    assert(actConfA !== null, "Activity confirmation auto-hydrated");

    // Confirm Activity
    const updatedAct = await operationsService.updateActivityConfirmation(
      agencyA.id,
      opA.id,
      actConfA!.id,
      {
        status: ConfirmationStatus.CONFIRMED,
        confirmationNumber: "AMBER-TOUR-4411",
        ticketNumber: "TKT-ROYAL-88220",
        supplierNotes: "Meet licensed guide Mr. Bhati at Gate 1 holding TripDesk placard.",
      },
      userA.id
    );
    assert(updatedAct.status === ConfirmationStatus.CONFIRMED, "Activity confirmed with ticket number");

    console.log("  ✓ Setup completed successfully\n");

    // -------------------------------------------------------------
    // TEST 2: Hotel Voucher PDF Generation & Commercial Protection
    // -------------------------------------------------------------
    console.log("🧪 Running Test 2: Hotel Voucher PDF Generation & Commercial Protection...");

    const hotelVoucherResult = await operationsDocumentService.generateHotelVoucher(
      agencyA.id,
      opA.id,
      hotelConfA!.id,
      userA.name
    );

    assert(hotelVoucherResult.buffer instanceof Buffer, "Hotel voucher returned valid Buffer");
    assert(hotelVoucherResult.buffer.length > 1000, `Hotel voucher PDF size is realistic (${hotelVoucherResult.buffer.length} bytes)`);

    const hotelPdfHeader = hotelVoucherResult.buffer.subarray(0, 5).toString("ascii");
    assert(hotelPdfHeader === "%PDF-", "Hotel voucher has valid %PDF header signature");
    assert(hotelVoucherResult.documentNumber.startsWith("THV-"), `Voucher number has THV prefix: ${hotelVoucherResult.documentNumber}`);

    // Verify audit event emitted
    const hotelEvent = await prisma.operationEvent.findFirst({
      where: {
        tripOperationId: opA.id,
        eventType: "HOTEL_VOUCHER_GENERATED",
      },
    });
    assert(hotelEvent !== null, "HOTEL_VOUCHER_GENERATED timeline audit event recorded");

    // -------------------------------------------------------------
    // TEST 3: Vehicle / Transport Voucher PDF Generation
    // -------------------------------------------------------------
    console.log("🧪 Running Test 3: Vehicle / Transport Voucher PDF Generation...");

    const vehicleVoucherResult = await operationsDocumentService.generateVehicleVoucher(
      agencyA.id,
      opA.id,
      vehicleDispA!.id,
      userA.name
    );

    assert(vehicleVoucherResult.buffer instanceof Buffer, "Vehicle voucher returned valid Buffer");
    assert(vehicleVoucherResult.buffer.length > 1000, `Vehicle voucher PDF size is realistic (${vehicleVoucherResult.buffer.length} bytes)`);

    const vehiclePdfHeader = vehicleVoucherResult.buffer.subarray(0, 5).toString("ascii");
    assert(vehiclePdfHeader === "%PDF-", "Vehicle voucher has valid %PDF header signature");
    assert(vehicleVoucherResult.documentNumber.startsWith("TVV-"), `Voucher number has TVV prefix: ${vehicleVoucherResult.documentNumber}`);

    // Verify audit event emitted
    const vehicleEvent = await prisma.operationEvent.findFirst({
      where: {
        tripOperationId: opA.id,
        eventType: "VEHICLE_VOUCHER_GENERATED",
      },
    });
    assert(vehicleEvent !== null, "VEHICLE_VOUCHER_GENERATED timeline audit event recorded");

    // -------------------------------------------------------------
    // TEST 4: Activity / Excursion Pass PDF Generation
    // -------------------------------------------------------------
    console.log("🧪 Running Test 4: Activity / Excursion Pass PDF Generation...");

    const actVoucherResult = await operationsDocumentService.generateActivityVoucher(
      agencyA.id,
      opA.id,
      actConfA!.id,
      userA.name
    );

    assert(actVoucherResult.buffer instanceof Buffer, "Activity pass returned valid Buffer");
    assert(actVoucherResult.buffer.length > 1000, `Activity pass PDF size is realistic (${actVoucherResult.buffer.length} bytes)`);

    const actPdfHeader = actVoucherResult.buffer.subarray(0, 5).toString("ascii");
    assert(actPdfHeader === "%PDF-", "Activity pass has valid %PDF header signature");
    assert(actVoucherResult.documentNumber.startsWith("TAV-"), `Pass number has TAV prefix: ${actVoucherResult.documentNumber}`);

    // Verify audit event emitted
    const actEvent = await prisma.operationEvent.findFirst({
      where: {
        tripOperationId: opA.id,
        eventType: "ACTIVITY_VOUCHER_GENERATED",
      },
    });
    assert(actEvent !== null, "ACTIVITY_VOUCHER_GENERATED timeline audit event recorded");

    // -------------------------------------------------------------
    // TEST 5: Customer Booking Confirmation PDF Generation
    // -------------------------------------------------------------
    console.log("🧪 Running Test 5: Customer Booking Confirmation PDF Generation...");

    const bookingPdfResult = await operationsDocumentService.generateBookingConfirmation(
      agencyA.id,
      opA.id,
      userA.name
    );

    assert(bookingPdfResult.buffer instanceof Buffer, "Booking confirmation returned valid Buffer");
    assert(bookingPdfResult.buffer.length > 1500, `Booking confirmation PDF size is realistic (${bookingPdfResult.buffer.length} bytes)`);

    const bookingPdfHeader = bookingPdfResult.buffer.subarray(0, 5).toString("ascii");
    assert(bookingPdfHeader === "%PDF-", "Booking confirmation has valid %PDF header signature");
    assert(bookingPdfResult.documentNumber.startsWith("TBC-"), `Document number has TBC prefix: ${bookingPdfResult.documentNumber}`);

    // Verify audit event emitted
    const bookingEvent = await prisma.operationEvent.findFirst({
      where: {
        tripOperationId: opA.id,
        eventType: "BOOKING_CONFIRMATION_GENERATED",
      },
    });
    assert(bookingEvent !== null, "BOOKING_CONFIRMATION_GENERATED timeline audit event recorded");

    // -------------------------------------------------------------
    // TEST 6: Final Travel Kit & Comprehensive Itinerary PDF Generation
    // -------------------------------------------------------------
    console.log("🧪 Running Test 6: Final Travel Kit & Comprehensive Itinerary PDF Generation...");

    const travelKitResult = await operationsDocumentService.generateTravelKit(
      agencyA.id,
      opA.id,
      userA.name
    );

    assert(travelKitResult.buffer instanceof Buffer, "Travel Kit returned valid Buffer");
    assert(travelKitResult.buffer.length > 3000, `Travel Kit PDF size is realistic & multi-page (${travelKitResult.buffer.length} bytes)`);

    const travelKitHeader = travelKitResult.buffer.subarray(0, 5).toString("ascii");
    assert(travelKitHeader === "%PDF-", "Travel Kit has valid %PDF header signature");
    assert(travelKitResult.documentNumber.startsWith("TTK-"), `Document number has TTK prefix: ${travelKitResult.documentNumber}`);

    // Verify audit event emitted
    const travelKitEvent = await prisma.operationEvent.findFirst({
      where: {
        tripOperationId: opA.id,
        eventType: "TRAVEL_KIT_GENERATED",
      },
    });
    assert(travelKitEvent !== null, "TRAVEL_KIT_GENERATED timeline audit event recorded");

    // -------------------------------------------------------------
    // TEST 7: Operations Documents Summary & Readiness Analysis
    // -------------------------------------------------------------
    console.log("🧪 Running Test 7: Operations Documents Summary & Readiness Analysis...");

    const docSummary = await operationsDocumentService.getDocumentsSummary(agencyA.id, opA.id);
    assert(docSummary.operationId === opA.id, "Summary matches operation ID");
    assert(docSummary.customerName === customerA.name, "Summary matches customer name");
    assert(docSummary.documents.length >= 5, `Summary contains all 5 document types (found ${docSummary.documents.length})`);
    assert(docSummary.isFullyReady === true, "Fully ready flag is true (100% confirmed services)");

    const hotelItem = docSummary.documents.find((d) => d.type === "HOTEL_VOUCHER");
    assert(hotelItem !== undefined && hotelItem.isReady === true, "Hotel voucher item is ready");

    const vehicleItem = docSummary.documents.find((d) => d.type === "VEHICLE_VOUCHER");
    assert(vehicleItem !== undefined && vehicleItem.isReady === true, "Vehicle voucher item is ready");

    const travelKitItem = docSummary.documents.find((d) => d.type === "TRAVEL_KIT");
    assert(travelKitItem !== undefined && travelKitItem.isReady === true, "Travel Kit item is ready");

    // -------------------------------------------------------------
    // TEST 8: Multi-Tenant Security & Isolation Enforcement
    // -------------------------------------------------------------
    console.log("🧪 Running Test 8: Multi-Tenant Security & Isolation Enforcement...");

    // Agency B attempts to generate Agency A's Hotel Voucher
    let hotelCrossBlocked = false;
    try {
      await operationsDocumentService.generateHotelVoucher(agencyB.id, opA.id, hotelConfA!.id);
    } catch {
      hotelCrossBlocked = true;
    }
    assert(hotelCrossBlocked, "Agency B strictly blocked from generating Agency A's Hotel Voucher");

    // Agency B attempts to generate Agency A's Vehicle Voucher
    let vehicleCrossBlocked = false;
    try {
      await operationsDocumentService.generateVehicleVoucher(agencyB.id, opA.id, vehicleDispA!.id);
    } catch {
      vehicleCrossBlocked = true;
    }
    assert(vehicleCrossBlocked, "Agency B strictly blocked from generating Agency A's Vehicle Voucher");

    // Agency B attempts to generate Agency A's Travel Kit
    let travelKitCrossBlocked = false;
    try {
      await operationsDocumentService.generateTravelKit(agencyB.id, opA.id);
    } catch {
      travelKitCrossBlocked = true;
    }
    assert(travelKitCrossBlocked, "Agency B strictly blocked from generating Agency A's Travel Kit");

    // Agency B attempts to fetch Agency A's Documents Summary
    let summaryCrossBlocked = false;
    try {
      await operationsDocumentService.getDocumentsSummary(agencyB.id, opA.id);
    } catch {
      summaryCrossBlocked = true;
    }
    assert(summaryCrossBlocked, "Agency B strictly blocked from viewing Agency A's Documents Summary");

  } finally {
    // -------------------------------------------------------------
    // CLEANUP / TEARDOWN
    // -------------------------------------------------------------
    console.log("\n🧹 Cleaning up Phase 10.13F test records...");
    await prisma.agency.deleteMany({
      where: { id: { in: [agencyA.id, agencyB.id] } },
    });
    console.log("  ✓ Teardown complete.\n");
  }

  console.log("══════════════════════════════════════════════════════════════");
  console.log("🎉 ALL 24 PHASE 10.13F INTEGRATION TESTS PASSED (100% SUCCESS)!");
  console.log("══════════════════════════════════════════════════════════════\n");
}

runPhase1013FTests()
  .catch((err) => {
    console.error("❌ TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
