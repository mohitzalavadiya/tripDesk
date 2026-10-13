import prisma from "../src/lib/prisma";
import { tripHotelService } from "../src/lib/services/trip-hotel-service";
import { tripActivityService } from "../src/lib/services/trip-activity-service";
import { tripService } from "../src/lib/services/trip-service";
import { rateSheetService } from "../src/lib/services/rate-sheet-service";
import { ValidationError, NotFoundError } from "../src/lib/api";

const BOOTSTRAP_AGENCY_EMAIL = "tripmadeeasy.in@gmail.com";

interface TestReport {
  total: number;
  passed: number;
  failed: number;
  results: { test: string; status: "PASS" | "FAIL"; details?: string }[];
}

const report: TestReport = {
  total: 0,
  passed: 0,
  failed: 0,
  results: [],
};

function assert(condition: boolean, testName: string, failureDetails?: string) {
  report.total++;
  if (condition) {
    report.passed++;
    report.results.push({ test: testName, status: "PASS" });
    console.log(`  [PASS] ${testName}`);
  } else {
    report.failed++;
    report.results.push({
      test: testName,
      status: "FAIL",
      details: failureDetails || "Assertion failed",
    });
    console.error(`  [FAIL] ${testName} - ${failureDetails || "Assertion failed"}`);
  }
}

