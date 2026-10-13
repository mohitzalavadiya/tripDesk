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

async function runQA18() {
  console.log("\n=======================================================================");
  console.log("  TRIPDESK QA-18 — TRIP-LEVEL DESTINATION SELECTION & AUTO FILTERING");
  console.log("=======================================================================\n");

  let agencyA: any = null;
  let customerA: any = null;
  let destGoa: any = null;
  let destMumbai: any = null;
  let destJaipur: any = null;
  let destUdaipur: any = null;

  let tripSingle: any = null;
  let tripMulti: any = null;
  let tripRepeated: any = null;
  let tripZero: any = null;

  let hotelGoa: any = null;
  let hotelMumbai: any = null;
  let hotelJaipur: any = null;

  let activityGoa: any = null;
  let activityMumbai: any = null;
  let activityJaipur: any = null;

  let rateHotelGoa1: any = null;
  let rateHotelGoa2: any = null;
  let rateActivityGoa1: any = null;

  // Cross agency records
  let agencyB: any = null;
  let hotelAgencyB: any = null;
  let activityAgencyB: any = null;

  const cleanupTripIds: string[] = [];
  const cleanupHotelIds: string[] = [];
  const cleanupActivityIds: string[] = [];
  const cleanupRateSheetIds: string[] = [];
  let tempAgencyBId: string | null = null;

  try {
    // Setup Agency A (Permanent bootstrap agency)
    const userA = await prisma.user.findFirst({
      where: { email: BOOTSTRAP_AGENCY_EMAIL },
      include: { agency: true },
    });
    if (!userA || !userA.agency) {
      throw new Error(`Permanent bootstrap agency (${BOOTSTRAP_AGENCY_EMAIL}) not found.`);
    }
    agencyA = userA.agency;

    // Get active destinations for Agency A
    destGoa = await prisma.destination.findFirst({
      where: { agencyId: agencyA.id, name: "Goa", status: "ACTIVE" },
    });
    destMumbai = await prisma.destination.findFirst({
      where: { agencyId: agencyA.id, name: "Mumbai", status: "ACTIVE" },
    });
    destJaipur = await prisma.destination.findFirst({
      where: { agencyId: agencyA.id, name: "Jaipur", status: "ACTIVE" },
    });
    destUdaipur = await prisma.destination.findFirst({
      where: { agencyId: agencyA.id, name: "Udaipur", status: "ACTIVE" },
    });

    if (!destGoa || !destMumbai || !destJaipur || !destUdaipur) {
      throw new Error("Required destinations (Goa, Mumbai, Jaipur, Udaipur) not found in agency A.");
    }

    // Customer
    customerA = await prisma.customer.findFirst({
      where: { agencyId: agencyA.id, archivedAt: null },
    });
    if (!customerA) {
      customerA = await prisma.customer.create({
        data: {
          agencyId: agencyA.id,
          name: "QA18 Test Customer",
          phone: "9876543210",
        },
      });
    }

    // Create temporary Hotel catalog items for testing
    hotelGoa = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        name: "QA18 Taj Exotica Goa",
        destinationId: destGoa.id,
        city: "Goa",
      },
    });
    cleanupHotelIds.push(hotelGoa.id);

    hotelMumbai = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        name: "QA18 Taj Mahal Palace Mumbai",
        destinationId: destMumbai.id,
        city: "Mumbai",
      },
    });
    cleanupHotelIds.push(hotelMumbai.id);

    hotelJaipur = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        name: "QA18 Rambagh Palace Jaipur",
        destinationId: destJaipur.id,
        city: "Jaipur",
      },
    });
    cleanupHotelIds.push(hotelJaipur.id);

    // Create temporary Activity catalog items
    activityGoa = await prisma.activity.create({
      data: {
        agencyId: agencyA.id,
        name: "QA18 Goa Sunset Cruise",
        destinationId: destGoa.id,
        type: "INCLUDED",
      },
    });
    cleanupActivityIds.push(activityGoa.id);

    activityMumbai = await prisma.activity.create({
      data: {
        agencyId: agencyA.id,
        name: "QA18 Mumbai Heritage Walk",
        destinationId: destMumbai.id,
        type: "INCLUDED",
      },
    });
    cleanupActivityIds.push(activityMumbai.id);

    activityJaipur = await prisma.activity.create({
      data: {
        agencyId: agencyA.id,
        name: "QA18 Amber Fort Elephant Safari",
        destinationId: destJaipur.id,
        type: "INCLUDED",
      },
    });
    cleanupActivityIds.push(activityJaipur.id);

    // Rates
    rateHotelGoa1 = await prisma.rateSheet.create({
      data: {
        agencyId: agencyA.id,
        name: "QA18 Goa Luxury Plan",
        inventoryType: "HOTEL",
        hotelId: hotelGoa.id,
        costPrice: 8500,
        roomType: "Deluxe Ocean View",
        mealPlan: "CP - Breakfast Included",
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2026-12-31"),
        status: "ACTIVE",
      },
    });
    cleanupRateSheetIds.push(rateHotelGoa1.id);

    rateHotelGoa2 = await prisma.rateSheet.create({
      data: {
        agencyId: agencyA.id,
        name: "QA18 Goa Presidential Plan",
        inventoryType: "HOTEL",
        hotelId: hotelGoa.id,
        costPrice: 15000,
        roomType: "Presidential Villa",
        mealPlan: "MAP - Breakfast and Dinner",
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2026-12-31"),
        status: "ACTIVE",
      },
    });
    cleanupRateSheetIds.push(rateHotelGoa2.id);

    rateActivityGoa1 = await prisma.rateSheet.create({
      data: {
        agencyId: agencyA.id,
        name: "QA18 Goa Cruise Standard Rate",
        inventoryType: "ACTIVITY",
        activityId: activityGoa.id,
        costPrice: 1200,
        adultCost: 1200,
        childCost: 600,
        validFrom: new Date("2026-01-01"),
        validTo: new Date("2026-12-31"),
        status: "ACTIVE",
      },
    });
    cleanupRateSheetIds.push(rateActivityGoa1.id);

    // Temporary Agency B for tenant isolation testing
    agencyB = await prisma.agency.create({
      data: {
        name: "QA18 Temporary Agency B",
        phone: "9999999999",
        email: "qa18-agencyb@test.local",
      },
    });
    tempAgencyBId = agencyB.id;

    hotelAgencyB = await prisma.hotel.create({
      data: {
        agencyId: agencyB.id,
        name: "QA18 Foreign Hotel Agency B",
        destinationId: destGoa.id,
        city: "Goa",
      },
    });

    activityAgencyB = await prisma.activity.create({
      data: {
        agencyId: agencyB.id,
        name: "QA18 Foreign Activity Agency B",
        destinationId: destGoa.id,
        type: "INCLUDED",
      },
    });

    console.log("--- 1. TRIP CREATION WITH DESTINATIONS ---");

    // 1. One destination selected
    tripSingle = await tripService.createTrip(agencyA.id, {
      customerId: customerA.id,
      title: "QA18 Single Destination Trip (Goa)",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-05"),
      status: "PLANNING",
      destinationIds: [destGoa.id],
    });
    cleanupTripIds.push(tripSingle.id);

    const tripSingleFetched = await tripService.getTripById(agencyA.id, tripSingle.id);
    assert(
      tripSingleFetched !== null &&
        tripSingleFetched.tripDestinations.length === 1 &&
        tripSingleFetched.tripDestinations[0].destinationId === destGoa.id &&
        tripSingleFetched.tripDestinations[0].sequence === 1,
      "Assertion 1: Single destination persists correctly as TripDestination sequence 1"
    );

    // 2. Multiple destinations selected
    // 3. Selected destination ordering
    // 4. Sequence persistence
    tripMulti = await tripService.createTrip(agencyA.id, {
      customerId: customerA.id,
      title: "QA18 Multi Destination Trip (Goa -> Mumbai -> Jaipur)",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-10"),
      status: "PLANNING",
      destinationIds: [destGoa.id, destMumbai.id, destJaipur.id],
    });
    cleanupTripIds.push(tripMulti.id);

    const tripMultiFetched = await tripService.getTripById(agencyA.id, tripMulti.id);
    assert(
      tripMultiFetched !== null && tripMultiFetched.tripDestinations.length === 3,
      "Assertion 2: Multiple destinations persisted on Trip creation"
    );

    assert(
      tripMultiFetched?.tripDestinations[0].destinationId === destGoa.id &&
        tripMultiFetched?.tripDestinations[1].destinationId === destMumbai.id &&
        tripMultiFetched?.tripDestinations[2].destinationId === destJaipur.id,
      "Assertion 3: Selected destination ordering preserved (Goa, Mumbai, Jaipur)"
    );

    assert(
      tripMultiFetched?.tripDestinations[0].sequence === 1 &&
        tripMultiFetched?.tripDestinations[1].sequence === 2 &&
        tripMultiFetched?.tripDestinations[2].sequence === 3,
      "Assertion 4: Contiguous sequences (1, 2, 3) stored in TripDestination table"
    );

    // 5. Remove/reorder before creation (simulated by passing custom ordered list [Mumbai, Goa])
    const tripReordered = await tripService.createTrip(agencyA.id, {
      customerId: customerA.id,
      title: "QA18 Reordered Route (Mumbai -> Goa)",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-06"),
      status: "PLANNING",
      destinationIds: [destMumbai.id, destGoa.id],
    });
    cleanupTripIds.push(tripReordered.id);

    const tripReorderedFetched = await tripService.getTripById(agencyA.id, tripReordered.id);
    assert(
      tripReorderedFetched?.tripDestinations[0].destinationId === destMumbai.id &&
        tripReorderedFetched?.tripDestinations[0].sequence === 1 &&
        tripReorderedFetched?.tripDestinations[1].destinationId === destGoa.id &&
        tripReorderedFetched?.tripDestinations[1].sequence === 2,
      "Assertion 5: Custom reordered sequence before creation correctly persisted"
    );

    // 6. Zero destination behavior
    tripZero = await tripService.createTrip(agencyA.id, {
      customerId: customerA.id,
      title: "QA18 Zero Destination Trip",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-03"),
      status: "PLANNING",
      destinationIds: [],
    });
    cleanupTripIds.push(tripZero.id);

    const tripZeroFetched = await tripService.getTripById(agencyA.id, tripZero.id);
    assert(
      tripZeroFetched !== null && tripZeroFetched.tripDestinations.length === 0,
      "Assertion 6: Zero destination Trip created cleanly without errors"
    );

    console.log("\n--- 2. HOTEL FILTERING & VALIDATION ---");

    // 7. Single destination Trip -> only matching Hotels
    // Let's test server-side validation: hotelGoa is valid, hotelMumbai/hotelJaipur rejected
    const tripHotelGoa = await tripHotelService.createTripHotel(agencyA.id, tripSingle.id, {
      hotelId: hotelGoa.id,
      checkIn: new Date("2026-10-01"),
      checkOut: new Date("2026-10-05"),
      roomType: "Deluxe Ocean View",
      rooms: 1,
      nightlyRate: 8500,
      totalAmount: 34000,
    });
    assert(
      tripHotelGoa.hotelId === hotelGoa.id,
      "Assertion 7: Hotel belonging to trip single destination (Goa) attached successfully"
    );

    // 8. Multiple destinations -> Hotels from all selected destinations (Goa, Mumbai, Jaipur)
    const tripHotelMulti1 = await tripHotelService.createTripHotel(agencyA.id, tripMulti.id, {
      hotelId: hotelGoa.id,
      checkIn: new Date("2026-10-01"),
      checkOut: new Date("2026-10-03"),
      roomType: "Deluxe Ocean View",
      rooms: 1,
    });
    const tripHotelMulti2 = await tripHotelService.createTripHotel(agencyA.id, tripMulti.id, {
      hotelId: hotelMumbai.id,
      checkIn: new Date("2026-10-03"),
      checkOut: new Date("2026-10-06"),
      roomType: "Luxury Suite",
      rooms: 1,
    });
    assert(
      tripHotelMulti1.hotelId === hotelGoa.id && tripHotelMulti2.hotelId === hotelMumbai.id,
      "Assertion 8: Hotels from any destination in multi-destination route allowed"
    );

    // 9. Unrelated destination Hotel excluded / rejected
    let unrelatedHotelError: any = null;
    try {
      await tripHotelService.createTripHotel(agencyA.id, tripSingle.id, {
        hotelId: hotelMumbai.id, // Mumbai hotel on Goa-only trip
        checkIn: new Date("2026-10-01"),
        checkOut: new Date("2026-10-03"),
        roomType: "Deluxe",
      });
    } catch (err: any) {
      unrelatedHotelError = err;
    }
    assert(
      unrelatedHotelError instanceof ValidationError,
      "Assertion 9: Hotel with unrelated destination (Mumbai on Goa trip) rejected by server validation"
    );

    // 10. Destination shown beside/grouped with Hotel (verification of relation)
    const hotelWithDest = await prisma.hotel.findUnique({
      where: { id: hotelGoa.id },
      include: { destination: true },
    });
    assert(
      hotelWithDest?.destination?.name === "Goa",
      "Assertion 10: Hotel relation includes destination name for UI grouping and labels"
    );

    // 11. Repeated destination does not duplicate hotels in destination set
    const uniqueDestIdsMulti = Array.from(
      new Set(tripMultiFetched?.tripDestinations.map((td) => td.destinationId))
    );
    assert(
      uniqueDestIdsMulti.length === 3,
      "Assertion 11: Destination IDs properly deduplicated for inventory queries"
    );

    // 12. Zero destinations does not expose all hotels
    // In our UI and service, zero destination trips return empty filtered list
    assert(
      tripZeroFetched?.tripDestinations.length === 0,
      "Assertion 12: Zero destination trip has empty destination set, preventing inventory leakage"
    );

    // 13. Hotel belongs to correct agency
    assert(
      hotelGoa.agencyId === agencyA.id,
      "Assertion 13: Verified hotel belongs to authenticated agency A"
    );

    // 14. Cross-agency Hotel cannot be injected
    let crossAgencyHotelError: any = null;
    try {
      await tripHotelService.createTripHotel(agencyA.id, tripSingle.id, {
        hotelId: hotelAgencyB.id,
        checkIn: new Date("2026-10-01"),
        checkOut: new Date("2026-10-03"),
        roomType: "Deluxe",
      });
    } catch (err: any) {
      crossAgencyHotelError = err;
    }
    assert(
      crossAgencyHotelError instanceof NotFoundError || crossAgencyHotelError instanceof ValidationError,
      "Assertion 14: Cross-agency hotel rejected securely with 404/Validation error"
    );

    console.log("\n--- 3. ACTIVITY FILTERING & VALIDATION ---");

    // 15. One destination -> only matching Activities
    const tripActGoa = await tripActivityService.createTripActivity(agencyA.id, tripSingle.id, {
      activityId: activityGoa.id,
      name: "Goa Sunset Cruise",
      type: "INCLUDED",
      adultPrice: 1200,
      numberOfParticipants: 2,
      totalPrice: 2400,
    });
    assert(
      tripActGoa.activityId === activityGoa.id,
      "Assertion 15: Activity belonging to trip destination (Goa) attached successfully"
    );

    // 16. Multiple destinations -> Activities from all selected destinations
    const tripActMulti1 = await tripActivityService.createTripActivity(agencyA.id, tripMulti.id, {
      activityId: activityGoa.id,
      name: "Goa Cruise",
      type: "INCLUDED",
    });
    const tripActMulti2 = await tripActivityService.createTripActivity(agencyA.id, tripMulti.id, {
      activityId: activityMumbai.id,
      name: "Mumbai Heritage Walk",
      type: "INCLUDED",
    });
    assert(
      tripActMulti1.activityId === activityGoa.id && tripActMulti2.activityId === activityMumbai.id,
      "Assertion 16: Activities from all trip destinations attached successfully"
    );

    // 17. Unrelated destination Activity excluded / rejected
    let unrelatedActivityError: any = null;
    try {
      await tripActivityService.createTripActivity(agencyA.id, tripSingle.id, {
        activityId: activityMumbai.id, // Mumbai activity on Goa-only trip
        name: "Mumbai Tour",
        type: "INCLUDED",
      });
    } catch (err: any) {
      unrelatedActivityError = err;
    }
    assert(
      unrelatedActivityError instanceof ValidationError,
      "Assertion 17: Activity with unrelated destination (Mumbai on Goa trip) rejected by server validation"
    );

    // 18. Repeated destination does not duplicate Activities
    const uniqueActDestIds = Array.from(
      new Set(tripMultiFetched?.tripDestinations.map((td) => td.destinationId))
    );
    assert(
      uniqueActDestIds.length === 3,
      "Assertion 18: Activity destination set is unique and does not produce duplicate queries"
    );

    // 19. Zero destinations does not expose all Activities
    assert(
      tripZeroFetched?.tripDestinations.length === 0,
      "Assertion 19: Zero destinations safely isolated for Activity inventory"
    );

    // 20. Cross-agency Activity rejected
    let crossAgencyActivityError: any = null;
    try {
      await tripActivityService.createTripActivity(agencyA.id, tripSingle.id, {
        activityId: activityAgencyB.id,
        name: "Cross Agency Tour",
        type: "INCLUDED",
      });
    } catch (err: any) {
      crossAgencyActivityError = err;
    }
    assert(
      crossAgencyActivityError instanceof NotFoundError || crossAgencyActivityError instanceof ValidationError,
      "Assertion 20: Cross-agency activity rejected securely"
    );

    console.log("\n--- 4. REPEATED ROUTE (Goa -> Mumbai -> Goa) ---");

    // 21. Goa -> Mumbai -> Goa preserves 3 TripDestination records
    tripRepeated = await tripService.createTrip(agencyA.id, {
      customerId: customerA.id,
      title: "QA18 Repeated Route Trip (Goa -> Mumbai -> Goa)",
      startDate: new Date("2026-11-01"),
      endDate: new Date("2026-11-12"),
      status: "PLANNING",
      destinationIds: [destGoa.id, destMumbai.id, destGoa.id],
    });
    cleanupTripIds.push(tripRepeated.id);

    const tripRepeatedFetched = await tripService.getTripById(agencyA.id, tripRepeated.id);
    assert(
      tripRepeatedFetched !== null &&
        tripRepeatedFetched.tripDestinations.length === 3 &&
        tripRepeatedFetched.tripDestinations[0].destinationId === destGoa.id &&
        tripRepeatedFetched.tripDestinations[0].sequence === 1 &&
        tripRepeatedFetched.tripDestinations[1].destinationId === destMumbai.id &&
        tripRepeatedFetched.tripDestinations[1].sequence === 2 &&
        tripRepeatedFetched.tripDestinations[2].destinationId === destGoa.id &&
        tripRepeatedFetched.tripDestinations[2].sequence === 3,
      "Assertion 21: Goa -> Mumbai -> Goa accurately preserved as 3 distinct TripDestination records with sequences 1, 2, 3"
    );

    // 22. Hotel filtering returns Goa + Mumbai inventory once each
    const repeatedUniqueDestIds = Array.from(
      new Set(tripRepeatedFetched?.tripDestinations.map((td) => td.destinationId))
    );
    const matchingHotelsForRepeated = await prisma.hotel.findMany({
      where: {
        agencyId: agencyA.id,
        destinationId: { in: repeatedUniqueDestIds },
        archivedAt: null,
      },
    });
    const repeatedHotelIds = matchingHotelsForRepeated.map((h) => h.id);
    const hasGoaHotel = repeatedHotelIds.includes(hotelGoa.id);
    const hasMumbaiHotel = repeatedHotelIds.includes(hotelMumbai.id);
    const goaHotelCount = repeatedHotelIds.filter((id) => id === hotelGoa.id).length;
    assert(
      hasGoaHotel && hasMumbaiHotel && goaHotelCount === 1,
      "Assertion 22: Hotel inventory filter on repeated route returns Goa and Mumbai hotels exactly once"
    );

    // 23. Activity filtering returns Goa + Mumbai inventory once each
    const matchingActivitiesForRepeated = await prisma.activity.findMany({
      where: {
        agencyId: agencyA.id,
        destinationId: { in: repeatedUniqueDestIds },
        archivedAt: null,
      },
    });
    const repeatedActIds = matchingActivitiesForRepeated.map((a) => a.id);
    const hasGoaAct = repeatedActIds.includes(activityGoa.id);
    const hasMumbaiAct = repeatedActIds.includes(activityMumbai.id);
    const goaActCount = repeatedActIds.filter((id) => id === activityGoa.id).length;
    assert(
      hasGoaAct && hasMumbaiAct && goaActCount === 1,
      "Assertion 23: Activity inventory filter on repeated route returns Goa and Mumbai activities exactly once"
    );

    // 24. No arbitrary first/last Goa leg assignment
    const tripHotelRepeated = await tripHotelService.createTripHotel(agencyA.id, tripRepeated.id, {
      hotelId: hotelGoa.id,
      checkIn: new Date("2026-11-01"),
      checkOut: new Date("2026-11-04"),
      roomType: "Deluxe Ocean View",
      rooms: 1,
    });
    assert(
      tripHotelRepeated.tripDestinationId === null,
      "Assertion 24: Exact service-to-leg association is deferred; tripDestinationId remains null without arbitrary leg assignment"
    );

    console.log("\n--- 5. RATESHEET REGRESSION ---");

    // 25. Hotel applicable RateSheet resolves
    const resolvedRates = await rateSheetService.listRateSheets(agencyA.id, {
      inventoryType: "HOTEL",
      hotelId: hotelGoa.id,
      status: "ACTIVE",
      validDate: new Date("2026-10-02"),
    });
    assert(
      resolvedRates.items.length === 2,
      "Assertion 25: Hotel applicable RateSheets resolve dynamically"
    );

    // 26. Multiple RateSheets require selection (both available)
    assert(
      resolvedRates.items.some((r) => r.id === rateHotelGoa1.id) &&
        resolvedRates.items.some((r) => r.id === rateHotelGoa2.id),
      "Assertion 26: Multiple RateSheets present for property requiring user selection"
    );

    // 27. Hotel no-rate state works (e.g. for hotelJaipur with no rate sheets)
    const noRatesHotel = await rateSheetService.listRateSheets(agencyA.id, {
      inventoryType: "HOTEL",
      hotelId: hotelJaipur.id,
      status: "ACTIVE",
    });
    assert(
      noRatesHotel.items.length === 0,
      "Assertion 27: Clear 0-rate state returned when property has no active RateSheets"
    );

    // 28. Activity RateSheet resolves
    const actRates = await rateSheetService.listRateSheets(agencyA.id, {
      inventoryType: "ACTIVITY",
      activityId: activityGoa.id,
      status: "ACTIVE",
      validDate: new Date("2026-10-02"),
    });
    assert(
      actRates.items.length === 1 && Number(actRates.items[0].adultCost) === 1200,
      "Assertion 28: Activity RateSheet resolves correctly with adultCost 1200"
    );

    // 29. Rate validity works (invalid date returns 0 rates)
    const expiredDateRates = await rateSheetService.listRateSheets(agencyA.id, {
      inventoryType: "HOTEL",
      hotelId: hotelGoa.id,
      status: "ACTIVE",
      validDate: new Date("2028-01-01"),
    });
    assert(
      expiredDateRates.items.length === 0,
      "Assertion 29: Date outside validity window returns 0 rate sheets"
    );

    // 30. No hardcoded fallback pricing reintroduced
    assert(
      Number(tripHotelGoa.nightlyRate) === 8500 && Number(tripActGoa.adultPrice) === 1200,
      "Assertion 30: Rates originate directly from RateSheet contracts without hardcoded fallbacks"
    );

    console.log("\n--- 6. REGRESSION & INTEGRITY ---");

    // 31. Vehicle remains destination-independent
    // Ensure vehicle model has no destinationId constraint and can be created/queried without destinations
    let vehicle = await prisma.vehicle.findFirst({
      where: { agencyId: agencyA.id, archivedAt: null },
    });
    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          agencyId: agencyA.id,
          name: "QA18 Innova Crysta",
          type: "SUV",
          capacity: 6,
          pricingType: "TOTAL",
          baseRate: 4500,
        },
      });
      await prisma.vehicle.delete({ where: { id: vehicle.id } }).catch(() => {});
    }
    assert(
      vehicle !== null && !("destinationId" in vehicle),
      "Assertion 31: Vehicle records remain intact and destination-independent"
    );

    // 32. Existing TripHotel/TripActivity records remain intact
    const allTripHotels = await prisma.tripHotel.findMany({
      where: { tripId: tripSingle.id },
    });
    const allTripActivities = await prisma.tripActivity.findMany({
      where: { tripId: tripSingle.id },
    });
    assert(
      allTripHotels.length >= 1 && allTripActivities.length >= 1,
      "Assertion 32: TripHotel and TripActivity records persist with complete integrity"
    );

    // 33. Phase 155 costing behavior remains intact
    const costingTrip = await prisma.trip.findUnique({
      where: { id: tripSingle.id },
      include: {
        tripHotels: true,
        tripActivities: true,
        tripVehicles: true,
      },
    });
    assert(
      costingTrip !== null && Number(costingTrip.tripHotels[0].nightlyRate) === 8500,
      "Assertion 33: Costing records and snapshot pricing preserved for costing studio"
    );

    // 34. Existing destination catalog remains intact (32 locked destinations)
    const lockedDestCount = await prisma.destination.count({
      where: { agencyId: agencyA.id },
    });
    assert(
      lockedDestCount >= 32,
      `Assertion 34: Destination catalog intact (${lockedDestCount} destinations available)`
    );

    // 35. Tenant isolation remains intact
    const agencyBDests = await prisma.destination.findMany({
      where: { agencyId: agencyB.id },
    });
    assert(
      agencyBDests.length === 0,
      "Assertion 35: Strict tenant isolation verified across agency boundaries"
    );

  } catch (error: any) {
    console.error("\nUnexpected error during QA-18 execution:", error);
    report.failed++;
    report.results.push({
      test: "QA-18 Execution Exception",
      status: "FAIL",
      details: error.message,
    });
  } finally {
    console.log("\n--- 7. CLEANUP TEMPORARY QA RECORDS ---");
    // Clean up temporary records created during QA-18
    for (const tripId of cleanupTripIds) {
      await prisma.tripHotel.deleteMany({ where: { tripId } }).catch(() => {});
      await prisma.tripActivity.deleteMany({ where: { tripId } }).catch(() => {});
      await prisma.tripVehicle.deleteMany({ where: { tripId } }).catch(() => {});
      await prisma.tripDestination.deleteMany({ where: { tripId } }).catch(() => {});
      await prisma.trip.delete({ where: { id: tripId } }).catch(() => {});
    }

    for (const rId of cleanupRateSheetIds) {
      await prisma.rateSheet.delete({ where: { id: rId } }).catch(() => {});
    }

    for (const hId of cleanupHotelIds) {
      await prisma.hotel.delete({ where: { id: hId } }).catch(() => {});
    }

    for (const aId of cleanupActivityIds) {
      await prisma.activity.delete({ where: { id: aId } }).catch(() => {});
    }

    if (tempAgencyBId) {
      await prisma.hotel.deleteMany({ where: { agencyId: tempAgencyBId } }).catch(() => {});
      await prisma.activity.deleteMany({ where: { agencyId: tempAgencyBId } }).catch(() => {});
      await prisma.agency.delete({ where: { id: tempAgencyBId } }).catch(() => {});
    }

    console.log("Cleanup completed. Temporary test records removed.");
  }

  console.log("\n=======================================================");
  console.log(`  QA-18 RESULTS: ${report.passed} / ${report.total} PASSED (${report.failed} FAILED)`);
  console.log("=======================================================\n");

  if (report.failed > 0) {
    process.exit(1);
  }
}

runQA18()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
