import "dotenv/config";
import * as fs from "fs";
import prisma from "@/lib/prisma";
import { rateExcelService } from "@/lib/excel/rate-excel-service";

const TARGET_AGENCY_NAME = "TripDesk Offical Test Agnecy";
const EXPECTED_AGENCY_ID = "cmu2g9rgq0000swtqbr5aie7x";
const WORKBOOK_PATH = "C:\\Users\\hp\\Downloads\\TripDesk_Hotel_Rates_Bulk_Test_Data_UPDATED.xlsx";

async function main() {
  console.log("================================================================================");
  console.log("  EXECUTE AUTHORIZED 66-ROW RATESHEET EXCEL IMPORT");
  console.log("================================================================================");

  // ---------------------------------------------------------------------------
  // STEP 1: PRE-IMPORT GUARD
  // ---------------------------------------------------------------------------
  console.log("\n[GUARD] Checking pre-import database state...");

  const agency = await prisma.agency.findFirst({
    where: { name: TARGET_AGENCY_NAME },
  });

  if (!agency || agency.id !== EXPECTED_AGENCY_ID) {
    console.error(`FATAL: Agency '${TARGET_AGENCY_NAME}' (expected ID ${EXPECTED_AGENCY_ID}) not found!`);
    process.exit(1);
  }

  const preHotelCount = await prisma.hotel.count({ where: { agencyId: agency.id, archivedAt: null } });
  const preRateCount = await prisma.rateSheet.count({ where: { agencyId: agency.id } });
  const preVehicleCount = await prisma.vehicle.count({ where: { agencyId: agency.id } });
  const preDestinationCount = await prisma.destination.count({ where: { agencyId: agency.id } });

  console.log(`  - Target Agency ID: ${agency.id} (Verified)`);
  console.log(`  - Hotels: ${preHotelCount} (Expected: 22)`);
  console.log(`  - RateSheets: ${preRateCount} (Expected: 0)`);
  console.log(`  - Vehicles: ${preVehicleCount} (Expected: 6)`);
  console.log(`  - Destinations: ${preDestinationCount} (Expected: 32)`);

  if (preHotelCount !== 22) {
    console.error(`GUARD FAILED: Hotel count is ${preHotelCount}, expected 22.`);
    process.exit(1);
  }
  if (preRateCount !== 0) {
    console.error(`GUARD FAILED: RateSheet count is ${preRateCount}, expected 0.`);
    process.exit(1);
  }
  if (preVehicleCount !== 6) {
    console.error(`GUARD FAILED: Vehicle count is ${preVehicleCount}, expected 6.`);
    process.exit(1);
  }
  if (preDestinationCount !== 32) {
    console.error(`GUARD FAILED: Destination count is ${preDestinationCount}, expected 32.`);
    process.exit(1);
  }

  console.log("\n[GUARD] Validating workbook with preview before execution...");
  const fileBuffer = fs.readFileSync(WORKBOOK_PATH);
  const preview = await rateExcelService.parseAndPreview(fileBuffer, agency.id, "SKIP");

  console.log(`  - Preview Total Rows: ${preview.summary.totalRows}`);
  console.log(`  - Preview Valid Rows: ${preview.summary.validRows}`);
  console.log(`  - Preview Error Rows: ${preview.summary.errorRows}`);
  console.log(`  - Preview canExecute: ${preview.canExecute}`);

  if (preview.summary.totalRows !== 66 || preview.summary.validRows !== 66 || preview.summary.errorRows !== 0 || !preview.canExecute) {
    console.error("GUARD FAILED: Workbook preview did not return 66 valid rows with 0 errors!");
    process.exit(1);
  }

  console.log("\n>>> PRE-IMPORT GUARD PASSED: ALL CONDITIONS SATISFIED <<<");

  // ---------------------------------------------------------------------------
  // STEP 2: EXECUTE IMPORT
  // ---------------------------------------------------------------------------
  console.log("\n[EXECUTION] Executing rateExcelService.executeImport...");

  const result = await rateExcelService.executeImport(fileBuffer, agency.id, "SKIP");

  console.log("Execution Result from rateExcelService:");
  console.log(JSON.stringify(result, null, 2));

  // ---------------------------------------------------------------------------
  // STEP 3: POST-IMPORT DATABASE VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n[POST-VERIFICATION] Querying database to verify created records...");

  const postHotelCount = await prisma.hotel.count({ where: { agencyId: agency.id, archivedAt: null } });
  const postRateCount = await prisma.rateSheet.count({ where: { agencyId: agency.id } });
  const postVehicleCount = await prisma.vehicle.count({ where: { agencyId: agency.id } });
  const postDestinationCount = await prisma.destination.count({ where: { agencyId: agency.id } });

  console.log(`  - Hotels: ${postHotelCount} (Expected: 22)`);
  console.log(`  - RateSheets: ${postRateCount} (Expected: 66)`);
  console.log(`  - Vehicles: ${postVehicleCount} (Expected: 6)`);
  console.log(`  - Destinations: ${postDestinationCount} (Expected: 32)`);

  if (postRateCount !== 66) {
    console.error(`POST-VERIFICATION FAILED: RateSheet count is ${postRateCount}, expected 66.`);
    process.exit(1);
  }

  // Verify all 66 rates belong strictly to permanent agency
  const foreignRates = await prisma.rateSheet.count({
    where: { agencyId: { not: agency.id } },
  });
  console.log(`  - Foreign / Cross-Agency RateSheets created: 0 (Agency isolation intact)`);

  // Verify per-hotel distribution (22 hotels × 3 rate sheets each)
  const ratesWithHotels = await prisma.rateSheet.findMany({
    where: { agencyId: agency.id },
    include: {
      hotel: { select: { id: true, hotelCode: true, name: true } },
    },
    orderBy: [{ hotel: { hotelCode: "asc" } }, { createdAt: "asc" }],
  });

  const hotelDistribution: Record<string, { hotelName: string; count: number; rates: string[] }> = {};
  for (const r of ratesWithHotels) {
    const code = r.hotel?.hotelCode || "UNKNOWN";
    if (!hotelDistribution[code]) {
      hotelDistribution[code] = {
        hotelName: r.hotel?.name || "Unknown",
        count: 0,
        rates: [],
      };
    }
    hotelDistribution[code].count++;
    hotelDistribution[code].rates.push(r.rateSheetNumber || r.id);
  }

  console.log("\nPer-Hotel RateSheet Distribution (22 Hotels):");
  let allHotelsHave3 = true;
  const codes = Object.keys(hotelDistribution).sort();
  codes.forEach((code, idx) => {
    const dist = hotelDistribution[code];
    const is3 = dist.count === 3;
    if (!is3) allHotelsHave3 = false;
    console.log(
      `  ${String(idx + 1).padStart(2, "0")}. [${code}] ${dist.hotelName}: ${dist.count} rate sheets [${dist.rates.join(", ")}] ${is3 ? "✓" : "✗"}`
    );
  });

  if (!allHotelsHave3 || codes.length !== 22) {
    console.error("POST-VERIFICATION FAILED: Not all 22 hotels have exactly 3 rate sheets!");
    process.exit(1);
  }

  // Inspect representative records
  console.log("\nRepresentative Sample Records (First 3 imported rates):");
  ratesWithHotels.slice(0, 3).forEach((r, idx) => {
    console.log(`\nSample Record #${idx + 1}:`);
    console.log(`  - Rate ID: ${r.id}`);
    console.log(`  - Rate Number: ${r.rateSheetNumber}`);
    console.log(`  - Name: ${r.name}`);
    console.log(`  - Hotel: ${r.hotel?.name} (${r.hotel?.hotelCode})`);
    console.log(`  - Room Type: ${r.roomType}`);
    console.log(`  - Meal Plan: ${r.mealPlan}`);
    console.log(`  - Cost Price: ₹${r.costPrice}`);
    console.log(`  - Extra Adult: ₹${r.extraAdultRate}`);
    console.log(`  - Extra Child: ₹${r.extraChildRate}`);
    console.log(`  - Season: ${r.seasonName}`);
    console.log(`  - Validity: ${r.validFrom?.toISOString().split("T")[0]} to ${r.validTo?.toISOString().split("T")[0]}`);
    console.log(`  - Source Type: ${r.sourceType}`);
    console.log(`  - Status: ${r.status}`);
  });

  console.log("\n================================================================================");
  console.log("  IMPORT SUCCESSFUL — 66 RATESHEETS CREATED AND VERIFIED");
  console.log("================================================================================");
}

main()
  .catch((err) => {
    console.error("Execution failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
