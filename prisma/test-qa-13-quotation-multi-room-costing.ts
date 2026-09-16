/**
 * TRIPDESK QA-13 — MULTI-ROOM HOTEL COSTING & QUOTATION FLOW REGRESSION TEST SUITE
 * 
 * Tests and verifies:
 * - F-01: Multi-room hotel costing with dynamic nightlyRate * rooms * diffDays calculation in manual/TRIP_SNAPSHOT mode
 * - Scenario 1: 1 hotel, 1 room, 2 nights
 * - Scenario 2: 1 hotel, 2 rooms, 2 nights
 * - Scenario 3: 1 hotel, 3 rooms, 2 nights
 * - Scenario 4: 1 hotel, 4 rooms, 2 nights
 * - Scenario 5: Multiple hotels with different room counts
 * - Scenario 6: Different nights per hotel
 * - Scenario 7: Changing rooms dynamically
 * - Scenario 8: Changing check-in / check-out dates
 * - Scenario 9: Changing nightly rate
 * - Scenario 10: Manual/TRIP_SNAPSHOT rate behavior
 * - Scenario 11: Active RateSheet rate preserved
 * - Mixed-Service Regression: Hotels + Vehicle + Activity costing subtotal
 * - Quotation End-to-End Regression: Trip -> Costing -> Quotation -> Booking -> Invoice consistency
 */