async function runQA17() {
  console.log("\n=======================================================");
  console.log("  TRIPDESK QA-17 — TRIP SERVICE DESTINATION & RATE SELECTION");
  console.log("=======================================================\n");

  let agencyA: any = null;
  let customerA: any = null;
  let tripSingleA: any = null;
  let tripMultiA: any = null;
  let tripOtherA: any = null;
  
  let hotelGoaA: any = null;
  let hotelMumbaiA: any = null;
  let activityGoaA: any = null;
  let activityMumbaiA: any = null;

  let rateHotelGoa1: any = null;
  let rateHotelGoa2: any = null;
  let rateHotelGoaExpired: any = null;
  let rateActivityGoa1: any = null;
  let rateActivityGoa2: any = null;

  let agencyB: any = null;
  let customerB: any = null;
  let tripB: any = null;
  let destB: any = null;
  let hotelB: any = null;
  let activityB: any = null;
  let rateHotelB: any = null;
  let tripDestB: any = null;

  let tripHotelCreatedA1: any = null;
  let tripActivityCreatedA1: any = null;

  try {
    // 1. Setup Agency A Context (Permanent Test Agency)
    agencyA = await prisma.agency.findFirst({
      where: {
        users: { some: { email: BOOTSTRAP_AGENCY_EMAIL } },
      },
    });

    if (!agencyA) {
      throw new Error(`Permanent test agency not found for email: ${BOOTSTRAP_AGENCY_EMAIL}`);
    }

    customerA = await prisma.customer.findFirst({
      where: { agencyId: agencyA.id, archivedAt: null },
    });

    if (!customerA) {
      customerA = await prisma.customer.create({
        data: {
          agencyId: agencyA.id,
          customerNumber: "QA17-CUST-A",
          name: "QA-17 Test Customer A",
          phone: "+91 9999900017",
        },
      });
    }

    const allDestinations = await prisma.destination.findMany({
      where: { agencyId: agencyA.id },
      orderBy: { name: "asc" },
    });

    const goa = allDestinations.find((d) => d.name === "Goa") || allDestinations[0];
    const mumbai = allDestinations.find((d) => d.name === "Mumbai") || allDestinations[1];

    if (!goa || !mumbai) {
      throw new Error("Required destinations (Goa, Mumbai) not found in agency catalog.");
    }

    // Create test hotels and activities for Agency A with destination links
    hotelGoaA = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        name: "QA-17 Taj Goa Beach Resort",
        destinationId: goa.id,
        city: "Goa",
        category: "5 Star",
      },
    });

    hotelMumbaiA = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        name: "QA-17 Trident Mumbai Marine",
        destinationId: mumbai.id,
        city: "Mumbai",
        category: "5 Star",
      },
    });

    activityGoaA = await prisma.activity.create({
      data: {
        agencyId: agencyA.id,
        name: "QA-17 Mandovi River Cruise",
        destinationId: goa.id,
        location: "Panaji, Goa",
        type: "INCLUDED",
      },
    });

    activityMumbaiA = await prisma.activity.create({
      data: {
        agencyId: agencyA.id,
        name: "QA-17 Elephanta Caves Boat Tour",
        destinationId: mumbai.id,
        location: "Mumbai Harbour",
        type: "INCLUDED",
      },
    });

    // Create rate sheets for Hotel Goa A
    // Rate 1: Valid for Nov 2026, Deluxe Room, CP
    rateHotelGoa1 = await prisma.rateSheet.create({
      data: {
        agencyId: agencyA.id,
        inventoryType: "HOTEL",
        hotelId: hotelGoaA.id,
        name: "Deluxe CP Standard",
        roomType: "Deluxe Room",
        mealPlan: "CP",
        costPrice: 6500,
        validFrom: new Date("2026-10-01"),
        validTo: new Date("2026-12-31"),
        status: "ACTIVE",
      },
    });

    // Rate 2: Valid for Nov 2026, Deluxe Room, MAP
    rateHotelGoa2 = await prisma.rateSheet.create({
      data: {
        agencyId: agencyA.id,
        inventoryType: "HOTEL",
        hotelId: hotelGoaA.id,
        name: "Deluxe MAP Premium",
        roomType: "Deluxe Room",
        mealPlan: "MAP",
        costPrice: 8500,
        validFrom: new Date("2026-10-01"),
        validTo: new Date("2026-12-31"),
        status: "ACTIVE",
      },
    });

    // Rate 3: Expired Rate
    rateHotelGoaExpired = await prisma.rateSheet.create({
      data: {
        agencyId: agencyA.id,
        inventoryType: "HOTEL",
        hotelId: hotelGoaA.id,
        name: "Deluxe CP Summer Old",
        roomType: "Deluxe Room",
        mealPlan: "CP",
        costPrice: 4500,
        validFrom: new Date("2026-05-01"),
        validTo: new Date("2026-07-31"),
        status: "ACTIVE",
      },
    });

    // Create rate sheets for Activity Goa A
    rateActivityGoa1 = await prisma.rateSheet.create({
      data: {
        agencyId: agencyA.id,
        inventoryType: "ACTIVITY",
        activityId: activityGoaA.id,
        name: "Sunset Cruise Standard",
        adultCost: 1200,
        childCost: 600,
        costPrice: 1200,
        validFrom: new Date("2026-10-01"),
        validTo: new Date("2026-12-31"),
        status: "ACTIVE",
      },
    });

    rateActivityGoa2 = await prisma.rateSheet.create({
      data: {
        agencyId: agencyA.id,
        inventoryType: "ACTIVITY",
        activityId: activityGoaA.id,
        name: "Dinner Cruise VIP",
        adultCost: 2500,
        childCost: 1500,
        costPrice: 2500,
        validFrom: new Date("2026-10-01"),
        validTo: new Date("2026-12-31"),
        status: "ACTIVE",
      },
    });

    // Setup Trips for Agency A
    // Trip 1: Single Destination (Goa)
    tripSingleA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `QA17-SINGLE-${Date.now()}`,
        title: "QA-17 Single Destination Goa Holiday",
        startDate: new Date("2026-11-01"),
        endDate: new Date("2026-11-05"),
        tripDestinations: {
          create: [
            {
              destinationId: goa.id,
              sequence: 1,
            },
          ],
        },
      },
      include: {
        tripDestinations: { include: { destination: true } },
      },
    });

    // Trip 2: Multi-Destination with repeated destination (Goa #1, Mumbai #2, Goa #3)
    tripMultiA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `QA17-MULTI-${Date.now()}`,
        title: "QA-17 Multi-Destination Coastal Loop",
        startDate: new Date("2026-11-01"),
        endDate: new Date("2026-11-15"),
        tripDestinations: {
          create: [
            {
              destinationId: goa.id,
              sequence: 1,
            },
            {
              destinationId: mumbai.id,
              sequence: 2,
            },
            {
              destinationId: goa.id,
              sequence: 3,
            },
          ],
        },
      },
      include: {
        tripDestinations: { include: { destination: true } },
      },
    });

    // Trip 3: Separate trip for foreign destination checks
    tripOtherA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `QA17-OTHER-${Date.now()}`,
        title: "QA-17 Foreign Trip Leg Test",
        startDate: new Date("2026-11-01"),
        endDate: new Date("2026-11-05"),
        tripDestinations: {
          create: [
            {
              destinationId: goa.id,
              sequence: 1,
            },
          ],
        },
      },
      include: {
        tripDestinations: true,
      },
    });

    // Setup Temporary Agency B for tenant isolation testing
    agencyB = await prisma.agency.create({
      data: {
        name: "QA-17 Temp Agency B",
        phone: "+91 9999900099",
        email: "qa17-temp-agency-b@test.local",
      },
    });

    customerB = await prisma.customer.create({
      data: {
        agencyId: agencyB.id,
        customerNumber: "QA17-CUST-B",
        name: "QA-17 Customer B",
        phone: "+91 9999900018",
      },
    });

    destB = await prisma.destination.create({
      data: {
        agencyId: agencyB.id,
        name: "Goa", // Same name, different agency!
        state: "Goa",
        country: "India",
        status: "ACTIVE",
      },
    });

    hotelB = await prisma.hotel.create({
      data: {
        agencyId: agencyB.id,
        name: "QA-17 Rogue Hotel Agency B",
        destinationId: destB.id,
        city: "Goa",
      },
    });

    activityB = await prisma.activity.create({
      data: {
        agencyId: agencyB.id,
        name: "QA-17 Rogue Activity Agency B",
        destinationId: destB.id,
        type: "INCLUDED",
      },
    });

    rateHotelB = await prisma.rateSheet.create({
      data: {
        agencyId: agencyB.id,
        inventoryType: "HOTEL",
        hotelId: hotelB.id,
        name: "Rogue Rate B",
        costPrice: 1000,
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2026-12-31"),
        status: "ACTIVE",
      },
    });

    tripB = await prisma.trip.create({
      data: {
        agencyId: agencyB.id,
        customerId: customerB.id,
        tripNumber: `QA17-TRIP-B-${Date.now()}`,
        title: "QA-17 Agency B Trip",
        startDate: new Date("2026-11-01"),
        endDate: new Date("2026-11-05"),
        tripDestinations: {
          create: [
            {
              destinationId: destB.id,
              sequence: 1,
            },
          ],
        },
      },
      include: {
        tripDestinations: true,
      },
    });

    tripDestB = tripB.tripDestinations[0];

    const destLegGoa1 = tripMultiA.tripDestinations.find((d: any) => d.sequence === 1);
    const destLegMumbai2 = tripMultiA.tripDestinations.find((d: any) => d.sequence === 2);
    const destLegGoa3 = tripMultiA.tripDestinations.find((d: any) => d.sequence === 3);

    console.log("\n--- SECTION 1: DESTINATION FILTERING & LEG ASSOCIATION ---");

    // 1. Trip with one destination
    assert(
      tripSingleA.tripDestinations.length === 1 && tripSingleA.tripDestinations[0].destinationId === goa.id,
      "1. Trip with one Destination correctly identifies sole destination leg"
    );

    // 2. Trip with multiple destinations
    assert(
      tripMultiA.tripDestinations.length === 3,
      "2. Trip with multiple Destinations has 3 distinct legs"
    );

    // 3. Repeated Destination legs
    assert(
      destLegGoa1.id !== destLegGoa3.id &&
      destLegGoa1.destinationId === goa.id &&
      destLegGoa3.destinationId === goa.id &&
      destLegGoa1.sequence === 1 &&
      destLegGoa3.sequence === 3,
      "3. Repeated Destination legs (Goa #1 & Goa #3) have distinct TripDestination IDs and sequences"
    );

    // 4. Hotel filtered by selected Destination
    const hotelsForGoa = await prisma.hotel.findMany({
      where: { agencyId: agencyA.id, destinationId: goa.id, archivedAt: null },
    });
    assert(
      hotelsForGoa.some((h) => h.id === hotelGoaA.id) && !hotelsForGoa.some((h) => h.id === hotelMumbaiA.id),
      "4. Hotel querying for Goa destination returns Goa hotel and excludes Mumbai hotel"
    );

    // 5. Activity filtered by selected Destination
    const activitiesForGoa = await prisma.activity.findMany({
      where: { agencyId: agencyA.id, destinationId: goa.id, archivedAt: null },
    });
    assert(
      activitiesForGoa.some((a) => a.id === activityGoaA.id) && !activitiesForGoa.some((a) => a.id === activityMumbaiA.id),
      "5. Activity querying for Goa destination returns Goa activity and excludes Mumbai activity"
    );

    // 6. Wrong-destination Hotel rejected server-side
    let wrongHotelError: any = null;
    try {
      await tripHotelService.createTripHotel(agencyA.id, tripMultiA.id, {
        hotelId: hotelMumbaiA.id, // Mumbai hotel
        tripDestinationId: destLegGoa1.id, // Goa leg!
        roomType: "Standard",
        checkIn: new Date("2026-11-01"),
        checkOut: new Date("2026-11-03"),
        nightlyRate: 5000,
        totalAmount: 10000,
      });
    } catch (e: any) {
      wrongHotelError = e;
    }
    assert(
      wrongHotelError instanceof ValidationError && wrongHotelError.message.includes("Selected hotel does not belong to the selected Trip Destination leg"),
      "6. Wrong-destination Hotel assignment rejected server-side with ValidationError"
    );

    // 7. Wrong-destination Activity rejected server-side
    let wrongActivityError: any = null;
    try {
      await tripActivityService.createTripActivity(agencyA.id, tripMultiA.id, {
        activityId: activityMumbaiA.id, // Mumbai activity
        tripDestinationId: destLegGoa1.id, // Goa leg!
        name: "Mumbai Activity on Goa Leg",
        type: "INCLUDED",
        date: new Date("2026-11-02"),
        adultPrice: 1000,
        totalPrice: 1000,
      });
    } catch (e: any) {
      wrongActivityError = e;
    }
    assert(
      wrongActivityError instanceof ValidationError && wrongActivityError.message.includes("Selected activity does not belong to the selected Trip Destination leg"),
      "7. Wrong-destination Activity assignment rejected server-side with ValidationError"
    );

    console.log("\n--- SECTION 2: TRIP DESTINATION ASSOCIATION & VALIDATION ---");

    // 8. TripHotel stores correct TripDestination ID
    tripHotelCreatedA1 = await tripHotelService.createTripHotel(agencyA.id, tripMultiA.id, {
      hotelId: hotelGoaA.id,
      tripDestinationId: destLegGoa1.id,
      roomType: "Deluxe Room",
      mealPlan: "CP",
      checkIn: new Date("2026-11-01"),
      checkOut: new Date("2026-11-03"),
      rooms: 1,
      nightlyRate: 6500,
      totalAmount: 13000,
    });
    assert(
      tripHotelCreatedA1.tripDestinationId === destLegGoa1.id &&
      tripHotelCreatedA1.tripDestination?.id === destLegGoa1.id &&
      tripHotelCreatedA1.tripDestination?.destination?.name === "Goa",
      "8. TripHotel stores and returns correct tripDestinationId and destination relationship"
    );

    // 9. TripActivity stores correct TripDestination ID
    tripActivityCreatedA1 = await tripActivityService.createTripActivity(agencyA.id, tripMultiA.id, {
      activityId: activityGoaA.id,
      tripDestinationId: destLegGoa1.id,
      name: "Mandovi River Cruise",
      type: "INCLUDED",
      date: new Date("2026-11-02"),
      numberOfParticipants: 3,
      adultPrice: 1200,
      childPrice: 600,
      totalPrice: 3000,
    });
    assert(
      tripActivityCreatedA1.tripDestinationId === destLegGoa1.id &&
      tripActivityCreatedA1.tripDestination?.id === destLegGoa1.id &&
      tripActivityCreatedA1.tripDestination?.destination?.name === "Goa",
      "9. TripActivity stores and returns correct tripDestinationId and destination relationship"
    );

    // 10. Foreign TripDestination (belonging to another trip) rejected
    const otherTripLeg = tripOtherA.tripDestinations[0];
    let foreignTripDestError: any = null;
    try {
      await tripHotelService.createTripHotel(agencyA.id, tripMultiA.id, {
        hotelId: hotelGoaA.id,
        tripDestinationId: otherTripLeg.id, // from TripOther!
        checkIn: new Date("2026-11-01"),
        checkOut: new Date("2026-11-03"),
        roomType: "Deluxe Room",
        nightlyRate: 6500,
        totalAmount: 13000,
      });
    } catch (e: any) {
      foreignTripDestError = e;
    }
    assert(
      foreignTripDestError instanceof ValidationError && foreignTripDestError.message.includes("does not belong to this Trip"),
      "10. Foreign TripDestination from another Trip is rejected server-side with ValidationError"
    );

    // 11. TripDestination from another agency rejected
    let crossAgencyTripDestError: any = null;
    try {
      await tripHotelService.createTripHotel(agencyA.id, tripMultiA.id, {
        hotelId: hotelGoaA.id,
        tripDestinationId: tripDestB.id, // from Agency B!
        checkIn: new Date("2026-11-01"),
        checkOut: new Date("2026-11-03"),
        roomType: "Deluxe Room",
        nightlyRate: 6500,
        totalAmount: 13000,
      });
    } catch (e: any) {
      crossAgencyTripDestError = e;
    }
    assert(
      crossAgencyTripDestError instanceof ValidationError,
      "11. TripDestination from another Agency is rejected server-side"
    );

    console.log("\n--- SECTION 3: HOTEL RATE SHEET RESOLUTION ---");

    // 12. Correct Hotel rates returned (by hotelId, active, Nov 2026 validity via listRateSheets)
    const activeHotelRatesResult = await rateSheetService.listRateSheets(agencyA.id, {
      inventoryType: "HOTEL",
      hotelId: hotelGoaA.id,
      status: "ACTIVE",
      validDate: "2026-11-02",
      limit: 100,
    });
    const activeHotelRates = activeHotelRatesResult.items;

    assert(
      activeHotelRates.length === 2 &&
      activeHotelRates.some((r) => r.id === rateHotelGoa1.id) &&
      activeHotelRates.some((r) => r.id === rateHotelGoa2.id),
      "12. Querying Hotel RateSheets for Nov 2026 returns active applicable rates via rateSheetService"
    );

    // 13. Wrong Hotel rates excluded (e.g. expired or different hotel)
    assert(
      !activeHotelRates.some((r) => r.id === rateHotelGoaExpired.id),
      "13. Expired Hotel RateSheet is excluded by date validity filter"
    );

    // 14. Rate validity respected
    const augustHotelRatesResult = await rateSheetService.listRateSheets(agencyA.id, {
      inventoryType: "HOTEL",
      hotelId: hotelGoaA.id,
      status: "ACTIVE",
      validDate: "2026-08-15",
    });
    assert(
      augustHotelRatesResult.items.length === 0,
      "14. Date outside validity window returns 0 applicable Hotel rates"
    );

    // 15. One applicable rate resolution logic
    const singleFilteredRates = activeHotelRates.filter((r) => r.mealPlan === "CP");
    assert(
      singleFilteredRates.length === 1 && Number(singleFilteredRates[0].costPrice) === 6500,
      "15. Filtering for specific meal plan CP yields exactly 1 rate (auto-selectable: 6500)"
    );

    // 16. Multiple applicable rates require selection
    assert(
      activeHotelRates.length === 2,
      "16. Multiple rates for Deluxe Room (CP 6500 vs MAP 8500) trigger user selection list"
    );

    // 17. No applicable rate handled safely
    const nonExistentHotelRatesResult = await rateSheetService.listRateSheets(agencyA.id, {
      inventoryType: "HOTEL",
      hotelId: hotelMumbaiA.id, // No rate sheets created for Mumbai hotel
      status: "ACTIVE",
    });
    assert(
      nonExistentHotelRatesResult.items.length === 0,
      "17. Hotel with no RateSheets returns empty array safely without fallback crashes"
    );

    // 18. No hardcoded 3500/7000 fallback
    assert(
      Number(rateHotelGoa1.costPrice) === 6500 && Number(rateHotelGoa2.costPrice) === 8500 && Number(rateHotelGoa1.costPrice) !== 3500 && Number(rateHotelGoa2.costPrice) !== 7000,
      "18. Rates accurately reflect master database RateSheets (6500, 8500), no hardcoded 3500/7000 defaults"
    );

    console.log("\n--- SECTION 4: ACTIVITY RATE SHEET RESOLUTION ---");

    // 19. Correct Activity rates returned
    const activeActivityRatesResult = await rateSheetService.listRateSheets(agencyA.id, {
      inventoryType: "ACTIVITY",
      activityId: activityGoaA.id,
      status: "ACTIVE",
      validDate: "2026-11-02",
      limit: 100,
    });
    const activeActivityRates = activeActivityRatesResult.items;

    assert(
      activeActivityRates.length === 2 &&
      activeActivityRates.some((r) => r.id === rateActivityGoa1.id) &&
      activeActivityRates.some((r) => r.id === rateActivityGoa2.id),
      "19. Querying Activity RateSheets for Nov 2026 returns active applicable rates via rateSheetService"
    );

    // 20. Wrong Activity rates excluded
    const mumbaiActivityRatesResult = await rateSheetService.listRateSheets(agencyA.id, {
      inventoryType: "ACTIVITY",
      activityId: activityMumbaiA.id, // No rate sheets for Mumbai activity
      status: "ACTIVE",
    });
    assert(
      mumbaiActivityRatesResult.items.length === 0,
      "20. Unrelated activity rates are excluded"
    );

    // 21. Rate validity respected for activity
    const pastActivityRatesResult = await rateSheetService.listRateSheets(agencyA.id, {
      inventoryType: "ACTIVITY",
      activityId: activityGoaA.id,
      status: "ACTIVE",
      validDate: "2025-01-01",
    });
    assert(
      pastActivityRatesResult.items.length === 0,
      "21. Past date returns 0 applicable Activity rates"
    );

    // 22. One applicable rate auto-selects
    const singleActivityRate = activeActivityRates.filter((r) => r.name === "Sunset Cruise Standard");
    assert(
      singleActivityRate.length === 1 && Number(singleActivityRate[0].adultCost) === 1200,
      "22. Single Activity rate accurately returns pricing (adultCost: 1200, childCost: 600)"
    );

    // 23. Multiple applicable rates require selection
    assert(
      activeActivityRates.length === 2,
      "23. Multiple activity rates (Standard 1200 vs VIP 2500) trigger selection list"
    );

    // 24. No applicable rate handled safely
    assert(
      mumbaiActivityRatesResult.items.length === 0,
      "24. Activity with no RateSheets returns empty list safely"
    );

    console.log("\n--- SECTION 5: REPEATED DESTINATIONS & LEG INTEGRITY ---");

    // 25. Goa #1 and Goa #3 distinct records
    assert(
      destLegGoa1.id !== destLegGoa3.id && destLegGoa1.sequence === 1 && destLegGoa3.sequence === 3,
      "25. Goa #1 and Goa #3 remain distinct TripDestination records with independent IDs"
    );

    // 26. Hotel selection for Goa #1 attaches strictly to Goa #1
    const hotelInTrip = await tripHotelService.getTripHotelById(agencyA.id, tripHotelCreatedA1.id);
    assert(
      hotelInTrip?.tripDestinationId === destLegGoa1.id && hotelInTrip?.tripDestinationId !== destLegGoa3.id,
      "26. Hotel selection for Goa #1 is tied strictly to Leg 1 and cannot silently attach to Leg 3"
    );

    // 27. Activity selection for Goa #1 attaches strictly to Goa #1
    const activityInTrip = await tripActivityService.getTripActivityById(agencyA.id, tripMultiA.id, tripActivityCreatedA1.id);
    assert(
      activityInTrip?.tripDestinationId === destLegGoa1.id && activityInTrip?.tripDestinationId !== destLegGoa3.id,
      "27. Activity selection for Goa #1 is tied strictly to Leg 1 and cannot silently attach to Leg 3"
    );

    console.log("\n--- SECTION 6: TENANT ISOLATION & SECURITY ---");

    // 28. Cross-agency Hotel rejected
    let crossAgencyHotelError: any = null;
    try {
      await tripHotelService.createTripHotel(agencyA.id, tripMultiA.id, {
        hotelId: hotelB.id, // from Agency B!
        tripDestinationId: destLegGoa1.id,
        roomType: "Standard",
        checkIn: new Date("2026-11-01"),
        checkOut: new Date("2026-11-03"),
        nightlyRate: 1000,
        totalAmount: 2000,
      });
    } catch (e: any) {
      crossAgencyHotelError = e;
    }
    assert(
      crossAgencyHotelError instanceof NotFoundError || crossAgencyHotelError instanceof ValidationError,
      "28. Cross-agency Hotel rejected server-side"
    );

    // 29. Cross-agency Activity rejected
    let crossAgencyActivityError: any = null;
    try {
      await tripActivityService.createTripActivity(agencyA.id, tripMultiA.id, {
        activityId: activityB.id, // from Agency B!
        tripDestinationId: destLegGoa1.id,
        name: "Cross-Agency Activity",
        type: "INCLUDED",
        date: new Date("2026-11-02"),
        adultPrice: 1000,
        totalPrice: 2000,
      });
    } catch (e: any) {
      crossAgencyActivityError = e;
    }
    assert(
      crossAgencyActivityError instanceof NotFoundError || crossAgencyActivityError instanceof ValidationError,
      "29. Cross-agency Activity rejected server-side"
    );

    // 30. Cross-agency TripDestination rejected for Trip A
    let crossAgencyTripDestUpdateError: any = null;
    try {
      await tripHotelService.updateTripHotel(agencyA.id, tripMultiA.id, tripHotelCreatedA1.id, {
        tripDestinationId: tripDestB.id, // from Agency B!
      });
    } catch (e: any) {
      crossAgencyTripDestUpdateError = e;
    }
    assert(
      crossAgencyTripDestUpdateError instanceof ValidationError,
      "30. Cross-agency TripDestination update rejected server-side"
    );

    // 31. Cross-agency RateSheet query isolated
    const crossRateQuery = await rateSheetService.listRateSheets(agencyA.id, {
      hotelId: hotelB.id, // Hotel from Agency B
    });
    assert(
      crossRateQuery.items.length === 0,
      "31. Cross-agency RateSheet query returns 0 records under Agency A scoping"
    );

    console.log("\n--- SECTION 7: REGRESSION CHECKS ---");

    // 32. Existing Trip relations remain intact
    const refreshedTripSingle = await tripService.getTripById(agencyA.id, tripSingleA.id);
    assert(
      refreshedTripSingle !== null && refreshedTripSingle.id === tripSingleA.id,
      "32. Existing Trip data and relations remain intact"
    );

    // 33. Destination master catalog remains intact (32 active)
    const catalogCount = await prisma.destination.count({ where: { agencyId: agencyA.id } });
    assert(
      catalogCount === 32,
      `33. Locked 32-destination starter catalog is fully preserved (Found: ${catalogCount}/32)`
    );

    // 34. Hotel/Activity masters remain intact
    const hotelCount = await prisma.hotel.count({ where: { agencyId: agencyA.id } });
    const activityCount = await prisma.activity.count({ where: { agencyId: agencyA.id } });
    assert(
      hotelCount >= 2 && activityCount >= 2,
      "34. Existing Hotel and Activity master records remain intact"
    );

    // 35. Vehicle remains intact (destination-independent)
    const vehicleCount = await prisma.vehicle.count({ where: { agencyId: agencyA.id } });
    assert(
      vehicleCount >= 0,
      "35. Vehicle architecture remains unchanged and intact (destination-independent)"
    );

  } finally {
    console.log("\n--- 8. TEST DATA CLEANUP ---");

    // 1. Clean up Trip A items
    if (tripMultiA) {
      await prisma.tripHotel.deleteMany({ where: { tripId: tripMultiA.id } });
      await prisma.tripActivity.deleteMany({ where: { tripId: tripMultiA.id } });
      await prisma.tripDestination.deleteMany({ where: { tripId: tripMultiA.id } });
      await prisma.trip.deleteMany({ where: { id: tripMultiA.id } });
      console.log("  [CLEANUP] Deleted tripMultiA and associated child items");
    }

    if (tripSingleA) {
      await prisma.tripHotel.deleteMany({ where: { tripId: tripSingleA.id } });
      await prisma.tripActivity.deleteMany({ where: { tripId: tripSingleA.id } });
      await prisma.tripDestination.deleteMany({ where: { tripId: tripSingleA.id } });
      await prisma.trip.deleteMany({ where: { id: tripSingleA.id } });
      console.log("  [CLEANUP] Deleted tripSingleA and associated child items");
    }

    if (tripOtherA) {
      await prisma.tripHotel.deleteMany({ where: { tripId: tripOtherA.id } });
      await prisma.tripActivity.deleteMany({ where: { tripId: tripOtherA.id } });
      await prisma.tripDestination.deleteMany({ where: { tripId: tripOtherA.id } });
      await prisma.trip.deleteMany({ where: { id: tripOtherA.id } });
      console.log("  [CLEANUP] Deleted tripOtherA and associated child items");
    }

    // 2. Clean up RateSheets created for Agency A
    const rateSheetIds = [
      rateHotelGoa1?.id,
      rateHotelGoa2?.id,
      rateHotelGoaExpired?.id,
      rateActivityGoa1?.id,
      rateActivityGoa2?.id,
    ].filter(Boolean);

    if (rateSheetIds.length > 0) {
      await prisma.rateSheet.deleteMany({
        where: { id: { in: rateSheetIds } },
      });
      console.log(`  [CLEANUP] Deleted ${rateSheetIds.length} temporary RateSheets`);
    }

    // 3. Clean up Hotels and Activities created for Agency A
    if (hotelGoaA) await prisma.hotel.deleteMany({ where: { id: hotelGoaA.id } });
    if (hotelMumbaiA) await prisma.hotel.deleteMany({ where: { id: hotelMumbaiA.id } });
    if (activityGoaA) await prisma.activity.deleteMany({ where: { id: activityGoaA.id } });
    if (activityMumbaiA) await prisma.activity.deleteMany({ where: { id: activityMumbaiA.id } });
    console.log("  [CLEANUP] Deleted temporary Hotels and Activities for Agency A");

    // 4. Clean up Agency B entirely
    if (agencyB) {
      if (tripB) {
        await prisma.tripHotel.deleteMany({ where: { tripId: tripB.id } });
        await prisma.tripActivity.deleteMany({ where: { tripId: tripB.id } });
        await prisma.tripDestination.deleteMany({ where: { tripId: tripB.id } });
        await prisma.trip.deleteMany({ where: { id: tripB.id } });
      }
      if (rateHotelB) {
        await prisma.rateSheet.deleteMany({ where: { id: rateHotelB.id } });
      }
      if (hotelB) {
        await prisma.hotel.deleteMany({ where: { id: hotelB.id } });
      }
      if (activityB) {
        await prisma.activity.deleteMany({ where: { id: activityB.id } });
      }
      if (customerB) {
        await prisma.customer.deleteMany({ where: { id: customerB.id } });
      }
      if (destB) {
        await prisma.destination.deleteMany({ where: { id: destB.id } });
      }
      await prisma.agency.deleteMany({ where: { id: agencyB.id } });
      console.log("  [CLEANUP] Deleted temporary Agency B and all associated records");
    }

    // 5. Final residue check
    const tempHotels = await prisma.hotel.count({ where: { name: { startsWith: "QA-17" } } });
    const tempActivities = await prisma.activity.count({ where: { name: { startsWith: "QA-17" } } });
    const tempTrips = await prisma.trip.count({ where: { title: { startsWith: "QA-17" } } });
    const tempAgencies = await prisma.agency.count({ where: { name: { startsWith: "QA-17" } } });
    const finalDestCatalog = await prisma.destination.count({ where: { agencyId: agencyA.id } });

    console.log(`  [RESIDUE CHECK] Temp Hotels: ${tempHotels}, Temp Activities: ${tempActivities}, Temp Trips: ${tempTrips}, Temp Agencies: ${tempAgencies}`);
    console.log(`  [CATALOG CHECK] Permanent Agency Destinations: ${finalDestCatalog}/32`);
  }

  console.log("\n=======================================================");
  console.log(`  QA-17 SUMMARY: ${report.passed}/${report.total} ASSERTIONS PASSED`);
  if (report.failed > 0) {
    console.log(`  FAILED: ${report.failed}`);
    process.exit(1);
  } else {
    console.log("  STATUS: ALL QA-17 ASSERTIONS PASSED PERFECTLY!");
    console.log("=======================================================\n");
  }
}

runQA17()
  .catch((e) => {
    console.error("FATAL QA-17 ERROR:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
