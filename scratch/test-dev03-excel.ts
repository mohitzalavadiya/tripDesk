import "dotenv/config";
import * as XLSX from "xlsx";
import { prisma } from "../src/lib/prisma";
import { hotelService } from "../src/lib/services/hotel-service";
import { hotelExcelService } from "../src/lib/excel/hotel-excel-service";
import { rateExcelService } from "../src/lib/excel/rate-excel-service";
import { rateSheetService } from "../src/lib/services/rate-sheet-service";

async function runDev03Tests() {
  console.log("=================================================");
  console.log("TRIPDESK DEV-03B AUTOMATED VERIFICATION SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
      failed++;
    }
  }

  // Create two isolated test agencies
  const timestamp = Date.now();
  const agencyA = await prisma.agency.create({
    data: {
      name: `DEV03 Agency A ${timestamp}`,
      email: `agency_a_${timestamp}@tripdesk.test`,
      phone: `999000${String(timestamp).slice(-4)}`,
    },
  });

  const agencyB = await prisma.agency.create({
    data: {
      name: `DEV03 Agency B ${timestamp}`,
      email: `agency_b_${timestamp}@tripdesk.test`,
      phone: `999111${String(timestamp).slice(-4)}`,
    },
  });

  try {
    // -------------------------------------------------------------
    // HOTEL SUITE
    // -------------------------------------------------------------
    console.log("\n--- Testing Hotel Master & Hotel Code ---");

    // 1. Create Hotel manually -> Hotel Code generated
    const hotel1 = await hotelService.createHotel(agencyA.id, {
      name: "Grand View Resort",
      city: "Munnar",
      category: "5 Star",
      address: "Tea Estate Rd",
      phone: "9876543210",
      email: "grandview@test.com",
    });
    assert(
      Boolean(hotel1.hotelCode && /^HTL-\d{4,}$/.test(hotel1.hotelCode)),
      "1. Hotel creation generates sequential Hotel Code",
      `Received: ${hotel1.hotelCode}`
    );

    // 2. Second Hotel in Agency A gets next code
    const hotel2 = await hotelService.createHotel(agencyA.id, {
      name: "Seaside Villa",
      city: "Kovalam",
      category: "4 Star",
    });
    assert(
      hotel2.hotelCode !== hotel1.hotelCode,
      "2. Sequential Hotel Codes are unique per agency",
      `Hotel1: ${hotel1.hotelCode}, Hotel2: ${hotel2.hotelCode}`
    );

    // 3. Hotel update does not change Hotel Code
    const updatedHotel1 = await hotelService.updateHotel(agencyA.id, hotel1.id, {
      name: "Grand View Luxury Resort",
      notes: "Renovated 2026",
    });
    assert(
      updatedHotel1.hotelCode === hotel1.hotelCode,
      "3. Hotel update strictly preserves immutable Hotel Code",
      `Original: ${hotel1.hotelCode}, Updated: ${updatedHotel1.hotelCode}`
    );

    // 4. Duplicate Hotel detected
    const dupCheck = await hotelService.findExistingHotelByNameAndCity(agencyA.id, "grand view luxury resort", "munnar");
    assert(
      dupCheck?.id === hotel1.id,
      "4. Normalized duplicate hotel detection matches by agency + name + city"
    );

    // 5. Cross-tenant Hotel isolation: Agency B cannot see Agency A's Hotel
    const crossTenantGet = await hotelService.getHotelById(agencyB.id, hotel1.id);
    assert(
      crossTenantGet === null,
      "5. Tenant isolation: Agency B cannot retrieve Agency A's Hotel by ID"
    );

    const crossTenantCode = await hotelService.getHotelByCode(agencyB.id, hotel1.hotelCode!);
    assert(
      crossTenantCode === null,
      "6. Tenant isolation: Agency B cannot resolve Agency A's Hotel Code"
    );

    // -------------------------------------------------------------
    // HOTEL EXCEL IMPORT SUITE
    // -------------------------------------------------------------
    console.log("\n--- Testing Hotel Excel Importer ---");

    // Generate test Hotel Excel workbook
    function createHotelWorkbook(rows: any[][]): Buffer {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Hotels");
      return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    }

    const hotelImportRows = [
      ["Hotel Name", "Category", "Address", "City", "State", "Country", "Phone", "Email", "Website", "Notes"],
      ["Pine Valley Retreat", "3 Star", "Cliff Top", "Kodaikanal", "Tamil Nadu", "India", "9123456780", "pine@test.com", "https://pine.test", "Forest view"],
      ["Grand View Luxury Resort", "5 Star", "Updated Address", "Munnar", "Kerala", "India", "9876543210", "grandview@test.com", "", "Updated notes"], // Duplicate in DB
      ["Invalid Hotel Missing City", "4 Star", "Street 1", "", "Kerala", "India", "", "", "", ""], // Missing city (error)
      ["Pine Valley Retreat", "3 Star", "Cliff Top", "Kodaikanal", "Tamil Nadu", "India", "", "", "", ""], // Same-file duplicate of row 2
    ];

    const hotelWbBuffer = createHotelWorkbook(hotelImportRows);

    // 7. Preview performs ZERO writes
    const preCount = await prisma.hotel.count({ where: { agencyId: agencyA.id } });
    const hotelPreview = await hotelExcelService.parseAndPreview(hotelWbBuffer, agencyA.id, "SKIP");
    const postCount = await prisma.hotel.count({ where: { agencyId: agencyA.id } });
    assert(
      preCount === postCount,
      "7. Hotel preview performs ZERO database writes",
      `Pre: ${preCount}, Post: ${postCount}`
    );

    assert(
      hotelPreview.summary.errorRows === 2, // Missing city + in-file duplicate
      "8. Hotel preview accurately flags missing required fields and same-file duplicates",
      `Errors: ${hotelPreview.summary.errorRows}`
    );

    assert(
      hotelPreview.summary.skipCount === 1,
      "9. Hotel preview flags existing matching hotel as SKIP in SKIP mode",
      `Skip count: ${hotelPreview.summary.skipCount}`
    );

    // 10. Execute Hotel Import with SKIP mode
    const executeSkip = await hotelExcelService.executeImport(hotelWbBuffer, agencyA.id, "SKIP");
    assert(
      executeSkip.imported === 1 && executeSkip.skipped === 1 && executeSkip.failed === 2,
      "10. Hotel execute in SKIP mode imports new, skips existing, and reports errors",
      `Imported: ${executeSkip.imported}, Skipped: ${executeSkip.skipped}, Failed: ${executeSkip.failed}`
    );

    // 11. Execute Hotel Import with UPDATE mode
    const hotelUpdateRows = [
      ["Hotel Name", "Category", "Address", "City", "State", "Country", "Phone", "Email", "Website", "Notes"],
      ["Grand View Luxury Resort", "5 Star Deluxe", "Newly Renovated Suite Rd", "Munnar", "Kerala", "India", "", "", "", "New luxury wing"],
    ];
    const updateWbBuffer = createHotelWorkbook(hotelUpdateRows);
    const executeUpdate = await hotelExcelService.executeImport(updateWbBuffer, agencyA.id, "UPDATE");
    const reloadedHotel1 = await prisma.hotel.findUnique({ where: { id: hotel1.id } });
    assert(
      executeUpdate.updated === 1 && reloadedHotel1?.category === "5 Star Deluxe" && reloadedHotel1?.phone === "9876543210",
      "11. Hotel UPDATE mode updates non-empty fields while preserving untouched fields (phone)",
      `Category: ${reloadedHotel1?.category}, Phone: ${reloadedHotel1?.phone}`
    );

    // -------------------------------------------------------------
    // HOTEL RATE EXCEL IMPORT SUITE
    // -------------------------------------------------------------
    console.log("\n--- Testing Hotel Rate Excel Importer ---");

    function createRateWorkbook(rows: any[][]): Buffer {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, "Rates");
      return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    }

    const rateImportRows = [
      ["Hotel Code", "Room Type", "Meal Plan", "Season", "Valid From", "Valid To", "Cost Price", "Extra Adult", "Extra Child", "Notes"],
      [hotel1.hotelCode, "Deluxe Room", "CP", "Summer", "01-04-2026", "30-06-2026", 4500, 1500, 800, "Includes breakfast"],
      [hotel1.hotelCode, "Deluxe Room", "MAP", "Summer", "01-04-2026", "30-06-2026", 5500, 1800, 1000, "Different plan same date"], // Valid different meal plan
      [hotel1.hotelCode, "Deluxe Room", "CP", "Monsoon", "01-07-2026", "30-09-2026", 3800, 1200, 600, "Adjacent period"], // Valid adjacent period
      ["HTL-9999", "Deluxe Room", "CP", "Summer", "01-04-2026", "30-06-2026", 4500, "", "", ""], // Unknown hotel code -> blocking error
      [hotel1.hotelCode, "Deluxe Room", "INVALID_PLAN", "Summer", "01-04-2026", "30-06-2026", 4500, "", "", ""], // Invalid meal plan
      [hotel1.hotelCode, "Deluxe Room", "CP", "Summer", "30-06-2026", "01-04-2026", 4500, "", "", ""], // Valid From > Valid To
      [hotel1.hotelCode, "Deluxe Room", "CP", "Summer", "01-04-2026", "30-06-2026", -500, "", "", ""], // Negative price
      [hotel1.hotelCode, "Deluxe Room", "CP", "Summer", "15-05-2026", "15-07-2026", 4900, "", "", ""], // In-file overlap with row 2 (01-Apr to 30-Jun)
    ];

    const rateWbBuffer = createRateWorkbook(rateImportRows);

    // 12. Rate Preview performs ZERO writes
    const preRateCount = await prisma.rateSheet.count({ where: { agencyId: agencyA.id } });
    const ratePreview = await rateExcelService.parseAndPreview(rateWbBuffer, agencyA.id, "SKIP");
    const postRateCount = await prisma.rateSheet.count({ where: { agencyId: agencyA.id } });
    assert(
      preRateCount === postRateCount,
      "12. Rate preview performs ZERO database writes",
      `Pre: ${preRateCount}, Post: ${postRateCount}`
    );

    // 13. Rate Preview rejects unknown hotel code
    const unknownHotelRow = ratePreview.rows.find((r) => r.hotelCode === "HTL-9999");
    assert(
      unknownHotelRow?.status === "ERROR" && unknownHotelRow.errors.some((e) => e.includes("Unknown Hotel Code")),
      "13. Unknown Hotel Code causes row-level blocking error",
      `Errors: ${unknownHotelRow?.errors.join("; ")}`
    );

    // 14. Rate Preview rejects invalid meal plan
    const invalidPlanRow = ratePreview.rows.find((r) => r.mealPlan === "INVALID_PLAN");
    assert(
      invalidPlanRow?.status === "ERROR" && invalidPlanRow.errors.some((e) => e.includes("Invalid Meal Plan")),
      "14. Invalid Meal Plan rejected (only EP, CP, MAP, AP allowed)"
    );

    // 15. Rate Preview detects in-file overlap conflict
    const overlapRow = ratePreview.rows.find((r) => r.rowNumber === 9);
    assert(
      overlapRow?.status === "ERROR" && overlapRow.errors.some((e) => e.includes("Overlapping validity period conflict")),
      "15. In-file overlapping validity periods are detected and flagged without later-row-wins"
    );

    // 16. Execute valid Rate import rows
    const validRateRows = [
      ["Hotel Code", "Room Type", "Meal Plan", "Season", "Valid From", "Valid To", "Cost Price", "Extra Adult", "Extra Child", "Notes"],
      [hotel1.hotelCode, "Deluxe Room", "CP", "Summer", "01-04-2026", "30-06-2026", 4500, 1500, 800, "Includes breakfast"],
      [hotel1.hotelCode, "Deluxe Room", "MAP", "Summer", "01-04-2026", "30-06-2026", 5500, 1800, 1000, "Different meal plan"],
      [hotel1.hotelCode, "Deluxe Room", "CP", "Monsoon", "01-07-2026", "30-09-2026", 3800, 1200, 600, "Adjacent period"],
    ];
    const validRateWb = createRateWorkbook(validRateRows);
    const executeRate1 = await rateExcelService.executeImport(validRateWb, agencyA.id, "SKIP");
    assert(
      executeRate1.imported === 3 && executeRate1.failed === 0,
      "16. Valid rate rows import successfully with correct meal plans and adjacent dates",
      `Imported: ${executeRate1.imported}`
    );

    // 17. Re-importing exact matching rate with SKIP mode
    const executeRateSkip = await rateExcelService.executeImport(validRateWb, agencyA.id, "SKIP");
    assert(
      executeRateSkip.skipped === 3 && executeRateSkip.imported === 0,
      "17. Exact matching rate sheets in SKIP mode are skipped without duplication",
      `Skipped: ${executeRateSkip.skipped}`
    );

    // 18. Re-importing exact matching rate with UPDATE mode
    const updateRateRows = [
      ["Hotel Code", "Room Type", "Meal Plan", "Season", "Valid From", "Valid To", "Cost Price", "Extra Adult", "Extra Child", "Notes"],
      [hotel1.hotelCode, "Deluxe Room", "CP", "Summer Special", "01-04-2026", "30-06-2026", 4800, 1600, 900, "Updated summer rate"],
    ];
    const updateRateWb = createRateWorkbook(updateRateRows);
    const executeRateUpdate = await rateExcelService.executeImport(updateRateWb, agencyA.id, "UPDATE");
    assert(
      executeRateUpdate.updated === 1,
      "18. Exact matching rate sheet in UPDATE mode updates cost price and extra occupant rates"
    );

    // 19. Overlapping non-identical rate against DB is REJECTED
    const conflictRateRows = [
      ["Hotel Code", "Room Type", "Meal Plan", "Season", "Valid From", "Valid To", "Cost Price", "Extra Adult", "Extra Child", "Notes"],
      [hotel1.hotelCode, "Deluxe Room", "CP", "Conflict Period", "15-05-2026", "15-07-2026", 5000, 1500, 800, "Overlaps with 01-Apr to 30-Jun"],
    ];
    const conflictRateWb = createRateWorkbook(conflictRateRows);
    const conflictPreview = await rateExcelService.parseAndPreview(conflictRateWb, agencyA.id, "SKIP");
    assert(
      conflictPreview.rows[0].status === "REJECT" && conflictPreview.rows[0].errors.some((e) => e.includes("Overlaps with existing active rate period")),
      "19. Overlapping non-identical rate against existing DB records is strictly REJECTED"
    );

    // 20. Cross-tenant rate import: Agency B cannot import rate using Agency A's Hotel Code
    const agencyBCrossRateRows = [
      ["Hotel Code", "Room Type", "Meal Plan", "Season", "Valid From", "Valid To", "Cost Price", "Extra Adult", "Extra Child", "Notes"],
      [hotel1.hotelCode, "Deluxe Room", "CP", "Summer", "01-04-2026", "30-06-2026", 4500, "", "", ""],
    ];
    const agencyBCrossWb = createRateWorkbook(agencyBCrossRateRows);
    const agencyBPreview = await rateExcelService.parseAndPreview(agencyBCrossWb, agencyB.id, "SKIP");
    assert(
      agencyBPreview.rows[0].status === "ERROR" && agencyBPreview.rows[0].errors.some((e) => e.includes("Unknown Hotel Code")),
      "20. Security / Tenant Isolation: Agency B cannot import rates using Agency A's Hotel Code"
    );

    // -------------------------------------------------------------
    // SAMPLE WORKBOOK GENERATION SUITE
    // -------------------------------------------------------------
    console.log("\n--- Testing Sample Workbook Downloads ---");

    const hotelSampleBuffer = hotelExcelService.generateSampleWorkbook();
    const hotelSampleWb = XLSX.read(hotelSampleBuffer, { type: "buffer" });
    assert(
      hotelSampleWb.SheetNames.includes("Instructions") && hotelSampleWb.SheetNames.includes("Hotels"),
      "21. Hotel sample workbook contains 'Instructions' and 'Hotels' sheets"
    );

    const rateSampleBuffer = await rateExcelService.generateSampleWorkbook(agencyA.id);
    const rateSampleWb = XLSX.read(rateSampleBuffer, { type: "buffer" });
    assert(
      rateSampleWb.SheetNames.includes("Instructions") &&
      rateSampleWb.SheetNames.includes("Rates") &&
      rateSampleWb.SheetNames.includes("Hotels Reference"),
      "22. Hotel Rate sample workbook contains 'Instructions', 'Rates', and 'Hotels Reference' sheets"
    );

    const refSheet = rateSampleWb.Sheets["Hotels Reference"];
    const refData: any[][] = XLSX.utils.sheet_to_json(refSheet, { header: 1 });
    const containsHotel1Code = refData.some((row) => row.includes(hotel1.hotelCode));
    assert(
      containsHotel1Code,
      "23. Hotels Reference sheet is populated with authenticated agency's real Hotel Codes",
      `Hotel code: ${hotel1.hotelCode}`
    );

  } finally {
    // Cleanup test agencies and related records
    console.log("\nCleaning up test data...");
    await prisma.rateSheet.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.hotel.deleteMany({ where: { agencyId: { in: [agencyA.id, agencyB.id] } } });
    await prisma.agency.deleteMany({ where: { id: { in: [agencyA.id, agencyB.id] } } });
  }

  console.log("\n=================================================");
  console.log(`DEV-03B VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runDev03Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
