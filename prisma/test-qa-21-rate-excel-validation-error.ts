import "dotenv/config";
import * as XLSX from "xlsx";
import prisma from "@/lib/prisma";
import { rateExcelService } from "@/lib/excel/rate-excel-service";
import { ValidationError, ApiError, handleApiError } from "@/lib/api";

async function main() {
  console.log("================================================================================");
  console.log("  QA-21 — HOTEL RATE EXCEL IMPORT VALIDATION ERROR CLASSIFICATION TEST");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  const agency = await prisma.agency.findFirst({
    where: { name: "TripDesk Offical Test Agnecy" },
  });

  if (!agency) {
    throw new Error("Permanent test agency not found!");
  }

  const initialHotelCount = await prisma.hotel.count({ where: { agencyId: agency.id, archivedAt: null } });
  const initialHotelRateCount = await prisma.rateSheet.count({ where: { agencyId: agency.id, inventoryType: "HOTEL", archivedAt: null } });
  const initialVehicleCount = await prisma.vehicle.count({ where: { agencyId: agency.id } });
  const initialDestinationCount = await prisma.destination.count({ where: { agencyId: agency.id } });

  console.log("\n--- TEST GROUP 1: Invalid Header 'Hotel Code (Test Mapping)' ---");

  // Create in-memory workbook with invalid column header
  const invalidHeaderWb = XLSX.utils.book_new();
  const invalidHeaderWs = XLSX.utils.aoa_to_sheet([
    ["Hotel Code (Test Mapping)", "Room Type", "Meal Plan", "Valid From", "Valid To", "Cost Price"],
    ["TEST-001", "Deluxe", "CP", "01-04-2026", "30-06-2026", 4500],
  ]);
  XLSX.utils.book_append_sheet(invalidHeaderWb, invalidHeaderWs, "Rates");
  const invalidBuffer = XLSX.write(invalidHeaderWb, { type: "buffer", bookType: "xlsx" });

  let caughtError: any = null;
  try {
    await rateExcelService.parseAndPreview(invalidBuffer, agency.id, "UPDATE");
  } catch (err: any) {
    caughtError = err;
  }

  assert(caughtError !== null, "parseAndPreview throws on invalid header 'Hotel Code (Test Mapping)'");
  assert(caughtError instanceof ValidationError, "Caught error is an instance of ValidationError");
  assert(caughtError instanceof ApiError, "Caught error is an instance of ApiError");
  assert(caughtError.statusCode === 400, `Caught error has statusCode 400 (actual: ${caughtError?.statusCode})`);
  assert(caughtError.code === "VALIDATION_ERROR", `Caught error has code 'VALIDATION_ERROR' (actual: ${caughtError?.code})`);
  assert(
    caughtError.message.includes("Invalid template headers. Missing required column(s): 'Hotel Code'"),
    `Error message accurately identifies missing 'Hotel Code' (actual: ${caughtError?.message})`
  );

  // Test handleApiError response
  const apiResponse = handleApiError(caughtError);
  const responseStatus = apiResponse.status;
  const responseJson = await apiResponse.json();

  assert(responseStatus === 400, `handleApiError returns HTTP 400 status (actual: ${responseStatus})`);
  assert(responseJson.success === false, "handleApiError response has success: false");
  assert(responseJson.error?.code === "VALIDATION_ERROR", `handleApiError response code is 'VALIDATION_ERROR' (actual: ${responseJson.error?.code})`);
  assert(
    responseJson.error?.message.includes("Invalid template headers"),
    "handleApiError response message preserves descriptive validation reason"
  );

  console.log("\n--- TEST GROUP 2: Missing Workbook / Empty Sheet / Limits ---");

  // Empty sheet
  const emptyWb = XLSX.utils.book_new();
  const emptyWs = XLSX.utils.aoa_to_sheet([]);
  XLSX.utils.book_append_sheet(emptyWb, emptyWs, "Rates");
  const emptyBuffer = XLSX.write(emptyWb, { type: "buffer", bookType: "xlsx" });

  let emptyError: any = null;
  try {
    await rateExcelService.parseAndPreview(emptyBuffer, agency.id, "UPDATE");
  } catch (err: any) {
    emptyError = err;
  }
  assert(emptyError instanceof ValidationError, "Empty sheet throws ValidationError");
  assert(emptyError?.message.includes("empty"), "Empty sheet message indicates sheet is empty");

  // Missing data rows
  const headerOnlyWb = XLSX.utils.book_new();
  const headerOnlyWs = XLSX.utils.aoa_to_sheet([
    ["Hotel Code", "Room Type", "Meal Plan", "Valid From", "Valid To", "Cost Price"],
  ]);
  XLSX.utils.book_append_sheet(headerOnlyWb, headerOnlyWs, "Rates");
  const headerOnlyBuffer = XLSX.write(headerOnlyWb, { type: "buffer", bookType: "xlsx" });

  let noRowsError: any = null;
  try {
    await rateExcelService.parseAndPreview(headerOnlyBuffer, agency.id, "UPDATE");
  } catch (err: any) {
    noRowsError = err;
  }
  assert(noRowsError instanceof ValidationError, "Header-only sheet with no data rows throws ValidationError");

  console.log("\n--- TEST GROUP 3: Official 'Hotel Code' Header Accepted ---");

  // Fetch actual hotel for valid test
  const hotel = await prisma.hotel.findFirst({
    where: { agencyId: agency.id, archivedAt: null },
  });

  if (hotel && hotel.hotelCode) {
    const validWb = XLSX.utils.book_new();
    const validWs = XLSX.utils.aoa_to_sheet([
      ["Hotel Code", "Room Type", "Meal Plan", "Season", "Valid From", "Valid To", "Cost Price", "Extra Adult", "Extra Child", "Notes"],
      [hotel.hotelCode, "Deluxe Room", "CP", "Summer Season", "01-05-2026", "30-06-2026", 4500, 1500, 800, "Breakfast included"],
    ]);
    XLSX.utils.book_append_sheet(validWb, validWs, "Rates");
    const validBuffer = XLSX.write(validWb, { type: "buffer", bookType: "xlsx" });

    let validResult: any = null;
    let validThrown: any = null;
    try {
      validResult = await rateExcelService.parseAndPreview(validBuffer, agency.id, "UPDATE");
    } catch (err: any) {
      validThrown = err;
    }

    assert(validThrown === null, `Official 'Hotel Code' header parsed without throwing errors`);
    assert(validResult !== null, "Official 'Hotel Code' returned valid RatePreviewResult");
    assert(validResult?.summary?.totalRows === 1, "Preview returned exactly 1 row");
    assert(validResult?.summary?.validRows === 1, "Preview row status is valid");
    assert(validResult?.canExecute === true, "Preview canExecute is true");
  } else {
    console.warn("  [SKIP] Hotel master empty, skipping official header data test");
  }

  console.log("\n--- TEST GROUP 4: Database Safety & Invariant Verification ---");

  const finalHotelCount = await prisma.hotel.count({ where: { agencyId: agency.id, archivedAt: null } });
  const finalHotelRateCount = await prisma.rateSheet.count({ where: { agencyId: agency.id, inventoryType: "HOTEL", archivedAt: null } });
  const finalVehicleCount = await prisma.vehicle.count({ where: { agencyId: agency.id } });
  const finalDestinationCount = await prisma.destination.count({ where: { agencyId: agency.id } });

  assert(finalHotelCount === initialHotelCount, `Hotel count unchanged (${finalHotelCount} === ${initialHotelCount})`);
  assert(finalHotelRateCount === initialHotelRateCount, `Hotel RateSheet count unchanged (${finalHotelRateCount} === ${initialHotelRateCount})`);
  assert(finalVehicleCount === initialVehicleCount, `Vehicle count unchanged (${finalVehicleCount} === ${initialVehicleCount})`);
  assert(finalDestinationCount === initialDestinationCount, `Destination count unchanged (${finalDestinationCount} === ${initialDestinationCount})`);

  console.log("\n================================================================================");
  console.log(`  QA-21 RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
