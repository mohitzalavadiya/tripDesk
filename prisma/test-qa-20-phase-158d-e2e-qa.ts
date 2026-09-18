import prisma from "../src/lib/prisma";
import { destinationService } from "../src/lib/services/destination-service";
import { tripService } from "../src/lib/services/trip-service";
import { tripHotelService } from "../src/lib/services/trip-hotel-service";
import { tripActivityService } from "../src/lib/services/trip-activity-service";
import { hotelService } from "../src/lib/services/hotel-service";
import { activityService } from "../src/lib/services/activity-service";
import { rateSheetService } from "../src/lib/services/rate-sheet-service";
import { tripCostingService } from "../src/lib/services/trip-costing-service";
import { hotelExcelService } from "../src/lib/excel/hotel-excel-service";
import { rateExcelService } from "../src/lib/excel/rate-excel-service";
import { quotationService } from "../src/lib/services/quotation-service";
import { bookingService } from "../src/lib/services/booking-service";
import { invoiceService } from "../src/lib/services/invoice-service";
import { ValidationError, NotFoundError } from "../src/lib/api";
import * as XLSX from "xlsx";

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

async function runQA20() {
  console.log("\n=======================================================================");
  console.log("  TRIPDESK QA-20 — PHASE 158-D END-TO-END QA AUDIT");
  console.log("=======================================================================\n");

  let agencyA: any = null;
  let userA: any = null;
  let customerA: any = null;

  // Key Agency A Destinations
  let destGoa: any = null;
  let destMumbai: any = null;
  let destJaipur: any = null;

  // Agency B for cross-tenant isolation testing
  let agencyB: any = null;
  let destAgencyB: any = null;
  let tempAgencyBId: string | null = null;

  // Cleanup tracking arrays
  const cleanupTripIds: string[] = [];
  const cleanupHotelIds: string[] = [];
  const cleanupActivityIds: string[] = [];
  const cleanupRateSheetIds: string[] = [];
  const cleanupQuotationIds: string[] = [];
  const cleanupBookingIds: string[] = [];
  const cleanupInvoiceIds: string[] = [];

  const timestamp = Date.now();

  try {
    // ---------------------------------------------------------
    // 0. BOOTSTRAP ENVIRONMENT SETUP
    // ---------------------------------------------------------
    userA = await prisma.user.findFirst({
      where: { email: BOOTSTRAP_AGENCY_EMAIL },
      include: { agency: true },
    });
    if (!userA || !userA.agency) {
      throw new Error(`Permanent bootstrap agency (${BOOTSTRAP_AGENCY_EMAIL}) not found.`);
    }
    agencyA = userA.agency;

    // Verify 32 Starter Destinations catalog
    const allDestinationsA = await prisma.destination.findMany({
      where: { agencyId: agencyA.id },
      orderBy: { name: "asc" },
    });
    assert(
      allDestinationsA.length === 32 && allDestinationsA.every((d) => d.status === "ACTIVE"),
      "Check 0.1: Permanent agency contains exactly 32 active locked starter destinations"
    );

    destGoa = allDestinationsA.find((d) => d.name === "Goa");
    destMumbai = allDestinationsA.find((d) => d.name === "Mumbai");
    destJaipur = allDestinationsA.find((d) => d.name === "Jaipur");

    if (!destGoa || !destMumbai || !destJaipur) {
      throw new Error("Missing required starter destinations (Goa/Mumbai/Jaipur) in catalog.");
    }

    // Customer for Trip tests
    customerA = await prisma.customer.findFirst({ where: { agencyId: agencyA.id } });
    if (!customerA) {
      customerA = await prisma.customer.create({
        data: {
          agencyId: agencyA.id,
          name: `QA-20 Customer ${timestamp}`,
          email: `qa20_cust_${timestamp}@test.com`,
          phone: "+91 98765 43210",
        },
      });
    }

    // Temporary Agency B setup for isolation tests
    agencyB = await prisma.agency.create({
      data: {
        name: `QA-20 Agency B ${timestamp}`,
        email: `qa20_b_${timestamp}@tripdesk.test`,
        phone: `9988${String(timestamp).slice(-6)}`,
      },
    });
    tempAgencyBId = agencyB.id;

    destAgencyB = await prisma.destination.create({
      data: {
        agencyId: agencyB.id,
        name: "Agency B Secret Paradise",
        status: "ACTIVE",
      },
    });

    // ---------------------------------------------------------
    // SECTION 1: DESTINATION MASTER -> TRIP CREATION & PERSISTENCE
    // ---------------------------------------------------------
    console.log("\n--- SECTION 1: TRIP DESTINATION SELECTION & PERSISTENCE ---");

    // 1. Zero destinations selected
    const tripZeroDest = await tripService.createTrip(agencyA.id, {
      customerId: customerA.id,
      title: `QA-20 Zero Dest Trip ${timestamp}`,
      startDate: new Date("2027-02-01"),
      endDate: new Date("2027-02-05"),
      destinationIds: [],
    });
    cleanupTripIds.push(tripZeroDest.id);

    const tripZeroLoaded = await tripService.getTripById(agencyA.id, tripZeroDest.id);
    assert(
      tripZeroLoaded?.tripDestinations.length === 0,
      "Test 1: Trip with zero destinations creates 0 TripDestination records without synthetic routes"
    );

    // 2. One destination (Goa)
    const tripOneDest = await tripService.createTrip(agencyA.id, {
      customerId: customerA.id,
      title: `QA-20 Single Dest Trip ${timestamp}`,
      startDate: new Date("2027-02-10"),
      endDate: new Date("2027-02-15"),
      destinationIds: [destGoa.id],
    });
    cleanupTripIds.push(tripOneDest.id);

    const tripOneLoaded = await tripService.getTripById(agencyA.id, tripOneDest.id);
    assert(
      tripOneLoaded?.tripDestinations.length === 1 &&
      tripOneLoaded.tripDestinations[0].destinationId === destGoa.id &&
      tripOneLoaded.tripDestinations[0].sequence === 1 &&
      tripOneLoaded.tripDestinations[0].destination.name === "Goa",
      "Test 2: Single destination trip creates exactly 1 TripDestination with sequence=1"
    );

    // 3. Multiple destinations (Goa -> Mumbai -> Jaipur)
    const tripMultiDest = await tripService.createTrip(agencyA.id, {
      customerId: customerA.id,
      title: `QA-20 Multi Dest Trip ${timestamp}`,
      startDate: new Date("2027-03-01"),
      endDate: new Date("2027-03-10"),
      destinationIds: [destGoa.id, destMumbai.id, destJaipur.id],
    });
    cleanupTripIds.push(tripMultiDest.id);

    const tripMultiLoaded = await tripService.getTripById(agencyA.id, tripMultiDest.id);
    assert(
      tripMultiLoaded?.tripDestinations.length === 3 &&
      tripMultiLoaded.tripDestinations[0].destination.name === "Goa" &&
      tripMultiLoaded.tripDestinations[0].sequence === 1 &&
      tripMultiLoaded.tripDestinations[1].destination.name === "Mumbai" &&
      tripMultiLoaded.tripDestinations[1].sequence === 2 &&
      tripMultiLoaded.tripDestinations[2].destination.name === "Jaipur" &&
      tripMultiLoaded.tripDestinations[2].sequence === 3,
      "Test 3: Multiple destination trip creates contiguous sequence records (1: Goa, 2: Mumbai, 3: Jaipur)"
    );

    // 4. Repeated route (Goa -> Mumbai -> Goa)
    const tripRepeatedDest = await tripService.createTrip(agencyA.id, {
      customerId: customerA.id,
      title: `QA-20 Repeated Route Trip ${timestamp}`,
      startDate: new Date("2027-04-01"),
      endDate: new Date("2027-04-12"),
      destinationIds: [destGoa.id, destMumbai.id, destGoa.id],
    });
    cleanupTripIds.push(tripRepeatedDest.id);

    const tripRepeatedLoaded = await tripService.getTripById(agencyA.id, tripRepeatedDest.id);
    assert(
      tripRepeatedLoaded?.tripDestinations.length === 3 &&
      tripRepeatedLoaded.tripDestinations[0].destinationId === destGoa.id &&
      tripRepeatedLoaded.tripDestinations[0].sequence === 1 &&
      tripRepeatedLoaded.tripDestinations[1].destinationId === destMumbai.id &&
      tripRepeatedLoaded.tripDestinations[1].sequence === 2 &&
      tripRepeatedLoaded.tripDestinations[2].destinationId === destGoa.id &&
      tripRepeatedLoaded.tripDestinations[2].sequence === 3 &&
      tripRepeatedLoaded.tripDestinations[0].id !== tripRepeatedLoaded.tripDestinations[2].id,
      "Test 4: Repeated route (Goa -> Mumbai -> Goa) creates 3 distinct TripDestination records with sequences 1, 2, 3"
    );

    // ---------------------------------------------------------
    // SECTION 2: HOTEL MASTER VALIDATION, TENANCY & TABLE
    // ---------------------------------------------------------
    console.log("\n--- SECTION 2: HOTEL MASTER VALIDATION & TENANCY ---");

    // 5. Missing Hotel Name
    let hNameRejected = false;
    try {
      await hotelService.createHotel(agencyA.id, {
        destinationId: destGoa.id,
        name: "",
        city: "Benaulim",
      });
    } catch (e: any) {
      hNameRejected = true;
    }
    assert(hNameRejected, "Test 5: Hotel creation rejected when Hotel Name is missing");

    // 6. Missing Destination
    let hDestRejected = false;
    try {
      await hotelService.createHotel(agencyA.id, {
        destinationId: "",
        name: "No Dest Hotel",
        city: "Benaulim",
      });
    } catch (e: any) {
      hDestRejected = true;
    }
    assert(hDestRejected, "Test 6: Hotel creation rejected when Destination is missing");

    // 7. Valid Hotel creation with distinct physical city
    const hotelGoa = await hotelService.createHotel(agencyA.id, {
      destinationId: destGoa.id,
      name: `Taj Exotica QA20 ${timestamp}`,
      category: "5 Star Deluxe",
      address: "Calvaddo, Benaulim Beach",
      city: "Benaulim",
      state: "Goa",
      country: "India",
    });
    cleanupHotelIds.push(hotelGoa.id);
    assert(
      hotelGoa.destinationId === destGoa.id &&
      hotelGoa.destination?.name === "Goa" &&
      hotelGoa.city === "Benaulim" &&
      Boolean(hotelGoa.hotelCode?.startsWith("HTL-")),
      "Test 7: Valid Hotel created with auto-code, Destination=Goa, distinct City=Benaulim"
    );

    // 8. Cross-agency Destination rejected
    let hCrossDestRejected = false;
    try {
      await hotelService.createHotel(agencyA.id, {
        destinationId: destAgencyB.id,
        name: "Cross Agency Hotel",
        city: "City",
      });
    } catch (e: any) {
      hCrossDestRejected = true;
    }
    assert(hCrossDestRejected, "Test 8: Assigning another agency's Destination to Hotel is strictly rejected");

    // 9. Legacy Hotel with destinationId = null loads safely
    const legacyHotel = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        hotelCode: `HTL-LEG-${timestamp.toString().slice(-4)}`,
        name: `Legacy Hotel QA20 ${timestamp}`,
        destinationId: null,
        city: "Old City",
      },
    });
    cleanupHotelIds.push(legacyHotel.id);

    const legacyLoaded = await hotelService.getHotelById(agencyA.id, legacyHotel.id);
    assert(
      legacyLoaded?.destinationId === null && legacyLoaded?.destination === null,
      "Test 9: Legacy Hotel with destinationId = null loads safely without crashes or synthetic backfill"
    );

    // 10. Edit Hotel Destination safely
    const updatedHotel = await hotelService.updateHotel(agencyA.id, legacyHotel.id, {
      destinationId: destMumbai.id,
      name: `Updated Legacy Hotel QA20 ${timestamp}`,
    });
    assert(
      updatedHotel.destinationId === destMumbai.id && updatedHotel.destination?.name === "Mumbai",
      "Test 10: Updating legacy Hotel destination to Mumbai persists accurately"
    );

    // 11. Destination filter in Hotel List
    const hotelMumbai = await hotelService.createHotel(agencyA.id, {
      destinationId: destMumbai.id,
      name: `Trident Nariman Point QA20 ${timestamp}`,
      category: "5 Star",
      city: "Mumbai",
    });
    cleanupHotelIds.push(hotelMumbai.id);

    const goaHotelsList = await hotelService.listHotels(agencyA.id, { destinationId: destGoa.id });
    assert(
      goaHotelsList.items.some((h) => h.id === hotelGoa.id) &&
      !goaHotelsList.items.some((h) => h.id === hotelMumbai.id),
      "Test 11: Hotel list filtered by destinationId=Goa returns Goa hotels and excludes Mumbai hotels"
    );

    // ---------------------------------------------------------
    // SECTION 3: HOTEL EXCEL IMPORT WITH MANDATORY DESTINATION
    // ---------------------------------------------------------
    console.log("\n--- SECTION 3: HOTEL EXCEL IMPORT & STRICT MATCHING ---");

    function makeExcel(rows: any[][]) {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Hotels");
      return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    }

    const excelHeaders = [
      "Hotel Name", "Destination", "Category", "Address", "City",
      "State", "Country", "Phone", "Email", "Website", "Notes"
    ];

    // 12. Valid Hotel Excel row imports
    const validBuf = makeExcel([
      excelHeaders,
      [`Alila Diwa QA20 ${timestamp}`, "Goa", "5 Star", "Ada Estate", "Majorda", "Goa", "India", "", "", "", ""]
    ]);
    const prev12 = await hotelExcelService.parseAndPreview(validBuf, agencyA.id, "SKIP");
    assert(
      prev12.canExecute && prev12.rows[0].destinationId === destGoa.id,
      "Test 12: Valid Excel row parses correctly with matched destinationId"
    );
    const exec12 = await hotelExcelService.executeImport(validBuf, agencyA.id, "SKIP");
    const imported12 = await prisma.hotel.findFirst({
      where: { agencyId: agencyA.id, name: `Alila Diwa QA20 ${timestamp}` }
    });
    if (imported12) cleanupHotelIds.push(imported12.id);
    assert(exec12.imported === 1 && imported12?.destinationId === destGoa.id, "Test 12.1: Excel row imports into DB with destination relation");

    // 13. Missing Hotel Name in Excel fails
    const missNameBuf = makeExcel([
      excelHeaders,
      ["", "Goa", "4 Star", "Street", "City", "State", "India", "", "", "", ""]
    ]);
    const prev13 = await hotelExcelService.parseAndPreview(missNameBuf, agencyA.id, "SKIP");
    assert(prev13.summary.errorRows === 1 && prev13.rows[0].errors.some(e => e.includes("Hotel Name is required")), "Test 13: Excel row with missing name fails validation");

    // 14. Missing Destination in Excel fails
    const missDestBuf = makeExcel([
      excelHeaders,
      [`No Dest Hotel QA20 ${timestamp}`, "", "4 Star", "Street", "City", "State", "India", "", "", "", ""]
    ]);
    const prev14 = await hotelExcelService.parseAndPreview(missDestBuf, agencyA.id, "SKIP");
    assert(prev14.summary.errorRows === 1 && prev14.rows[0].errors.some(e => e.includes("Destination is required")), "Test 14: Excel row with missing destination fails validation");

    // 15. Whitespace matching ('   Goa   ' -> 'Goa')
    const wsBuf = makeExcel([
      excelHeaders,
      [`Whitespace Hotel QA20 ${timestamp}`, "   Goa   ", "4 Star", "Street", "City", "State", "India", "", "", "", ""]
    ]);
    const prev15 = await hotelExcelService.parseAndPreview(wsBuf, agencyA.id, "SKIP");
    assert(prev15.summary.validRows === 1 && prev15.rows[0].destinationId === destGoa.id, "Test 15: Destination matching ignores leading/trailing whitespace");

    // 16. Case-insensitive matching ('gOa' -> 'Goa')
    const caseBuf = makeExcel([
      excelHeaders,
      [`Case Hotel QA20 ${timestamp}`, "gOa", "4 Star", "Street", "City", "State", "India", "", "", "", ""]
    ]);
    const prev16 = await hotelExcelService.parseAndPreview(caseBuf, agencyA.id, "SKIP");
    assert(prev16.summary.validRows === 1 && prev16.rows[0].destinationId === destGoa.id, "Test 16: Destination matching is case-insensitive ('gOa' -> 'Goa')");

    // 17. Panaji does NOT map to Goa
    const panajiBuf = makeExcel([
      excelHeaders,
      [`Panaji Hotel QA20 ${timestamp}`, "Panaji", "3 Star", "Street", "Panaji", "Goa", "India", "", "", "", ""]
    ]);
    const prev17 = await hotelExcelService.parseAndPreview(panajiBuf, agencyA.id, "SKIP");
    assert(prev17.summary.errorRows === 1 && prev17.rows[0].errors.some(e => e.includes("Unknown destination: 'Panaji'")), "Test 17: 'Panaji' does NOT automatically infer or map to 'Goa'");

    // 18. Unknown Destination fails validation
    const unkBuf = makeExcel([
      excelHeaders,
      [`Unknown Dest Hotel QA20 ${timestamp}`, "AtlantisUnderwater", "5 Star", "Street", "City", "State", "India", "", "", "", ""]
    ]);
    const prev18 = await hotelExcelService.parseAndPreview(unkBuf, agencyA.id, "SKIP");
    assert(prev18.summary.errorRows === 1 && prev18.rows[0].errors.some(e => e.includes("Unknown destination")), "Test 18: Unknown destination fails row validation");

    // 19. RateSheet Excel template does NOT have Destination column
    const rateSampleBuf = await rateExcelService.generateSampleWorkbook(agencyA.id);
    const parsedRateWb = XLSX.read(rateSampleBuf, { type: "buffer" });
    const ratesSheet = parsedRateWb.Sheets["Rates"] || parsedRateWb.Sheets[parsedRateWb.SheetNames[1]];
    const rateHeaders = XLSX.utils.sheet_to_json<string[]>(ratesSheet, { header: 1 })[0];
    assert(
      !rateHeaders.some(h => /^destination$/i.test(h)) && rateHeaders.some(h => /^hotel\s*code$/i.test(h)),
      "Test 19: Hotel RateSheet Excel template intentionally DOES NOT contain Destination column (links via Hotel Code)"
    );

    // ---------------------------------------------------------
    // SECTION 4: HOTEL & ACTIVITY FILTERING & RATESHEET SELECTION
    // ---------------------------------------------------------
    console.log("\n--- SECTION 4: INVENTORY FILTERING & DYNAMIC RATESHEETS ---");

    // Create Jaipur Hotel
    const hotelJaipur = await hotelService.createHotel(agencyA.id, {
      destinationId: destJaipur.id,
      name: `Rambagh Palace QA20 ${timestamp}`,
      category: "5 Star Luxury",
      city: "Jaipur",
    });
    cleanupHotelIds.push(hotelJaipur.id);

    // Create Rates for hotelGoa
    const rateGoaCP = await prisma.rateSheet.create({
      data: {
        agencyId: agencyA.id,
        name: `Goa Deluxe CP Rate ${timestamp}`,
        inventoryType: "HOTEL",
        hotelId: hotelGoa.id,
        roomType: "Deluxe Sea View",
        mealPlan: "CP",
        validFrom: new Date("2027-01-01"),
        validTo: new Date("2027-12-31"),
        costPrice: 6500,
        status: "ACTIVE",
      },
    });
    cleanupRateSheetIds.push(rateGoaCP.id);

    const rateGoaMAP = await prisma.rateSheet.create({
      data: {
        agencyId: agencyA.id,
        name: `Goa Deluxe MAP Rate ${timestamp}`,
        inventoryType: "HOTEL",
        hotelId: hotelGoa.id,
        roomType: "Deluxe Sea View",
        mealPlan: "MAP",
        validFrom: new Date("2027-01-01"),
        validTo: new Date("2027-12-31"),
        costPrice: 8500,
        status: "ACTIVE",
      },
    });
    cleanupRateSheetIds.push(rateGoaMAP.id);

    // 20. Hotel assignment to matching destination succeeds
    const th1 = await tripHotelService.createTripHotel(agencyA.id, tripMultiDest.id, {
      hotelId: hotelGoa.id,
      checkIn: new Date("2027-03-01"),
      checkOut: new Date("2027-03-04"),
      roomType: "Deluxe Sea View",
      mealPlan: "CP",
      rateSheetId: rateGoaCP.id,
      rooms: 2,
    });
    assert(th1.id !== undefined && th1.hotelId === hotelGoa.id, "Test 20: Assigning matching destination hotel (Goa hotel to Goa/Mumbai/Jaipur trip) succeeds");

    // 21. Hotel assignment to non-matching destination rejected
    // Create an Agra hotel
    const destAgra = allDestinationsA.find(d => d.name === "Agra")!;
    const hotelAgra = await hotelService.createHotel(agencyA.id, {
      destinationId: destAgra.id,
      name: `ITC Mughal QA20 ${timestamp}`,
      city: "Agra",
    });
    cleanupHotelIds.push(hotelAgra.id);

    let agraRejected = false;
    try {
      await tripHotelService.createTripHotel(agencyA.id, tripOneDest.id, { // tripOneDest is Goa only
        hotelId: hotelAgra.id,
        checkIn: new Date("2027-02-10"),
        checkOut: new Date("2027-02-15"),
        roomType: "Deluxe Room",
      });
    } catch (e: any) {
      agraRejected = e instanceof ValidationError || e?.message?.includes("does not belong to any destination");
    }
    assert(agraRejected, "Test 21: Assigning Agra hotel to Goa-only trip is strictly rejected with ValidationError");

    // 22. RateSheet selection: Single applicable rate auto-match
    const rateSingleMatch = await rateSheetService.getApplicableHotelRate(
      agencyA.id,
      hotelGoa.id,
      new Date("2027-03-02"),
      "Deluxe Sea View",
      "CP"
    );
    assert(rateSingleMatch.matched && rateSingleMatch.costPrice === 6500, "Test 22: Single applicable hotel RateSheet auto-selected with exact price (6500)");

    // 23. RateSheet selection: Multiple applicable rates returned for user selection
    const rateMultiList = await rateSheetService.listRateSheets(
      agencyA.id,
      { hotelId: hotelGoa.id, inventoryType: "HOTEL" }
    );
    assert(rateMultiList.items.length === 2 && rateMultiList.items.some(r => r.mealPlan === "CP") && rateMultiList.items.some(r => r.mealPlan === "MAP"), "Test 23: Multiple rates for same room type returned for user choice");

    // 24. Zero applicable rates returns empty/unmatched state
    const rateZeroMatch = await rateSheetService.getApplicableHotelRate(
      agencyA.id,
      hotelJaipur.id,
      new Date("2027-03-02"),
      "Deluxe Suite",
      "CP"
    );
    assert(!rateZeroMatch.matched && rateZeroMatch.costPrice === 0, "Test 24: Zero applicable rates returns unmatched state without hardcoded fallback pricing");

    // ---------------------------------------------------------
    // SECTION 5: ACTIVITY MASTER & ACTIVITY RATESHEETS
    // ---------------------------------------------------------
    console.log("\n--- SECTION 5: ACTIVITY MASTER & RATE SELECTION ---");

    // 25. Activity Master Destination Integration
    const actGoa = await activityService.createActivity(agencyA.id, {
      destinationId: destGoa.id,
      name: `Scuba Diving Grand Island QA20 ${timestamp}`,
      duration: "4 Hours",
    });
    cleanupActivityIds.push(actGoa.id);
    assert(actGoa.destinationId === destGoa.id && actGoa.destination?.name === "Goa", "Test 25: Activity created with agency Destination relation");

    const rateActGoa = await prisma.rateSheet.create({
      data: {
        agencyId: agencyA.id,
        name: `Scuba Rate QA20 ${timestamp}`,
        inventoryType: "ACTIVITY",
        activityId: actGoa.id,
        validFrom: new Date("2027-01-01"),
        validTo: new Date("2027-12-31"),
        adultCost: 2500,
        costPrice: 2500,
        status: "ACTIVE",
      },
    });
    cleanupRateSheetIds.push(rateActGoa.id);

    // 26. Activity assignment to matching destination trip
    const ta1 = await tripActivityService.createTripActivity(agencyA.id, tripMultiDest.id, {
      name: actGoa.name,
      activityId: actGoa.id,
      date: new Date("2027-03-02"),
      numberOfParticipants: 2,
      adultPrice: 2500,
      totalPrice: 5000,
    });
    assert(ta1.id !== undefined && ta1.activityId === actGoa.id, "Test 26: Activity assigned to matching trip destination successfully");

    // 27. Activity assignment to non-matching destination trip rejected
    let actRejected = false;
    try {
      const actJaipur = await activityService.createActivity(agencyA.id, { destinationId: destJaipur.id, name: `Jaipur Fort Tour ${timestamp}` });
      cleanupActivityIds.push(actJaipur.id);
      await tripActivityService.createTripActivity(agencyA.id, tripOneDest.id, { // Goa only trip
        name: actJaipur.name,
        activityId: actJaipur.id,
        date: new Date("2027-02-11"),
        numberOfParticipants: 2,
      });
    } catch (e: any) {
      actRejected = e instanceof ValidationError || e?.message?.includes("does not belong to any destination");
    }
    assert(actRejected, "Test 27: Assigning Jaipur activity to Goa-only trip is strictly rejected with ValidationError");

    // ---------------------------------------------------------
    // SECTION 6: VEHICLE DESTINATION INDEPENDENCE
    // ---------------------------------------------------------
    console.log("\n--- SECTION 6: VEHICLE DESTINATION INDEPENDENCE ---");

    // 28. Vehicle does not require Destination
    const vehicle = await prisma.vehicle.create({
      data: {
        agencyId: agencyA.id,
        name: `Toyota Innova Crysta QA20 ${timestamp}`,
        type: "SUV",
        capacity: 6,
      },
    });

    const tv1 = await prisma.tripVehicle.create({
      data: {
        tripId: tripMultiDest.id,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        vehicleType: vehicle.type,
        startDate: new Date("2027-03-01"),
        endDate: new Date("2027-03-10"),
        totalRate: 18000,
      },
    });
    assert(tv1.id !== undefined && tv1.vehicleId === vehicle.id, "Test 28: Vehicle assigned to trip completely independent of Destination requirements");

    // ---------------------------------------------------------
    // SECTION 7: SECURITY & CROSS-TENANT ISOLATION
    // ---------------------------------------------------------
    console.log("\n--- SECTION 7: CROSS-TENANT ISOLATION ---");

    // 29. Cross-agency Hotel cannot be assigned to Agency A trip
    const hotelAgencyB = await prisma.hotel.create({
      data: {
        agencyId: agencyB.id,
        hotelCode: `HTL-B-${timestamp.toString().slice(-4)}`,
        name: "Agency B Secret Hotel",
        destinationId: destAgencyB.id,
        city: "Secret Bay",
      },
    });

    let crossHotelRejected = false;
    try {
      await tripHotelService.createTripHotel(agencyA.id, tripMultiDest.id, {
        hotelId: hotelAgencyB.id,
        checkIn: new Date("2027-03-01"),
        checkOut: new Date("2027-03-04"),
        roomType: "Deluxe",
      });
    } catch (e: any) {
      crossHotelRejected = true;
    }
    assert(crossHotelRejected, "Test 29: Cross-agency hotel rejected when attempting assignment to Agency A trip");

    // 30. Cross-agency Destination cannot be attached to Agency A trip
    let crossTripDestRejected = false;
    try {
      await tripService.createTrip(agencyA.id, {
        customerId: customerA.id,
        title: "Cross Dest Trip",
        startDate: new Date("2027-05-01"),
        endDate: new Date("2027-05-05"),
        destinationIds: [destAgencyB.id],
      });
    } catch (e: any) {
      crossTripDestRejected = true;
    }
    assert(crossTripDestRejected, "Test 30: Cross-agency destination rejected when creating Agency A trip");

    // ---------------------------------------------------------
    // SECTION 8: COSTING, QUOTATION & BOOKING/INVOICE REGRESSION
    // ---------------------------------------------------------
    console.log("\n--- SECTION 8: COSTING, QUOTATION & INVOICE REGRESSION ---");

    // 31. Phase 155 Multiplier & Costing calculation
    // Trip with 1 hotel (2 rooms x 3 nights @ 6500 = 39,000 cost), 1 activity (2 guests @ 2500 = 5,000 cost), 1 vehicle (18,000 cost)
    const costing = await tripCostingService.calculateTripCosting(agencyA.id, tripMultiDest.id);
    assert(
      costing !== null &&
      costing.hotels.length === 1 &&
      costing.hotels[0].rooms === 2 &&
      costing.hotels[0].nights === 3 &&
      costing.hotels[0].totalCost === 39000,
      "Test 31: Phase 155 Room multiplier verified: 2 rooms x 3 nights @ 6500 = exactly 39,000 cost"
    );

    // 32. Quotation generation from trip costing
    const quotation = await quotationService.createQuotation(agencyA.id, {
      tripId: tripMultiDest.id,
      customerId: customerA.id,
      title: `QA-20 Comprehensive Proposal ${timestamp}`,
      subtotal: costing.subtotal,
    });
    cleanupQuotationIds.push(quotation.id);
    assert(
      quotation.id !== undefined && Number(quotation.finalAmount) > 0,
      "Test 32: Quotation generated accurately from trip itinerary services with positive total amount"
    );

    // 33. Booking conversion & invoice generation
    const booking = await bookingService.createBooking(agencyA.id, {
      tripId: tripMultiDest.id,
      customerId: customerA.id,
      quotationId: quotation.id,
      totalAmount: Number(quotation.finalAmount),
      currency: "INR",
      status: "CONFIRMED",
    });
    cleanupBookingIds.push(booking.id);

    const invoice = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, booking.id);
    cleanupInvoiceIds.push(invoice.id);
    assert(
      booking.status === "CONFIRMED" && invoice.id !== undefined && Boolean(invoice.invoiceNumber?.startsWith("INV-")),
      "Test 33: Confirmed booking converts to invoice with persistent invoice number"
    );

  } catch (error: any) {
    console.error("\n❌ Unexpected error during QA-20 execution:", error);
    report.failed++;
    report.results.push({
      test: "QA-20 Execution Pipeline",
      status: "FAIL",
      details: error?.message || String(error),
    });
  } finally {
    // ---------------------------------------------------------
    // CLEANUP OF ALL TEMPORARY QA DATA
    // ---------------------------------------------------------
    console.log("\n--- CLEANUP OF QA-20 TEST ARTIFACTS ---");

    if (cleanupInvoiceIds.length > 0) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: cleanupInvoiceIds } } }).catch(() => {});
      await prisma.invoice.deleteMany({ where: { id: { in: cleanupInvoiceIds } } }).catch(() => {});
    }

    if (cleanupBookingIds.length > 0) {
      await prisma.booking.deleteMany({ where: { id: { in: cleanupBookingIds } } }).catch(() => {});
    }

    if (cleanupQuotationIds.length > 0) {
      await prisma.quotationItem.deleteMany({ where: { quotationId: { in: cleanupQuotationIds } } }).catch(() => {});
      await prisma.quotation.deleteMany({ where: { id: { in: cleanupQuotationIds } } }).catch(() => {});
    }

    if (cleanupTripIds.length > 0) {
      await prisma.tripHotel.deleteMany({ where: { tripId: { in: cleanupTripIds } } }).catch(() => {});
      await prisma.tripActivity.deleteMany({ where: { tripId: { in: cleanupTripIds } } }).catch(() => {});
      await prisma.tripVehicle.deleteMany({ where: { tripId: { in: cleanupTripIds } } }).catch(() => {});
      await prisma.tripDestination.deleteMany({ where: { tripId: { in: cleanupTripIds } } }).catch(() => {});
      await prisma.trip.deleteMany({ where: { id: { in: cleanupTripIds } } }).catch(() => {});
    }

    if (cleanupRateSheetIds.length > 0) {
      await prisma.rateSheet.deleteMany({ where: { id: { in: cleanupRateSheetIds } } }).catch(() => {});
    }

    if (cleanupHotelIds.length > 0) {
      await prisma.hotel.deleteMany({ where: { id: { in: cleanupHotelIds } } }).catch(() => {});
    }

    if (cleanupActivityIds.length > 0) {
      await prisma.activity.deleteMany({ where: { id: { in: cleanupActivityIds } } }).catch(() => {});
    }

    if (tempAgencyBId) {
      await prisma.hotel.deleteMany({ where: { agencyId: tempAgencyBId } }).catch(() => {});
      await prisma.destination.deleteMany({ where: { agencyId: tempAgencyBId } }).catch(() => {});
      await prisma.agency.deleteMany({ where: { id: tempAgencyBId } }).catch(() => {});
    }

    console.log("Cleanup complete. Database state restored.");
  }

  // Final Summary
  console.log("\n=======================================================================");
  console.log(`  QA-20 SUMMARY: ${report.passed}/${report.total} TESTS PASSED (${report.failed} FAILED)`);
  console.log("=======================================================================\n");

  if (report.failed > 0) {
    process.exit(1);
  }
}

runQA20()
  .catch((err) => {
    console.error("Fatal QA-20 error:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