import "dotenv/config";
import prisma from "../src/lib/prisma";
import { tripCostingService } from "../src/lib/services/trip-costing-service";
import { quotationService } from "../src/lib/services/quotation-service";
import { bookingService } from "../src/lib/services/booking-service";
import { invoiceService } from "../src/lib/services/invoice-service";
import { TaxMode, GstTreatment } from "@prisma/client";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function runMultiRoomCostingTests() {
  console.log("══════════════════════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING QA-13 MULTI-ROOM HOTEL COSTING & QUOTATION REGRESSION TEST SUITE");
  console.log("══════════════════════════════════════════════════════════════════════════════\n");

  const agencyId = "qa13-costing-agency-id";
  const customerId = "qa13-costing-customer-id";
  const tripId = "qa13-costing-trip-id";

  // 1. Setup agency & customer
  const agency = await prisma.agency.upsert({
    where: { id: agencyId },
    update: {},
    create: {
      id: agencyId,
      name: "QA 13 Multi-Room Agency",
      email: "qa13-agency@tripdesk.internal",
      phone: "+919800000013",
      status: "ACTIVE",
    },
  });

  const customer = await prisma.customer.upsert({
    where: { id: customerId },
    update: {},
    create: {
      id: customerId,
      agencyId: agency.id,
      name: "QA 13 Traveler",
      email: "qa13-traveler@tripdesk.internal",
      phone: "+919876543213",
    },
  });

  // Setup master hotel 1
  const hotel1 = await prisma.hotel.upsert({
    where: { id: "qa13-master-hotel-1" },
    update: {},
    create: {
      id: "qa13-master-hotel-1",
      agencyId: agency.id,
      name: "Grand Palace Hotel",
      city: "Jaipur",
      state: "Rajasthan",
      country: "India",
      category: "5-Star",
    },
  });

  // Setup master hotel 2
  const hotel2 = await prisma.hotel.upsert({
    where: { id: "qa13-master-hotel-2" },
    update: {},
    create: {
      id: "qa13-master-hotel-2",
      agencyId: agency.id,
      name: "Heritage Resort",
      city: "Udaipur",
      state: "Rajasthan",
      country: "India",
      category: "4-Star",
    },
  });

  // Setup master vehicle
  const vehicleMaster = await prisma.vehicle.upsert({
    where: { id: "qa13-master-vehicle-1" },
    update: {},
    create: {
      id: "qa13-master-vehicle-1",
      agencyId: agency.id,
      name: "Toyota Innova Crysta",
      type: "SUV",
      capacity: 6,
    },
  });

  // Setup master activity
  const activityMaster = await prisma.activity.upsert({
    where: { id: "qa13-master-activity-1" },
    update: {},
    create: {
      id: "qa13-master-activity-1",
      agencyId: agency.id,
      name: "Hot Air Balloon Safari",
      duration: "3 Hours",
      adultPrice: 2500,
    },
  });

  // Helper to reset trip services
  async function resetTrip(startDate: Date, endDate: Date) {
    // Delete existing downstream entities
    const existingQuotes = await prisma.quotation.findMany({ where: { tripId } });
    for (const q of existingQuotes) {
      await prisma.payment.deleteMany({ where: { booking: { quotationId: q.id } } });
      await prisma.invoiceItem.deleteMany({ where: { invoice: { booking: { quotationId: q.id } } } });
      await prisma.invoice.deleteMany({ where: { booking: { quotationId: q.id } } });
      await prisma.booking.deleteMany({ where: { quotationId: q.id } });
      await prisma.quotationItem.deleteMany({ where: { quotationId: q.id } });
      await prisma.quotationPackageOption.deleteMany({ where: { quotationId: q.id } });
    }
    await prisma.quotation.deleteMany({ where: { tripId } });
    await prisma.rateSheet.deleteMany({ where: { agencyId: agency.id } });
    await prisma.supplier.deleteMany({ where: { agencyId: agency.id } });
    await prisma.tripHotel.deleteMany({ where: { tripId } });
    await prisma.tripVehicle.deleteMany({ where: { tripId } });
    await prisma.tripActivity.deleteMany({ where: { tripId } });

    return await prisma.trip.upsert({
      where: { id: tripId },
      update: { startDate, endDate },
      create: {
        id: tripId,
        agencyId: agency.id,
        customerId: customer.id,
        tripNumber: "TRIP-QA13-001",
        title: "QA 13 Costing Trip",
        startDate,
        endDate,
        status: "PLANNING",
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  console.log("--- 1. SINGLE HOTEL MULTI-ROOM SCENARIOS (F-01) ---");
  // ──────────────────────────────────────────────────────────────────────────

  // Base dates: 2 nights
  const checkIn = new Date("2026-10-01T12:00:00Z");
  const checkOut = new Date("2026-10-03T12:00:00Z"); // 2 nights

  // Scenario 1: 1 hotel, 1 room, 2 nights @ ₹3,500
  await resetTrip(checkIn, checkOut);
  const th1 = await prisma.tripHotel.create({
    data: {
      tripId,
      hotelId: hotel1.id,
      checkIn,
      checkOut,
      roomType: "Deluxe Room",
      rooms: 1,
      nightlyRate: 3500,
      totalAmount: 3500, // old single night/room fallback stored
    },
  });

  let costing = await tripCostingService.calculateTripCosting(agencyId, tripId);
  if (!costing) throw new Error("Costing returned null");
  assert(costing.hotelsTotal === 7000, "Scenario 1: 1 room × 2 nights @ ₹3,500 = ₹7,000", `got ₹${costing.hotelsTotal}`);
  assert(costing.hotels[0].rooms === 1, "Scenario 1: Hotel item has rooms = 1");
  assert(costing.hotels[0].nights === 2, "Scenario 1: Hotel item has nights = 2");
  assert(costing.hotels[0].totalCost === 7000, "Scenario 1: Item totalCost is ₹7,000");

  // Scenario 2: 1 hotel, 2 rooms, 2 nights @ ₹3,500 -> Expected ₹14,000
  await prisma.tripHotel.update({
    where: { id: th1.id },
    data: { rooms: 2, totalAmount: 7000 }, // Stale single-room totalAmount = 7000 stored
  });
  costing = await tripCostingService.calculateTripCosting(agencyId, tripId);
  if (!costing) throw new Error("Costing returned null");
  assert(costing.hotelsTotal === 14000, "Scenario 2: 2 rooms × 2 nights @ ₹3,500 = ₹14,000 (F-01 Root Fix)", `got ₹${costing.hotelsTotal}`);
  assert(costing.hotels[0].rooms === 2, "Scenario 2: Hotel item has rooms = 2");
  assert(costing.hotels[0].totalCost === 14000, "Scenario 2: Item totalCost is ₹14,000");

  // Scenario 3: 1 hotel, 3 rooms, 2 nights @ ₹3,500 -> Expected ₹21,000
  await prisma.tripHotel.update({
    where: { id: th1.id },
    data: { rooms: 3, totalAmount: 7000 },
  });
  costing = await tripCostingService.calculateTripCosting(agencyId, tripId);
  if (!costing) throw new Error("Costing returned null");
  assert(costing.hotelsTotal === 21000, "Scenario 3: 3 rooms × 2 nights @ ₹3,500 = ₹21,000", `got ₹${costing.hotelsTotal}`);
  assert(costing.hotels[0].rooms === 3, "Scenario 3: Hotel item has rooms = 3");
  assert(costing.hotels[0].totalCost === 21000, "Scenario 3: Item totalCost is ₹21,000");

  // Scenario 4: 1 hotel, 4 rooms, 2 nights @ ₹3,500 -> Expected ₹28,000
  await prisma.tripHotel.update({
    where: { id: th1.id },
    data: { rooms: 4, totalAmount: 7000 },
  });
  costing = await tripCostingService.calculateTripCosting(agencyId, tripId);
  if (!costing) throw new Error("Costing returned null");
  assert(costing.hotelsTotal === 28000, "Scenario 4: 4 rooms × 2 nights @ ₹3,500 = ₹28,000", `got ₹${costing.hotelsTotal}`);
  assert(costing.hotels[0].rooms === 4, "Scenario 4: Hotel item has rooms = 4");
  assert(costing.hotels[0].totalCost === 28000, "Scenario 4: Item totalCost is ₹28,000");

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- 2. MULTIPLE HOTELS WITH DIFFERENT ROOMS & NIGHTS ---");
  // ──────────────────────────────────────────────────────────────────────────

  // Scenario 5: Hotel A: ₹3,500 × 2 rooms × 2 nights = ₹14,000
  //             Hotel B: ₹4,000 × 3 rooms × 3 nights = ₹36,000
  //             Total Expected = ₹50,000
  await resetTrip(checkIn, new Date("2026-10-06T12:00:00Z"));
  await prisma.tripHotel.create({
    data: {
      tripId,
      hotelId: hotel1.id,
      checkIn: new Date("2026-10-01T12:00:00Z"),
      checkOut: new Date("2026-10-03T12:00:00Z"), // 2 nights
      roomType: "Deluxe Room",
      rooms: 2,
      nightlyRate: 3500,
      totalAmount: 7000, // Stale totalAmount
    },
  });

  await prisma.tripHotel.create({
    data: {
      tripId,
      hotelId: hotel2.id,
      checkIn: new Date("2026-10-03T12:00:00Z"),
      checkOut: new Date("2026-10-06T12:00:00Z"), // 3 nights
      roomType: "Luxury Suite",
      rooms: 3,
      nightlyRate: 4000,
      totalAmount: 12000, // Stale totalAmount
    },
  });

  costing = await tripCostingService.calculateTripCosting(agencyId, tripId);
  if (!costing) throw new Error("Costing returned null");
  assert(costing.hotels.length === 2, "Scenario 5: Exactly 2 hotel items returned");
  assert(costing.hotels[0].totalCost === 14000, "Scenario 5: Hotel A cost is ₹14,000");
  assert(costing.hotels[1].totalCost === 36000, "Scenario 5: Hotel B cost is ₹36,000");
  assert(costing.hotelsTotal === 50000, "Scenario 5: Combined hotel subtotal is ₹50,000 (14,000 + 36,000)", `got ₹${costing.hotelsTotal}`);

  // Scenario 6: Different nights per hotel
  // Hotel A: 1 night @ 3500 × 2 rooms = 7,000
  // Hotel B: 5 nights @ 4000 × 3 rooms = 60,000
  // Combined = 67,000
  const tripHotels = await prisma.tripHotel.findMany({ where: { tripId } });
  await prisma.tripHotel.update({
    where: { id: tripHotels[0].id },
    data: {
      checkIn: new Date("2026-10-01T12:00:00Z"),
      checkOut: new Date("2026-10-02T12:00:00Z"), // 1 night
    },
  });
  await prisma.tripHotel.update({
    where: { id: tripHotels[1].id },
    data: {
      checkIn: new Date("2026-10-02T12:00:00Z"),
      checkOut: new Date("2026-10-07T12:00:00Z"), // 5 nights
    },
  });
  costing = await tripCostingService.calculateTripCosting(agencyId, tripId);
  if (!costing) throw new Error("Costing returned null");
  const hotelA6 = costing.hotels.find((h) => h.hotelId === hotel1.id)!;
  const hotelB6 = costing.hotels.find((h) => h.hotelId === hotel2.id)!;
  assert(hotelA6.nights === 1, "Scenario 6: Hotel A has 1 night");
  assert(hotelA6.totalCost === 7000, "Scenario 6: Hotel A cost = ₹7,000 (3500 * 2 * 1)");
  assert(hotelB6.nights === 5, "Scenario 6: Hotel B has 5 nights");
  assert(hotelB6.totalCost === 60000, "Scenario 6: Hotel B cost = ₹60,000 (4000 * 3 * 5)");
  assert(costing.hotelsTotal === 67000, "Scenario 6: Combined hotel subtotal = ₹67,000", `got ₹${costing.hotelsTotal}`);

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- 3. REACTIVE MUTATION SCENARIOS (HOTEL UPDATES) ---");
  // ──────────────────────────────────────────────────────────────────────────

  // Scenario 7: Dynamic room count change on Hotel A from 2 rooms to 5 rooms
  // Hotel A: 3500 * 5 * 1 = 17,500
  // Total = 17,500 + 60,000 = 77,500
  await prisma.tripHotel.update({
    where: { id: tripHotels.find((th) => th.hotelId === hotel1.id)!.id },
    data: { rooms: 5 },
  });
  costing = await tripCostingService.calculateTripCosting(agencyId, tripId);
  if (!costing) throw new Error("Costing returned null");
  const hotelA7 = costing.hotels.find((h) => h.hotelId === hotel1.id)!;
  assert(hotelA7.rooms === 5, "Scenario 7: Rooms updated to 5");
  assert(hotelA7.totalCost === 17500, "Scenario 7: Hotel A cost updated to ₹17,500");
  assert(costing.hotelsTotal === 77500, "Scenario 7: Total hotel cost is ₹77,500", `got ₹${costing.hotelsTotal}`);

  // Scenario 8: Change check-in/check-out dates on Hotel A (extend from 1 night to 4 nights)
  // Hotel A: 3500 * 5 rooms * 4 nights = 70,000
  await prisma.tripHotel.update({
    where: { id: tripHotels.find((th) => th.hotelId === hotel1.id)!.id },
    data: {
      checkIn: new Date("2026-10-01T12:00:00Z"),
      checkOut: new Date("2026-10-05T12:00:00Z"), // 4 nights
    },
  });
  costing = await tripCostingService.calculateTripCosting(agencyId, tripId);
  if (!costing) throw new Error("Costing returned null");
  const hotelA8 = costing.hotels.find((h) => h.hotelId === hotel1.id)!;
  assert(hotelA8.nights === 4, "Scenario 8: Nights updated to 4");
  assert(hotelA8.totalCost === 70000, "Scenario 8: Hotel A cost updated to ₹70,000 (3500 * 5 * 4)");

  // Scenario 9: Change nightly rate on Hotel A (from 3500 to 5000)
  // Hotel A: 5000 * 5 rooms * 4 nights = 100,000
  await prisma.tripHotel.update({
    where: { id: tripHotels.find((th) => th.hotelId === hotel1.id)!.id },
    data: { nightlyRate: 5000 },
  });
  costing = await tripCostingService.calculateTripCosting(agencyId, tripId);
  if (!costing) throw new Error("Costing returned null");
  const hotelA9 = costing.hotels.find((h) => h.hotelId === hotel1.id)!;
  assert(hotelA9.nightlyRate === 5000, "Scenario 9: Nightly rate updated to ₹5,000");
  assert(hotelA9.totalCost === 100000, "Scenario 9: Hotel A cost updated to ₹100,000 (5000 * 5 * 4)");

  // Scenario 10: Explicit TRIP_SNAPSHOT rate source check
  const hotelA10 = costing.hotels.find((h) => h.hotelId === hotel1.id)!;
  const hotelB10 = costing.hotels.find((h) => h.hotelId === hotel2.id)!;
  assert(hotelA10.rateSource === "TRIP_SNAPSHOT", "Scenario 10: rateSource is TRIP_SNAPSHOT");
  assert(hotelB10.rateSource === "TRIP_SNAPSHOT", "Scenario 10: rateSource is TRIP_SNAPSHOT");

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- 4. RATESHEET PATH PRESERVATION (SCENARIO 11) ---");
  // ──────────────────────────────────────────────────────────────────────────

  // Scenario 11: Create an active RateSheet with hotel rates and ensure RateSheet path is active and accurate
  const supplier = await prisma.supplier.upsert({
    where: { id: "qa13-supplier-1" },
    update: {},
    create: {
      id: "qa13-supplier-1",
      agencyId: agency.id,
      name: "Luxury Hotels Supplier Ltd",
      contactPerson: "Rajesh Sharma",
      email: "rajesh@luxhotels.internal",
      phone: "+919876543219",
    },
  });

  const rateSheet = await prisma.rateSheet.upsert({
    where: { id: "qa13-ratesheet-1" },
    update: {
      status: "ACTIVE",
      costPrice: 6000,
      hotelId: hotel1.id,
      roomType: "Deluxe Room",
    },
    create: {
      id: "qa13-ratesheet-1",
      agencyId: agency.id,
      supplierId: supplier.id,
      rateSheetNumber: "RS-QA13-001",
      name: "Grand Palace Contract 2026",
      inventoryType: "HOTEL",
      hotelId: hotel1.id,
      roomType: "Deluxe Room",
      status: "ACTIVE",
      currency: "INR",
      costPrice: 6000,
      validFrom: new Date("2026-01-01T00:00:00Z"),
      validTo: new Date("2026-12-31T23:59:59Z"),
    },
  });

  // Re-calculate costing for trip with hotel1 (5 rooms, 4 nights)
  costing = await tripCostingService.calculateTripCosting(agencyId, tripId);
  if (!costing) throw new Error("Costing returned null");
  const matchedHotel = costing.hotels.find((h) => h.hotelId === hotel1.id);
  assert(matchedHotel !== undefined, "Scenario 11: Hotel 1 item found in costing");
  assert(matchedHotel?.rateSource === "RATE_SHEET", "Scenario 11: RateSheet rate matched (rateSource === 'RATE_SHEET')");
  assert(matchedHotel?.nightlyRate === 6000, "Scenario 11: RateSheet nightly rate ₹6,000 used");
  // RateSheet calculation: 6000 * 5 rooms * 4 nights = 120,000
  assert(matchedHotel?.totalCost === 120000, "Scenario 11: RateSheet totalCost = ₹120,000 (6000 * 5 * 4)", `got ₹${matchedHotel?.totalCost}`);

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- 5. MIXED-SERVICE COSTING REGRESSION ---");
  // ──────────────────────────────────────────────────────────────────────────

  // Reset to clean test state:
  // Hotel: 1 hotel, 2 rooms, 2 nights @ ₹3,500 = ₹14,000
  // Vehicle: 1 vehicle, per km, 200 km @ ₹25/km = ₹5,000
  // Activity: 1 activity, 2 participants @ ₹2,500/adult = ₹5,000
  // Total Costing Subtotal Expected = ₹24,000
  await resetTrip(new Date("2026-10-01T12:00:00Z"), new Date("2026-10-03T12:00:00Z"));

  await prisma.tripHotel.create({
    data: {
      tripId,
      hotelId: hotel2.id, // using hotel2 so it doesn't match hotel1's RateSheet
      checkIn: new Date("2026-10-01T12:00:00Z"),
      checkOut: new Date("2026-10-03T12:00:00Z"),
      roomType: "Deluxe Room",
      rooms: 2,
      nightlyRate: 3500,
      totalAmount: 14000,
    },
  });

  await prisma.tripVehicle.create({
    data: {
      tripId,
      vehicleId: vehicleMaster.id,
      vehicleName: "Toyota Innova Crysta",
      vehicleType: "SUV",
      pricingType: "PER_KM",
      ratePerKm: 25,
      estimatedKm: 200,
      totalRate: 5000,
    },
  });

  await prisma.tripActivity.create({
    data: {
      tripId,
      activityId: activityMaster.id,
      name: "Hot Air Balloon Safari",
      date: new Date("2026-10-02T09:00:00Z"),
      numberOfParticipants: 2,
      adultPrice: 2500,
      childPrice: 0,
      totalPrice: 5000,
    },
  });

  costing = await tripCostingService.calculateTripCosting(agencyId, tripId);
  if (!costing) throw new Error("Costing returned null");
  assert(costing.hotelsTotal === 14000, "Mixed Service: Hotel Cost is ₹14,000");
  assert(costing.vehiclesTotal === 5000, "Mixed Service: Vehicle Cost is ₹5,000");
  assert(costing.activitiesTotal === 5000, "Mixed Service: Activity Cost is ₹5,000");
  assert(costing.subtotal === 24000, "Mixed Service: Total Trip Cost is ₹24,000 (14,000 + 5,000 + 5,000)", `got ₹${costing.subtotal}`);

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n--- 6. QUOTATION -> BOOKING -> INVOICE END-TO-END REGRESSION ---");
  // ──────────────────────────────────────────────────────────────────────────

  // 1. Generate Quotation from Trip Costing
  const quotation = await quotationService.generateQuotationFromTrip(agencyId, tripId, {
    markupPercentage: 10,       // 10% Markup on ₹24,000 = ₹2,400 -> Selling base = ₹26,400
    discountPercentage: 5,      // 5% Discount on ₹26,400 = ₹1,320 -> Taxable = ₹25,080
    taxRate: 18,                // 18% Exclusive GST
    taxPercentage: 18,
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE, // CGST 9% (2,257.20) + SGST 9% (2,257.20) = ₹4,514.40
  });

  assert(quotation !== null, "Quotation generated successfully");
  assert(Number(quotation.subtotal) === 24000, "Quotation subtotal is ₹24,000", `got ₹${quotation.subtotal}`);
  assert(Number(quotation.markupAmount) === 2400, "Quotation markupAmount is ₹2,400 (10%)", `got ₹${quotation.markupAmount}`);
  assert(Number(quotation.discountAmount) === 1320, "Quotation discountAmount is ₹1,320 (5%)", `got ₹${quotation.discountAmount}`);
  assert(Number(quotation.taxableAmount) === 25080, "Quotation taxableAmount is ₹25,080", `got ₹${quotation.taxableAmount}`);
  assert(Number(quotation.taxAmount) === 4514.4, "Quotation taxAmount is ₹4,514.40 (18% Exclusive)", `got ₹${quotation.taxAmount}`);
  // Final customer amount: 25,080 + 4,514.40 = 29,594.40
  assert(Number(quotation.finalAmount) === 29594.4, "Quotation finalAmount is ₹29,594.40", `got ₹${quotation.finalAmount}`);

  // Verify line items include the multi-room hotel line item with correct cost
  const hotelLineItem = quotation.items.find((item) => item.type === "HOTEL");
  assert(hotelLineItem !== undefined, "Hotel line item exists in quotation");
  // Selling price with 10% markup: 14000 * 1.10 = 15400
  assert(Number(hotelLineItem?.sellingPrice) === 15400, "Hotel line item sellingPrice is ₹15,400 (₹14,000 + 10% markup)", `got ₹${hotelLineItem?.sellingPrice}`);

  // 2. Convert Quotation to Booking
  const booking = await bookingService.convertQuotationToBooking(agencyId, quotation.id);

  assert(booking !== null, "Booking converted successfully from quotation");
  assert(Number(booking.totalAmount) === 29594.4, "Booking totalAmount matches Quotation finalAmount exactly (₹29,594.40)", `got ₹${booking.totalAmount}`);
  assert(booking.quotationId === quotation.id, "Booking is linked to quotation");

  // Ensure booking is CONFIRMED for invoice creation
  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CONFIRMED" },
  });

  // 3. Generate Invoice from Booking
  const invoice = await invoiceService.getOrCreateInvoiceForBooking(agencyId, booking.id);

  assert(invoice !== null, "Invoice generated successfully from booking");
  assert(Number(invoice.taxableAmount) === 25080, "Invoice taxableAmount matches Quotation Taxable Amount (₹25,080)", `got ₹${invoice.taxableAmount}`);
  assert(Number(invoice.taxAmount) === 4514.4, "Invoice taxAmount matches Quotation taxAmount (₹4,514.40)", `got ₹${invoice.taxAmount}`);
  assert(Number(invoice.totalAmount) === 29594.4, "Invoice totalAmount matches Quotation and Booking finalAmount (₹29,594.40)", `got ₹${invoice.totalAmount}`);

  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════════");
  console.log(`🏁 QA-13 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("══════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    throw new Error(`QA-13 test suite failed with ${failed} failure(s).`);
  }
}

runMultiRoomCostingTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
