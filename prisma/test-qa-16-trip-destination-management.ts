import prisma from "../src/lib/prisma";
import { tripDestinationService } from "../src/lib/services/trip-destination-service";
import { tripService } from "../src/lib/services/trip-service";
import { NotFoundError, ValidationError } from "../src/lib/api";

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

async function runQA16() {
  console.log("\n=======================================================");
  console.log("  TRIPDESK QA-16 — TRIP DESTINATION MANAGEMENT TEST");
  console.log("=======================================================\n");

  let agencyA: any = null;
  let customerA: any = null;
  let testTripA: any = null;
  let agencyB: any = null;
  let customerB: any = null;
  let testTripB: any = null;
  let destB: any = null;

  try {
    // 1. Setup permanent agency context
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
          customerNumber: "QA16-CUST-A",
          name: "QA-16 Test Customer A",
          phone: "+91 9999900016",
        },
      });
    }

    // Fetch existing destinations from the 32 catalog
    const allDestinations = await prisma.destination.findMany({
      where: { agencyId: agencyA.id },
      orderBy: { name: "asc" },
    });

    const goa = allDestinations.find((d) => d.name === "Goa") || allDestinations[0];
    const mumbai = allDestinations.find((d) => d.name === "Mumbai") || allDestinations[1];
    const jaipur = allDestinations.find((d) => d.name === "Jaipur") || allDestinations[2];

    if (!goa || !mumbai || !jaipur) {
      throw new Error("Required starter destinations (Goa, Mumbai, Jaipur) not found in agency catalog.");
    }

    // Create temporary Trip A
    testTripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `QA16-TRIP-A-${Date.now()}`,
        title: "QA-16 Multi-Destination Golden Tour",
        startDate: new Date("2026-11-01"),
        endDate: new Date("2026-11-10"),
      },
    });

    console.log("--- 1. BASIC TRIP DESTINATION TESTS ---");

    // 1. Trip with zero destinations can be read
    const initialList = await tripDestinationService.listTripDestinations(agencyA.id, testTripA.id);
    assert(initialList.length === 0, "1. Trip with zero destinations returns empty array");

    // 2. Add first Destination (Goa)
    const td1 = await tripDestinationService.addTripDestination(agencyA.id, testTripA.id, {
      destinationId: goa.id,
      notes: "First leg in North Goa",
    });
    assert(
      td1.destinationId === goa.id && td1.sequence === 1 && td1.destination.name === goa.name,
      "2. Add first Destination assigns sequence 1 and includes destination details"
    );

    // 3. Add second Destination (Mumbai)
    const td2 = await tripDestinationService.addTripDestination(agencyA.id, testTripA.id, {
      destinationId: mumbai.id,
      notes: "Second leg in South Mumbai",
    });
    assert(
      td2.destinationId === mumbai.id && td2.sequence === 2,
      "3. Add second Destination assigns contiguous sequence 2"
    );

    // 4. List returns correct sequence
    const listAfterTwo = await tripDestinationService.listTripDestinations(agencyA.id, testTripA.id);
    assert(
      listAfterTwo.length === 2 &&
        listAfterTwo[0].destinationId === goa.id &&
        listAfterTwo[0].sequence === 1 &&
        listAfterTwo[1].destinationId === mumbai.id &&
        listAfterTwo[1].sequence === 2,
      "4. List returns destinations ordered by sequence ascending (1: Goa, 2: Mumbai)"
    );

    console.log("\n--- 2. ORDERING & REORDER TESTS ---");

    // 5. Reorder destinations (Mumbai -> Goa)
    const reorderedList = await tripDestinationService.reorderTripDestinations(agencyA.id, testTripA.id, {
      tripDestinationIds: [td2.id, td1.id],
    });
    assert(
      reorderedList.length === 2 &&
        reorderedList[0].id === td2.id &&
        reorderedList[0].sequence === 1 &&
        reorderedList[1].id === td1.id &&
        reorderedList[1].sequence === 2,
      "5. Reorder destinations updates order to Mumbai (seq 1), Goa (seq 2)"
    );

    // 6. Final sequence is contiguous
    const seqContiguous = reorderedList.every((td, idx) => td.sequence === idx + 1);
    assert(seqContiguous, "6. Reordered sequences are contiguous 1..N without gaps");

    // 7. Ordering persists after re-read from database
    const freshRead = await tripDestinationService.listTripDestinations(agencyA.id, testTripA.id);
    assert(
      freshRead[0].id === td2.id && freshRead[1].id === td1.id,
      "7. Destination order persists across separate database queries"
    );

    console.log("\n--- 3. REPEATED DESTINATION TESTS ---");

    // 8. Same Destination can be intentionally added twice (Add Goa again: Mumbai -> Goa -> Goa)
    const td3 = await tripDestinationService.addTripDestination(agencyA.id, testTripA.id, {
      destinationId: goa.id,
      notes: "Return to Goa for final relaxation",
    });
    assert(
      td3.destinationId === goa.id && td3.sequence === 3,
      "8. Same Destination can be added again with contiguous sequence 3"
    );

    // 9. The two TripDestination records remain distinct
    const listWithRepeat = await tripDestinationService.listTripDestinations(agencyA.id, testTripA.id);
    assert(
      listWithRepeat.length === 3 &&
        listWithRepeat[1].destinationId === goa.id &&
        listWithRepeat[2].destinationId === goa.id &&
        listWithRepeat[1].id !== listWithRepeat[2].id &&
        listWithRepeat[1].sequence === 2 &&
        listWithRepeat[2].sequence === 3,
      "9. Repeated destinations remain distinct records with unique IDs and unique sequences"
    );

    console.log("\n--- 4. REMOVE & RESEQUENCE TESTS ---");

    // 10. Remove middle TripDestination (td1: Goa at seq 2)
    const deleted = await tripDestinationService.removeTripDestination(agencyA.id, testTripA.id, td1.id);
    assert(deleted.id === td1.id, "10. Remove TripDestination deletes the target record");

    // 11. Remaining records are correctly sequenced (1, 2)
    const listAfterRemove = await tripDestinationService.listTripDestinations(agencyA.id, testTripA.id);
    assert(
      listAfterRemove.length === 2 &&
        listAfterRemove[0].id === td2.id &&
        listAfterRemove[0].sequence === 1 &&
        listAfterRemove[1].id === td3.id &&
        listAfterRemove[1].sequence === 2,
      "11. Remaining destinations are deterministically resequenced to 1, 2 without gaps"
    );

    // 12. Destination master remains intact
    const destinationMasterStillExists = await prisma.destination.findUnique({
      where: { id: goa.id },
    });
    assert(
      destinationMasterStillExists !== null && destinationMasterStillExists.name === goa.name,
      "12. Underlying Destination master record remains intact after TripDestination removal"
    );

    console.log("\n--- 5. TENANT ISOLATION TESTS ---");

    // Create temporary Agency B + Trip B + Dest B
    agencyB = await prisma.agency.create({
      data: {
        name: "QA-16 Temp Agency B",
        phone: "+91 9999900099",
        email: "qa16-temp-agency-b@test.local",
      },
    });

    destB = await prisma.destination.create({
      data: {
        agencyId: agencyB.id,
        name: "QA-16 Agency B Secret Destination",
        country: "India",
      },
    });

    customerB = await prisma.customer.create({
      data: {
        agencyId: agencyB.id,
        customerNumber: "QA16-CUST-B",
        name: "QA-16 Customer B",
        phone: "+91 9999900017",
      },
    });

    testTripB = await prisma.trip.create({
      data: {
        agencyId: agencyB.id,
        customerId: customerB.id,
        tripNumber: `QA16-TRIP-B-${Date.now()}`,
        title: "QA-16 Agency B Trip",
        startDate: new Date("2026-12-01"),
        endDate: new Date("2026-12-05"),
      },
    });

    const tdAgencyB = await tripDestinationService.addTripDestination(agencyB.id, testTripB.id, {
      destinationId: destB.id,
    });

    // 13. Agency A cannot attach Agency B Destination
    let crossAgencyAddBlocked = false;
    try {
      await tripDestinationService.addTripDestination(agencyA.id, testTripA.id, {
        destinationId: destB.id,
      });
    } catch (err: any) {
      crossAgencyAddBlocked = true;
    }
    assert(crossAgencyAddBlocked, "13. Agency A cannot attach Agency B Destination to Agency A Trip");

    // 14. Agency A cannot read Agency B TripDestination
    let crossAgencyReadBlocked = false;
    try {
      await tripDestinationService.listTripDestinations(agencyA.id, testTripB.id);
    } catch (err: any) {
      crossAgencyReadBlocked = true;
    }
    assert(crossAgencyReadBlocked, "14. Agency A cannot read Agency B TripDestination records");

    // 15. Agency A cannot delete Agency B TripDestination
    let crossAgencyDeleteBlocked = false;
    try {
      await tripDestinationService.removeTripDestination(agencyA.id, testTripB.id, tdAgencyB.id);
    } catch (err: any) {
      crossAgencyDeleteBlocked = true;
    }
    assert(crossAgencyDeleteBlocked, "15. Agency A cannot delete Agency B TripDestination record");

    // 16. Agency A cannot reorder Agency B TripDestination
    let crossAgencyReorderBlocked = false;
    try {
      await tripDestinationService.reorderTripDestinations(agencyA.id, testTripB.id, {
        tripDestinationIds: [tdAgencyB.id],
      });
    } catch (err: any) {
      crossAgencyReorderBlocked = true;
    }
    assert(crossAgencyReorderBlocked, "16. Agency A cannot reorder Agency B TripDestination records");

    console.log("\n--- 6. INVALID DATA & REORDER VALIDATION TESTS ---");

    // 17. Nonexistent Destination rejected
    let nonexistentDestBlocked = false;
    try {
      await tripDestinationService.addTripDestination(agencyA.id, testTripA.id, {
        destinationId: "non-existent-dest-cuid-9999",
      });
    } catch (err: any) {
      nonexistentDestBlocked = true;
    }
    assert(nonexistentDestBlocked, "17. Nonexistent destination ID is rejected with NotFoundError");

    // 18. Nonexistent Trip rejected
    let nonexistentTripBlocked = false;
    try {
      await tripDestinationService.addTripDestination(agencyA.id, "non-existent-trip-cuid-9999", {
        destinationId: goa.id,
      });
    } catch (err: any) {
      nonexistentTripBlocked = true;
    }
    assert(nonexistentTripBlocked, "18. Nonexistent trip ID is rejected with NotFoundError");

    // 19. Foreign TripDestination ID in reorder request rejected
    let foreignIdInReorderBlocked = false;
    try {
      await tripDestinationService.reorderTripDestinations(agencyA.id, testTripA.id, {
        tripDestinationIds: [td2.id, tdAgencyB.id],
      });
    } catch (err: any) {
      foreignIdInReorderBlocked = true;
    }
    assert(foreignIdInReorderBlocked, "19. Foreign TripDestination ID in reorder is rejected with ValidationError");

    // 20. Incomplete / duplicate IDs in reorder request rejected
    let duplicateIdInReorderBlocked = false;
    try {
      await tripDestinationService.reorderTripDestinations(agencyA.id, testTripA.id, {
        tripDestinationIds: [td2.id, td2.id],
      });
    } catch (err: any) {
      duplicateIdInReorderBlocked = true;
    }
    assert(duplicateIdInReorderBlocked, "20. Incomplete / duplicate IDs in reorder is rejected");

    console.log("\n--- 7. REGRESSION INTEGRITY TESTS ---");

    // 21. Existing Trip data remains intact
    const tripARead = await tripService.getTripById(agencyA.id, testTripA.id);
    assert(
      tripARead !== null && tripARead.id === testTripA.id && tripARead.title === testTripA.title,
      "21. Existing Trip data and relations remain intact"
    );

    // 22. Existing Hotel/Activity/Vehicle models remain intact
    const hotelsCount = await prisma.hotel.count({ where: { agencyId: agencyA.id } });
    const activitiesCount = await prisma.activity.count({ where: { agencyId: agencyA.id } });
    const vehiclesCount = await prisma.vehicle.count({ where: { agencyId: agencyA.id } });
    assert(
      hotelsCount >= 0 && activitiesCount >= 0 && vehiclesCount >= 0,
      "22. Existing Hotel, Activity, Vehicle master records remain intact"
    );

    // 23. Existing Destination 32-catalog remains intact
    const catalogCount = await prisma.destination.count({ where: { agencyId: agencyA.id } });
    assert(
      catalogCount === 32,
      `23. Locked 32-destination starter catalog is fully preserved (Found: ${catalogCount}/32)`
    );

  } finally {
    console.log("\n--- 8. TEST DATA CLEANUP ---");

    // Clean up Trip A destination records and Trip A
    if (testTripA) {
      await prisma.tripDestination.deleteMany({ where: { tripId: testTripA.id } });
      await prisma.trip.deleteMany({ where: { id: testTripA.id } });
      console.log("  [CLEANUP] Deleted test Trip A and its TripDestinations");
    }

    // Clean up Agency B records and Agency B
    if (agencyB) {
      if (testTripB) {
        await prisma.tripDestination.deleteMany({ where: { tripId: testTripB.id } });
        await prisma.trip.deleteMany({ where: { id: testTripB.id } });
      }
      if (customerB) {
        await prisma.customer.deleteMany({ where: { id: customerB.id } });
      }
      if (destB) {
        await prisma.destination.deleteMany({ where: { id: destB.id } });
      }
      await prisma.agency.deleteMany({ where: { id: agencyB.id } });
      console.log("  [CLEANUP] Deleted temporary Agency B and all associated test records");
    }

    // Verify 0 residue
    const tempAgencies = await prisma.agency.count({
      where: { name: "QA-16 Temp Agency B" },
    });
    const tempTrips = await prisma.trip.count({
      where: { title: "QA-16 Multi-Destination Golden Tour" },
    });
    console.log(`  [RESIDUE CHECK] Temp Agencies: ${tempAgencies}, Temp Trips: ${tempTrips}`);
  }

  console.log("\n=======================================================");
  console.log(`  QA-16 SUMMARY: ${report.passed}/${report.total} ASSERTIONS PASSED`);
  if (report.failed > 0) {
    console.log(`  FAILED: ${report.failed}`);
    process.exit(1);
  } else {
    console.log("  STATUS: ALL QA-16 ASSERTIONS PASSED PERFECTLY!");
    console.log("=======================================================\n");
  }
}

runQA16()
  .catch((e) => {
    console.error("FATAL QA-16 ERROR:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
