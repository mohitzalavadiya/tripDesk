import prisma from "../src/lib/prisma";
import { hotelService } from "../src/lib/services/hotel-service";
import { hotelExcelService } from "../src/lib/excel/hotel-excel-service";
import { rateExcelService } from "../src/lib/excel/rate-excel-service";
import { tripHotelService } from "../src/lib/services/trip-hotel-service";
import { tripService } from "../src/lib/services/trip-service";
import { rateSheetService } from "../src/lib/services/rate-sheet-service";
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

async function runQA19() {
  console.log("\n=======================================================================");
  console.log("  TRIPDESK QA-19 — HOTEL MASTER DESTINATION & EXCEL INTEGRATION AUDIT");
  console.log("=======================================================================\n");

  let agencyA: any = null;
  let destGoa: any = null;
  let destMumbai: any = null;

  // Agency B for cross-agency isolation test
  let agencyB: any = null;
  let destAgencyB: any = null;

  const cleanupHotelIds: string[] = [];
  const cleanupTripIds: string[] = [];
  const cleanupRateSheetIds: string[] = [];
  let tempAgencyBId: string | null = null;

  try {
    // 1. Setup Agency A (Permanent bootstrap agency)
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
    if (!destGoa) {
      destGoa = await prisma.destination.create({
        data: { agencyId: agencyA.id, name: "Goa", state: "Goa", country: "India", status: "ACTIVE" },
      });
    }

    destMumbai = await prisma.destination.findFirst({
      where: { agencyId: agencyA.id, name: "Mumbai", status: "ACTIVE" },
    });
    if (!destMumbai) {
      destMumbai = await prisma.destination.create({
        data: { agencyId: agencyA.id, name: "Mumbai", state: "Maharashtra", country: "India", status: "ACTIVE" },
      });
    }

    // Create temporary Agency B for isolation tests
    const timestamp = Date.now();
    agencyB = await prisma.agency.create({
      data: {
        name: `QA-19 Agency B ${timestamp}`,
        email: `qa19_b_${timestamp}@tripdesk.test`,
        phone: `9988${String(timestamp).slice(-6)}`,
      },
    });
    tempAgencyBId = agencyB.id;

    destAgencyB = await prisma.destination.create({
      data: {
        agencyId: agencyB.id,
        name: "Agency B Exclusive Destination",
        status: "ACTIVE",
      },
    });

    console.log("--- SECTION 1: HOTEL MASTER VALIDATION & TENANT ISOLATION ---");

    // Test 1: Hotel Name missing -> rejected
    let t1Rejected = false;
    try {
      await hotelService.createHotel(agencyA.id, {
        destinationId: destGoa.id,
        name: "" as any,
        city: "Benaulim",
      });
    } catch (err: any) {
      t1Rejected = true;
    }
    assert(t1Rejected, "Test 1: Hotel Name missing is rejected");

    // Test 2: Destination missing -> rejected
    let t2Rejected = false;
    try {
      await hotelService.createHotel(agencyA.id, {
        destinationId: "" as any,
        name: "Hotel Without Destination",
        city: "Benaulim",
      });
    } catch (err: any) {
      t2Rejected = err instanceof ValidationError || err?.message?.includes("Destination is required");
    }
    assert(t2Rejected, "Test 2: Destination missing when creating new Hotel is rejected with ValidationError");

    // Test 3: Valid Hotel + valid Destination -> succeeds
    const hotelValid = await hotelService.createHotel(agencyA.id, {
      destinationId: destGoa.id,
      name: `Taj Exotica QA ${timestamp}`,
      category: "5 Star",
      city: "Benaulim",
      state: "Goa",
    });
    cleanupHotelIds.push(hotelValid.id);
    assert(
      hotelValid.id !== undefined &&
      hotelValid.destinationId === destGoa.id &&
      hotelValid.city === "Benaulim" &&
      hotelValid.hotelCode?.startsWith("HTL-"),
      "Test 3: Valid Hotel + valid Destination succeeds with auto-generated Hotel Code and distinct City"
    );

    // Test 4: Cross-agency Destination -> rejected
    let t4Rejected = false;
    try {
      await hotelService.createHotel(agencyA.id, {
        destinationId: destAgencyB.id,
        name: "Cross Agency Hotel Attempt",
        city: "Test City",
      });
    } catch (err: any) {
      t4Rejected = err instanceof NotFoundError || err?.message?.includes("does not belong to your agency");
    }
    assert(t4Rejected, "Test 4: Cross-agency Destination is rejected (strict tenant isolation)");

    // Test 5: Unknown Destination -> rejected
    let t5Rejected = false;
    try {
      await hotelService.createHotel(agencyA.id, {
        destinationId: "non-existent-destination-id-12345",
        name: "Unknown Destination Hotel Attempt",
        city: "Test City",
      });
    } catch (err: any) {
      t5Rejected = err instanceof NotFoundError || err?.message?.includes("not found");
    }
    assert(t5Rejected, "Test 5: Unknown/invalid Destination ID is rejected");

    console.log("\n--- SECTION 2: HOTEL EXCEL IMPORT WITH MANDATORY DESTINATION ---");

    // Helper to generate Excel buffer
    function buildHotelExcel(rows: any[][]) {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Hotels");
      return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    }

    const excelHeaders = [
      "Hotel Name",
      "Destination",
      "Category",
      "Address",
      "City",
      "State",
      "Country",
      "Phone",
      "Email",
      "Website",
      "Notes",
    ];

    // Test 6: Valid Hotel row with valid Destination -> imports
    const validExcelBuf = buildHotelExcel([
      excelHeaders,
      [
        `Grand Hyatt QA ${timestamp}`,
        "Goa",
        "5 Star",
        "Bambolim Beach",
        "Bambolim",
        "Goa",
        "India",
        "+91 832 123456",
        "stay@grandhyattqa.com",
        "https://hyatt.com",
        "Luxury resort on Bambolim bay",
      ],
    ]);

    const preview6 = await hotelExcelService.parseAndPreview(validExcelBuf, agencyA.id, "SKIP");
    assert(
      preview6.canExecute &&
      preview6.summary.validRows === 1 &&
      preview6.rows[0].status === "VALID" &&
      preview6.rows[0].destination === "Goa" &&
      preview6.rows[0].destinationId === destGoa.id,
      "Test 6: Valid Hotel row with valid Destination parses as VALID with matched destinationId"
    );

    const exec6 = await hotelExcelService.executeImport(validExcelBuf, agencyA.id, "SKIP");
    assert(exec6.imported === 1 && exec6.failed === 0, "Test 6.1: Valid Hotel row imports into database");

    // Verify imported hotel in DB
    const importedHotel6 = await prisma.hotel.findFirst({
      where: { agencyId: agencyA.id, name: `Grand Hyatt QA ${timestamp}` },
      include: { destination: true },
    });
    if (importedHotel6) cleanupHotelIds.push(importedHotel6.id);
    assert(
      importedHotel6?.destinationId === destGoa.id &&
      importedHotel6?.destination?.name === "Goa" &&
      importedHotel6?.city === "Bambolim",
      "Test 6.2: Imported hotel in DB has exact destinationId relation and preserves distinct city"
    );

    // Test 7: Missing Hotel Name in Excel -> rejected
    const missingNameExcel = buildHotelExcel([
      excelHeaders,
      ["", "Goa", "4 Star", "Address 1", "Panaji", "Goa", "India", "", "", "", ""],
    ]);
    const preview7 = await hotelExcelService.parseAndPreview(missingNameExcel, agencyA.id, "SKIP");
    assert(
      preview7.summary.errorRows === 1 &&
      preview7.rows[0].errors.some((e) => e.includes("Hotel Name is required")),
      "Test 7: Missing Hotel Name in Excel fails row validation"
    );

    // Test 8: Missing Destination in Excel -> rejected
    const missingDestExcel = buildHotelExcel([
      excelHeaders,
      [`Resort No Dest QA ${timestamp}`, "", "4 Star", "Address 1", "Calangute", "Goa", "India", "", "", "", ""],
    ]);
    const preview8 = await hotelExcelService.parseAndPreview(missingDestExcel, agencyA.id, "SKIP");
    assert(
      preview8.summary.errorRows === 1 &&
      preview8.rows[0].errors.some((e) => e.includes("Destination is required")),
      "Test 8: Missing Destination in Excel fails row validation"
    );

    // Test 9: Unknown Destination in Excel -> rejected
    const unknownDestExcel = buildHotelExcel([
      excelHeaders,
      [`Resort Unknown Dest QA ${timestamp}`, "NonExistentDestinationXYZ", "4 Star", "Address 1", "City", "State", "India", "", "", "", ""],
    ]);
    const preview9 = await hotelExcelService.parseAndPreview(unknownDestExcel, agencyA.id, "SKIP");
    assert(
      preview9.summary.errorRows === 1 &&
      preview9.rows[0].errors.some((e) => e.includes("Unknown destination")),
      "Test 9: Unknown Destination in Excel fails row validation with clear error"
    );

    // Test 10: Destination matching ignores leading/trailing whitespace
    const whitespaceDestExcel = buildHotelExcel([
      excelHeaders,
      [`Resort Whitespace Dest QA ${timestamp}`, "   Goa   ", "4 Star", "Beach Road", "Candolim", "Goa", "India", "", "", "", ""],
    ]);
    const preview10 = await hotelExcelService.parseAndPreview(whitespaceDestExcel, agencyA.id, "SKIP");
    assert(
      preview10.summary.validRows === 1 &&
      preview10.rows[0].destinationId === destGoa.id,
      "Test 10: Destination matching successfully trims whitespace ('   Goa   ' matches 'Goa')"
    );

    // Test 11: Destination matching is case-insensitive
    const caseDestExcel = buildHotelExcel([
      excelHeaders,
      [`Resort Case Dest QA ${timestamp}`, "gOa", "4 Star", "Beach Road", "Candolim", "Goa", "India", "", "", "", ""],
    ]);
    const preview11 = await hotelExcelService.parseAndPreview(caseDestExcel, agencyA.id, "SKIP");
    assert(
      preview11.summary.validRows === 1 &&
      preview11.rows[0].destinationId === destGoa.id,
      "Test 11: Destination matching is case-insensitive ('gOa' matches 'Goa')"
    );

    // Test 12: Panaji does not automatically map to Goa
    const panajiExcel = buildHotelExcel([
      excelHeaders,
      [`Hotel Panaji QA ${timestamp}`, "Panaji", "3 Star", "MG Road", "Panaji", "Goa", "India", "", "", "", ""],
    ]);
    const preview12 = await hotelExcelService.parseAndPreview(panajiExcel, agencyA.id, "SKIP");
    assert(
      preview12.summary.errorRows === 1 &&
      preview12.rows[0].errors.some((e) => e.includes("Unknown destination: 'Panaji'")),
      "Test 12: 'Panaji' does NOT automatically infer or map to 'Goa' (strict matching enforced)"
    );

    // Test 13: No Destination is silently created
    const destCountBefore = await prisma.destination.count({ where: { agencyId: agencyA.id } });
    try {
      await hotelExcelService.executeImport(unknownDestExcel, agencyA.id, "SKIP");
    } catch {
      // Expected to fail
    }
    const destCountAfter = await prisma.destination.count({ where: { agencyId: agencyA.id } });
    assert(
      destCountBefore === destCountAfter,
      "Test 13: No Destination is silently created during Excel import"
    );

    // Test 14: Existing Hotel RateSheet Excel behavior remains intact
    const rateSheetSample = await rateExcelService.generateSampleWorkbook(agencyA.id);
    const parsedRateSheetWb = XLSX.read(rateSheetSample, { type: "buffer" });
    const ratesSheet = parsedRateSheetWb.Sheets["Rates"] || parsedRateSheetWb.Sheets[parsedRateSheetWb.SheetNames[1]];
    const rateSheetHeaders = XLSX.utils.sheet_to_json<string[]>(ratesSheet, { header: 1 })[0];
    assert(
      !rateSheetHeaders.some((h) => /^destination$/i.test(h)) &&
      rateSheetHeaders.some((h) => /^hotel\s*code$/i.test(h)),
      "Test 14: Hotel RateSheet Excel template intentionally DOES NOT have Destination column (links via Hotel Code)"
    );

    console.log("\n--- SECTION 3: EXISTING FUNCTIONALITY & LIST INTEGRATION ---");

    // Test 15: Existing Hotel list loads correctly
    const hotelList = await hotelService.listHotels(agencyA.id, { page: 1, limit: 10 });
    assert(
      hotelList.items.length > 0 &&
      hotelList.total > 0 &&
      hotelList.items.every((h) => h.agencyId === agencyA.id),
      "Test 15: Existing Hotel list loads correctly with agency tenancy"
    );

    // Test 16: Destination appears correctly in hotel records
    const hotelWithDest = hotelList.items.find((h) => h.destinationId === destGoa.id);
    assert(
      Boolean(hotelWithDest?.destination?.name === "Goa"),
      "Test 16: Destination relation name is populated correctly in list response"
    );

    // Test 17: Existing Hotel without destination does not crash
    // Create a legacy-style hotel without destination in DB directly to simulate existing record
    const legacyHotel = await prisma.hotel.create({
      data: {
        agencyId: agencyA.id,
        hotelCode: `HTL-LEGACY-${timestamp.toString().slice(-4)}`,
        name: `Legacy Null Dest Hotel ${timestamp}`,
        destinationId: null,
        city: "Legacy Town",
      },
    });
    cleanupHotelIds.push(legacyHotel.id);

    const retrievedLegacy = await hotelService.getHotelById(agencyA.id, legacyHotel.id);
    assert(
      retrievedLegacy !== null &&
      retrievedLegacy.destinationId === null &&
      retrievedLegacy.destination === null,
      "Test 17: Hotel with destinationId = null loads safely without errors"
    );

    // Test 18: Edit Hotel works (updating fields and destination)
    const updatedHotel = await hotelService.updateHotel(agencyA.id, legacyHotel.id, {
      name: `Updated Legacy Hotel ${timestamp}`,
      destinationId: destMumbai.id,
      category: "Boutique",
      notes: "Updated internal notes",
    });
    assert(
      updatedHotel.name === `Updated Legacy Hotel ${timestamp}` &&
      updatedHotel.destinationId === destMumbai.id &&
      updatedHotel.destination?.name === "Mumbai" &&
      updatedHotel.category === "Boutique",
      "Test 18: Edit Hotel updates destination and fields safely"
    );

    // Test 19: Delete/archive behavior remains safe
    await hotelService.archiveHotel(agencyA.id, legacyHotel.id);
    const archivedHotel = await prisma.hotel.findFirst({
      where: { id: legacyHotel.id },
    });
    assert(
      archivedHotel?.archivedAt !== null,
      "Test 19: Hotel archive/soft-delete marks archivedAt without destructive data loss"
    );

    // Test 20: Trip Hotel destination filtering still works
    const testCustomer = await prisma.customer.findFirst({
      where: { agencyId: agencyA.id },
    });
    const customerId = testCustomer ? testCustomer.id : (
      await prisma.customer.create({
        data: {
          agencyId: agencyA.id,
          name: `Test Customer QA19 ${timestamp}`,
          email: `qa19_cust_${timestamp}@test.com`,
          phone: "+91 99999 11111",
        },
      })
    ).id;

    const tripWithGoa = await tripService.createTrip(agencyA.id, {
      customerId,
      title: `QA-19 Destination Filter Trip ${timestamp}`,
      startDate: new Date("2027-01-10"),
      endDate: new Date("2027-01-15"),
      destinationIds: [destGoa.id],
    });
    cleanupTripIds.push(tripWithGoa.id);

    // Create a Mumbai hotel under Agency A
    const hotelMumbai = await hotelService.createHotel(agencyA.id, {
      destinationId: destMumbai.id,
      name: `Marine Plaza QA ${timestamp}`,
      category: "5 Star",
      city: "Mumbai",
      state: "Maharashtra",
    });
    cleanupHotelIds.push(hotelMumbai.id);

    // 1. Assign Goa hotel to Goa trip -> succeeds
    const assignedGoaHotel = await tripHotelService.createTripHotel(agencyA.id, tripWithGoa.id, {
      hotelId: hotelValid.id,
      checkIn: new Date("2027-01-10"),
      checkOut: new Date("2027-01-15"),
      roomType: "Deluxe Ocean View",
    });
    assert(
      assignedGoaHotel.id !== undefined && assignedGoaHotel.hotelId === hotelValid.id,
      "Test 20.1: Assigning matching destination hotel (Goa hotel to Goa trip) succeeds"
    );

    // 2. Attempt to assign Mumbai hotel to Goa trip -> rejected with ValidationError
    let mumbaiRejected = false;
    try {
      await tripHotelService.createTripHotel(agencyA.id, tripWithGoa.id, {
        hotelId: hotelMumbai.id,
        checkIn: new Date("2027-01-10"),
        checkOut: new Date("2027-01-15"),
        roomType: "Standard Room",
      });
    } catch (err: any) {
      mumbaiRejected = err instanceof ValidationError || err?.message?.includes("does not belong to any destination");
    }
    assert(
      mumbaiRejected,
      "Test 20.2: Attempting to assign non-matching destination hotel (Mumbai hotel to Goa trip) is rejected with ValidationError"
    );

    // Test 21: Hotel RateSheet selection still works
    const testRateSheet = await prisma.rateSheet.create({
      data: {
        agencyId: agencyA.id,
        name: `Deluxe Ocean View CP Rate ${timestamp}`,
        inventoryType: "HOTEL",
        hotelId: hotelValid.id,
        roomType: "Deluxe Ocean View",
        mealPlan: "CP",
        validFrom: new Date("2027-01-01"),
        validTo: new Date("2027-12-31"),
        costPrice: 8500,
        status: "ACTIVE",
      },
    });
    cleanupRateSheetIds.push(testRateSheet.id);

    const rateResult = await rateSheetService.getApplicableHotelRate(
      agencyA.id,
      hotelValid.id,
      new Date("2027-01-12"),
      "Deluxe Ocean View",
      "CP"
    );
    assert(
      rateResult.matched && rateResult.costPrice === 8500,
      "Test 21: Hotel RateSheet selection auto-matches applicable rate without hardcoded pricing"
    );

  } catch (error: any) {
    console.error("\n❌ Unexpected error during QA-19 execution:", error);
    report.failed++;
    report.results.push({
      test: "QA-19 Execution Pipeline",
      status: "FAIL",
      details: error?.message || String(error),
    });
  } finally {
    // Thorough cleanup of all test data created
    console.log("\n--- CLEANUP OF TEST ARTIFACTS ---");

    if (cleanupTripIds.length > 0) {
      await prisma.tripHotel.deleteMany({ where: { tripId: { in: cleanupTripIds } } }).catch(() => {});
      await prisma.tripDestination.deleteMany({ where: { tripId: { in: cleanupTripIds } } }).catch(() => {});
      await prisma.trip.deleteMany({ where: { id: { in: cleanupTripIds } } }).catch(() => {});
    }

    if (cleanupRateSheetIds.length > 0) {
      await prisma.rateSheet.deleteMany({ where: { id: { in: cleanupRateSheetIds } } }).catch(() => {});
    }

    if (cleanupHotelIds.length > 0) {
      await prisma.hotel.deleteMany({ where: { id: { in: cleanupHotelIds } } }).catch(() => {});
    }

    if (tempAgencyBId) {
      await prisma.destination.deleteMany({ where: { agencyId: tempAgencyBId } }).catch(() => {});
      await prisma.agency.deleteMany({ where: { id: tempAgencyBId } }).catch(() => {});
    }

    console.log("Cleanup complete. Database state restored.");
  }

  // Summary Report
  console.log("\n=======================================================================");
  console.log(`  QA-19 SUMMARY: ${report.passed}/${report.total} TESTS PASSED (${report.failed} FAILED)`);
  console.log("=======================================================================\n");

  if (report.failed > 0) {
    process.exit(1);
  }
}

runQA19().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
