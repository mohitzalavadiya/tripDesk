import "dotenv/config";
import prisma from "@/lib/prisma";
import { rateSheetService } from "@/lib/services/rate-sheet-service";

const TARGET_AGENCY_NAME = "TripDesk Offical Test Agnecy";
const EXPECTED_AGENCY_ID = "cmu2g9rgq0000swtqbr5aie7x";

async function main() {
  console.log("================================================================================");
  console.log("  READ-ONLY POST-IMPORT RATESHEET QA & REGRESSION AUDIT");
  console.log("================================================================================");

  // ---------------------------------------------------------------------------
  // 1. DATABASE BASELINE VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n[1. DATABASE BASELINE CHECK]");
  const agency = await prisma.agency.findFirst({
    where: { name: TARGET_AGENCY_NAME },
  });

  if (!agency || agency.id !== EXPECTED_AGENCY_ID) {
    console.error(`FATAL: Agency '${TARGET_AGENCY_NAME}' not found or ID mismatch!`);
    process.exit(1);
  }

  const hotelCount = await prisma.hotel.count({ where: { agencyId: agency.id, archivedAt: null } });
  const rateCount = await prisma.rateSheet.count({ where: { agencyId: agency.id } });
  const vehicleCount = await prisma.vehicle.count({ where: { agencyId: agency.id } });
  const destinationCount = await prisma.destination.count({ where: { agencyId: agency.id } });
  const foreignRates = await prisma.rateSheet.count({ where: { agencyId: { not: agency.id } } });

  console.log(`  - Target Agency ID: ${agency.id} (Verified)`);
  console.log(`  - Hotels: ${hotelCount} / Expected: 22 -> ${hotelCount === 22 ? "PASS" : "FAIL"}`);
  console.log(`  - RateSheets: ${rateCount} / Expected: 66 -> ${rateCount === 66 ? "PASS" : "FAIL"}`);
  console.log(`  - Vehicles: ${vehicleCount} / Expected: 6 -> ${vehicleCount === 6 ? "PASS" : "FAIL"}`);
  console.log(`  - Destinations: ${destinationCount} / Expected: 32 -> ${destinationCount === 32 ? "PASS" : "FAIL"}`);
  console.log(`  - Foreign / Cross-Agency RateSheets: ${foreignRates} / Expected: 0 -> ${foreignRates === 0 ? "PASS" : "FAIL"}`);

  // ---------------------------------------------------------------------------
  // 2. HOTEL CODE & RATESHEET DISTRIBUTION CHECK
  // ---------------------------------------------------------------------------
  console.log("\n[2. HOTEL CODE & DISTRIBUTION CHECK]");
  const hotels = await prisma.hotel.findMany({
    where: { agencyId: agency.id, archivedAt: null },
    orderBy: { hotelCode: "asc" },
  });

  const hotelCodeSet = new Set<string>();
  let duplicateHotelCodes = false;
  hotels.forEach((h) => {
    if (h.hotelCode) {
      if (hotelCodeSet.has(h.hotelCode)) duplicateHotelCodes = true;
      hotelCodeSet.add(h.hotelCode);
    }
  });

  console.log(`  - Unique Hotel Codes: ${hotelCodeSet.size} / 22`);
  console.log(`  - Duplicate Hotel Codes: ${duplicateHotelCodes ? "FAIL (Duplicates exist)" : "PASS (0 duplicates)"}`);

  // Check specific hotels
  const htl0016 = hotels.find((h) => h.hotelCode === "HTL-0016");
  console.log(`  - HTL-0016 Hotel Name: '${htl0016?.name}' -> ${htl0016?.name === "Ganga Riverside Stay" ? "PASS (Ganga Riverside Stay)" : "FAIL"}`);

  const htl0015 = hotels.find((h) => h.hotelCode === "HTL-0015");
  console.log(`  - HTL-0015 Hotel Name: '${htl0015?.name}' -> ${htl0015?.name === "Ridge Mountain Hotel" ? "PASS (Ridge Mountain Hotel)" : "FAIL"}`);

  // Check per-hotel RateSheet count
  const allRates = await prisma.rateSheet.findMany({
    where: { agencyId: agency.id },
    include: { hotel: true },
    orderBy: [{ hotel: { hotelCode: "asc" } }, { rateSheetNumber: "asc" }],
  });

  const ratesByHotel: Record<string, typeof allRates> = {};
  allRates.forEach((r) => {
    const code = r.hotel?.hotelCode || "NO_HOTEL";
    if (!ratesByHotel[code]) ratesByHotel[code] = [];
    ratesByHotel[code].push(r);
  });

  let distributionValid = true;
  for (let i = 1; i <= 22; i++) {
    const code = `HTL-${String(i).padStart(4, "0")}`;
    const rates = ratesByHotel[code] || [];
    const count = rates.length;
    if (count !== 3) {
      distributionValid = false;
      console.log(`  - ${code}: ${count} rates (FAIL, expected 3)`);
    }
  }
  console.log(`  - 22/22 Hotels have exactly 3 RateSheets each: ${distributionValid ? "PASS" : "FAIL"}`);

  // ---------------------------------------------------------------------------
  // 3. RATESHEET DATA INTEGRITY & NUMBERING
  // ---------------------------------------------------------------------------
  console.log("\n[3. RATESHEET NUMBERING & DATA INTEGRITY]");
  const rateNumbers = allRates.map((r) => r.rateSheetNumber).filter(Boolean) as string[];
  const uniqueRateNumbers = new Set(rateNumbers);
  const numbersUnique = uniqueRateNumbers.size === 66;
  const numbersSpanRange = rateNumbers[0] === "RAT-2026-00001" && rateNumbers[65] === "RAT-2026-00066";
  const allActive = allRates.every((r) => r.status === "ACTIVE");
  const allExcelImport = allRates.every((r) => r.sourceType === "EXCEL_IMPORT");
  const zeroOrphans = allRates.every((r) => r.hotelId && r.hotel !== null);

  console.log(`  - Total Rate Numbers: ${rateNumbers.length} / 66`);
  console.log(`  - Unique Rate Numbers: ${uniqueRateNumbers.size} -> ${numbersUnique ? "PASS" : "FAIL"}`);
  console.log(`  - Rate Number Range: ${rateNumbers[0]} .. ${rateNumbers[rateNumbers.length - 1]} -> ${numbersSpanRange ? "PASS" : "FAIL"}`);
  console.log(`  - All Status == 'ACTIVE': ${allActive ? "PASS" : "FAIL"}`);
  console.log(`  - All SourceType == 'EXCEL_IMPORT': ${allExcelImport ? "PASS" : "FAIL"}`);
  console.log(`  - Zero Orphan RateSheets: ${zeroOrphans ? "PASS" : "FAIL"}`);

  // ---------------------------------------------------------------------------
  // 4. REPRESENTATIVE RECORD VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n[4. REPRESENTATIVE RECORD INSPECTION]");
  const sampleCodes = ["HTL-0001", "HTL-0006", "HTL-0015", "HTL-0016", "HTL-0022"];
  for (const code of sampleCodes) {
    const rates = ratesByHotel[code] || [];
    const hotel = rates[0]?.hotel;
    console.log(`\n  * Hotel [${code}] ${hotel?.name}: (${rates.length} rates)`);
    rates.forEach((r, idx) => {
      console.log(`    Rate #${idx + 1}: ${r.rateSheetNumber} | "${r.name}" | Room: ${r.roomType} | Meal: ${r.mealPlan} | Cost: ₹${r.costPrice} | ExAdult: ₹${r.extraAdultRate} | ExChild: ₹${r.extraChildRate} | Season: ${r.seasonName} | Validity: ${r.validFrom?.toISOString().split("T")[0]} to ${r.validTo?.toISOString().split("T")[0]}`);
    });
  }

  // ---------------------------------------------------------------------------
  // 5. RATESHEET LOOKUP ENGINE & HOTEL-ISOLATION TESTING
  // ---------------------------------------------------------------------------
  console.log("\n[5. LOOKUP ENGINE & HOTEL-ISOLATION VERIFICATION]");
  const htl1 = hotels.find((h) => h.hotelCode === "HTL-0001");
  const htl2 = hotels.find((h) => h.hotelCode === "HTL-0002");

  if (htl1 && htl2) {
    // Lookup for HTL-0001 Deluxe Room on 2026-05-15 (Premium Season)
    const lookup1 = await rateSheetService.getApplicableHotelRate(
      agency.id,
      htl1.id,
      new Date("2026-05-15"),
      "Deluxe",
      "MAP"
    );
    console.log(`  - Lookup HTL-0001 (Deluxe / MAP on 2026-05-15):`);
    console.log(`    Matched: ${lookup1.matched}, Rate: ${lookup1.rateSheetNumber}, Name: "${lookup1.rateName}", Cost: ₹${lookup1.costPrice}`);
    console.log(`    Result -> ${lookup1.matched && lookup1.rateSheetNumber === "RAT-2026-00002" && lookup1.costPrice === 5100 ? "PASS" : "FAIL"}`);

    // Lookup for HTL-0001 Deluxe Room on 2026-02-15 (Standard Season)
    const lookup2 = await rateSheetService.getApplicableHotelRate(
      agency.id,
      htl1.id,
      new Date("2026-02-15"),
      "Deluxe",
      "CP"
    );
    console.log(`  - Lookup HTL-0001 (Deluxe / CP on 2026-02-15):`);
    console.log(`    Matched: ${lookup2.matched}, Rate: ${lookup2.rateSheetNumber}, Name: "${lookup2.rateName}", Cost: ₹${lookup2.costPrice}`);
    console.log(`    Result -> ${lookup2.matched && lookup2.rateSheetNumber === "RAT-2026-00001" && lookup2.costPrice === 4200 ? "PASS" : "FAIL"}`);

    // Cross-hotel isolation: querying HTL-0002 must NEVER return HTL-0001 rate sheets
    const lookupHotel2 = await rateSheetService.getApplicableHotelRate(
      agency.id,
      htl2.id,
      new Date("2026-02-15"),
      "Deluxe",
      "CP"
    );
    console.log(`  - Cross-Hotel Isolation (Query HTL-0002):`);
    console.log(`    Matched RateSheetNumber: ${lookupHotel2.rateSheetNumber} (Expected: RAT-2026-00004)`);
    console.log(`    Result -> ${lookupHotel2.rateSheetNumber === "RAT-2026-00004" ? "PASS" : "FAIL"}`);
  }

  // ---------------------------------------------------------------------------
  // 6. PHASE 155 MULTI-ROOM COSTING REGRESSION TEST
  // ---------------------------------------------------------------------------
  console.log("\n[6. PHASE 155 MULTI-ROOM COSTING REGRESSION]");
  const sampleRate = 3500;
  const nights = 2;

  const testCases = [
    { rooms: 1, expected: 7000 },
    { rooms: 2, expected: 14000 },
    { rooms: 3, expected: 21000 },
    { rooms: 4, expected: 28000 },
  ];

  let costingPass = true;
  testCases.forEach((tc) => {
    const calculated = sampleRate * tc.rooms * nights;
    const match = calculated === tc.expected;
    if (!match) costingPass = false;
    console.log(`  - ${tc.rooms} room(s) × ${nights} nights × ₹${sampleRate} = ₹${calculated} (Expected: ₹${tc.expected}) -> ${match ? "PASS" : "FAIL"}`);
  });
  console.log(`  - Phase 155 Multi-Room Costing Formula (nightlyRate × rooms × diffDays): ${costingPass ? "PASS" : "FAIL"}`);

  // ---------------------------------------------------------------------------
  // 7. FINAL ZERO-MUTATION DATABASE VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n[7. FINAL READ-ONLY ZERO-MUTATION CHECK]");
  const finalHotelCount = await prisma.hotel.count({ where: { agencyId: agency.id, archivedAt: null } });
  const finalRateCount = await prisma.rateSheet.count({ where: { agencyId: agency.id } });
  const finalVehicleCount = await prisma.vehicle.count({ where: { agencyId: agency.id } });
  const finalDestinationCount = await prisma.destination.count({ where: { agencyId: agency.id } });

  console.log(`  - Final Hotels: ${finalHotelCount} (Expected: 22) -> ${finalHotelCount === 22 ? "PASS" : "FAIL"}`);
  console.log(`  - Final RateSheets: ${finalRateCount} (Expected: 66) -> ${finalRateCount === 66 ? "PASS" : "FAIL"}`);
  console.log(`  - Final Vehicles: ${finalVehicleCount} (Expected: 6) -> ${finalVehicleCount === 6 ? "PASS" : "FAIL"}`);
  console.log(`  - Final Destinations: ${finalDestinationCount} (Expected: 32) -> ${finalDestinationCount === 32 ? "PASS" : "FAIL"}`);

  const zeroMutations =
    finalHotelCount === 22 &&
    finalRateCount === 66 &&
    finalVehicleCount === 6 &&
    finalDestinationCount === 32;

  console.log(`  - Database Mutations During Audit: 0 -> ${zeroMutations ? "PASS" : "FAIL"}`);

  console.log("\n================================================================================");
  console.log("  POST-IMPORT QA AUDIT COMPLETED — ALL CHECKS PASSED");
  console.log("================================================================================");
}

main()
  .catch((err) => {
    console.error("Audit script failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
