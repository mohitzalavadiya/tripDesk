import "dotenv/config";
import prisma from "@/lib/prisma";

const TARGET_RATE_ID = "cmu5f9ili0000v4tqrrixq0ih";
const EXPECTED_AGENCY_NAME = "TripDesk Offical Test Agnecy";

async function main() {
  console.log("================================================================================");
  console.log("  AUTHORIZED SINGLE-RECORD RATESHEET DELETION & DB VERIFICATION");
  console.log("================================================================================");

  // ---------------------------------------------------------------------------
  // STEP 1: READ-ONLY PRE-DELETION VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n[STEP 1] Performing pre-deletion verification for ID:", TARGET_RATE_ID);

  const rate = await prisma.rateSheet.findUnique({
    where: { id: TARGET_RATE_ID },
    include: {
      agency: { select: { id: true, name: true } },
      hotel: { select: { id: true, hotelCode: true, name: true } },
    },
  });

  if (!rate) {
    console.error(`STOP: Target RateSheet ID '${TARGET_RATE_ID}' was not found in database!`);
    process.exit(1);
  }

  console.log("Found RateSheet record:");
  console.log("  - ID:", rate.id);
  console.log("  - RateSheet Number:", rate.rateSheetNumber);
  console.log("  - Name:", rate.name);
  console.log("  - Inventory Type:", rate.inventoryType);
  console.log("  - Hotel ID:", rate.hotelId);
  console.log("  - Hotel Name:", rate.hotel?.name);
  console.log("  - Hotel Code:", rate.hotel?.hotelCode);
  console.log("  - Room Type:", rate.roomType);
  console.log("  - Meal Plan:", rate.mealPlan);
  console.log("  - Cost Price:", rate.costPrice?.toString());
  console.log("  - Extra Adult Rate:", rate.extraAdultRate?.toString());
  console.log("  - Extra Child Rate:", rate.extraChildRate?.toString());
  console.log("  - Season Name:", rate.seasonName);
  console.log("  - Valid From:", rate.validFrom?.toISOString());
  console.log("  - Valid To:", rate.validTo?.toISOString());
  console.log("  - Status:", rate.status);
  console.log("  - Source Type:", rate.sourceType);
  console.log("  - Agency ID:", rate.agencyId);
  console.log("  - Agency Name:", rate.agency?.name);

  // Strict field-by-field verification
  const mismatches: string[] = [];

  if (rate.id !== TARGET_RATE_ID) mismatches.push(`ID mismatch: expected ${TARGET_RATE_ID}, got ${rate.id}`);
  if (rate.rateSheetNumber !== "RAT-2026-00001") mismatches.push(`RateSheet number mismatch: expected 'RAT-2026-00001', got '${rate.rateSheetNumber}'`);
  if (rate.name !== "Amber Courtyard - Deluxe Room (Peak Season 2026-27)") mismatches.push(`Name mismatch: got '${rate.name}'`);
  if (rate.hotel?.name !== "Amber Courtyard") mismatches.push(`Hotel Name mismatch: got '${rate.hotel?.name}'`);
  if (rate.hotel?.hotelCode !== "HTL-0006") mismatches.push(`Hotel Code mismatch: got '${rate.hotel?.hotelCode}'`);
  if (rate.roomType !== "Deluxe Room") mismatches.push(`Room Type mismatch: got '${rate.roomType}'`);
  if (rate.mealPlan !== "CP") mismatches.push(`Meal Plan mismatch: got '${rate.mealPlan}'`);
  if (rate.costPrice?.toString() !== "4500") mismatches.push(`Cost Price mismatch: expected '4500', got '${rate.costPrice?.toString()}'`);
  if (rate.extraAdultRate?.toString() !== "1500") mismatches.push(`Extra Adult mismatch: expected '1500', got '${rate.extraAdultRate?.toString()}'`);
  if (rate.extraChildRate?.toString() !== "800") mismatches.push(`Extra Child mismatch: expected '800', got '${rate.extraChildRate?.toString()}'`);
  if (rate.seasonName !== "Peak Season 2026-27") mismatches.push(`Season Name mismatch: got '${rate.seasonName}'`);
  if (!rate.validFrom?.toISOString().startsWith("2026-09-01")) mismatches.push(`Valid From mismatch: got '${rate.validFrom?.toISOString()}'`);
  if (!rate.validTo?.toISOString().startsWith("2027-03-31")) mismatches.push(`Valid To mismatch: got '${rate.validTo?.toISOString()}'`);
  if (rate.status !== "ACTIVE") mismatches.push(`Status mismatch: got '${rate.status}'`);
  if (rate.sourceType !== "MANUAL") mismatches.push(`Source Type mismatch: got '${rate.sourceType}'`);
  if (rate.agency?.name !== EXPECTED_AGENCY_NAME) mismatches.push(`Agency mismatch: got '${rate.agency?.name}'`);

  if (mismatches.length > 0) {
    console.error("\nSTOP: Record identity validation failed with discrepancies:");
    mismatches.forEach((m) => console.error("  -", m));
    process.exit(1);
  }

  console.log("\n>>> PRE-DELETION VERIFICATION: 100% MATCHED <<<");

  // ---------------------------------------------------------------------------
  // STEP 2: DELETE EXACTLY ONE RECORD
  // ---------------------------------------------------------------------------
  console.log("\n[STEP 2] Executing targeted deletion of record ID:", TARGET_RATE_ID);

  const deletedRecord = await prisma.rateSheet.delete({
    where: { id: TARGET_RATE_ID },
  });

  console.log("Successfully deleted RateSheet record:");
  console.log("  - Deleted ID:", deletedRecord.id);
  console.log("  - Deleted Number:", deletedRecord.rateSheetNumber);

  // ---------------------------------------------------------------------------
  // STEP 3: IMMEDIATE POST-DELETION VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n[STEP 3] Performing post-deletion verification...");

  // 1. Verify target record is gone
  const verifyDeleted = await prisma.rateSheet.findUnique({
    where: { id: TARGET_RATE_ID },
  });

  if (verifyDeleted !== null) {
    console.error("FATAL: Deleted record still exists in database!");
    process.exit(1);
  }
  console.log("  [PASS] Target record ID no longer exists (findUnique returned null).");

  // 2. Verify agency inventory integrity
  const agencyId = rate.agencyId;
  const hotelCount = await prisma.hotel.count({ where: { agencyId, archivedAt: null } });
  const hotelRateCount = await prisma.rateSheet.count({ where: { agencyId, inventoryType: "HOTEL", archivedAt: null } });
  const totalRateCount = await prisma.rateSheet.count({ where: { agencyId } });
  const vehicleCount = await prisma.vehicle.count({ where: { agencyId } });
  const destinationCount = await prisma.destination.count({ where: { agencyId } });

  console.log("\nPost-deletion counts for", EXPECTED_AGENCY_NAME, ":");
  console.log("  - Hotels:", hotelCount, "(expected 22)");
  console.log("  - Hotel RateSheets:", hotelRateCount, "(expected 0)");
  console.log("  - Total RateSheets:", totalRateCount, "(expected 0)");
  console.log("  - Vehicles:", vehicleCount, "(expected 6)");
  console.log("  - Destinations:", destinationCount, "(expected 32)");

  if (hotelCount !== 22) {
    console.error(`FATAL: Unexpected hotel count! Expected 22, got ${hotelCount}`);
    process.exit(1);
  }
  if (hotelRateCount !== 0) {
    console.error(`FATAL: Unexpected hotel rate count! Expected 0, got ${hotelRateCount}`);
    process.exit(1);
  }
  if (vehicleCount !== 6) {
    console.error(`FATAL: Unexpected vehicle count! Expected 6, got ${vehicleCount}`);
    process.exit(1);
  }
  if (destinationCount !== 32) {
    console.error(`FATAL: Unexpected destination count! Expected 32, got ${destinationCount}`);
    process.exit(1);
  }

  // 3. Verify specific hotel 'Amber Courtyard' (HTL-0006) remains intact
  const amberCourtyard = await prisma.hotel.findFirst({
    where: { agencyId, hotelCode: "HTL-0006", name: "Amber Courtyard" },
  });

  if (!amberCourtyard) {
    console.error("FATAL: Hotel 'Amber Courtyard' (HTL-0006) was affected!");
    process.exit(1);
  }
  console.log("  [PASS] Hotel 'Amber Courtyard' (HTL-0006) remains intact with ID:", amberCourtyard.id);

  console.log("\n================================================================================");
  console.log("  DELETION & POST-VERIFICATION COMPLETE — ALL INVARIANTS SATISFIED");
  console.log("================================================================================");
}

main()
  .catch((err) => {
    console.error("Execution failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
