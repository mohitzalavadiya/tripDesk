/**
 * TRIPDESK QA-14 — DESTINATION FOUNDATION & STARTER SEED REGRESSION TEST SUITE
 *
 * Verifies:
 * 1. Destination model schema & tenant scoping.
 * 2. Exact 32 starter destinations seeding with correct states & country.
 * 3. Seed idempotency (running seed multiple times does not duplicate).
 * 4. Agency-scoped uniqueness (same name in same agency rejected; same name in different agency allowed).
 * 5. ACTIVE / INACTIVE lifecycle & filtering.
 * 6. TripDestination model with sequence ordering & repeated destination support (e.g. Goa -> Mumbai -> Goa).
 * 7. Hotel & Activity destinationId linkage foundation.
 * 8. TripHotel & TripActivity tripDestinationId linkage foundation.
 * 9. Deletion safety protection (blocks delete when referenced by Hotel/Activity/TripDestination).
 * 10. Multi-tenant isolation & IDOR boundary verification.
 */

import "dotenv/config";
import prisma from "../src/lib/prisma";
import { destinationService } from "../src/lib/services/destination-service";
import { tripCostingService } from "../src/lib/services/trip-costing-service";
import { DestinationStatus } from "@prisma/client";

interface ExpectedStarterDestination {
  name: string;
  state: string;
  country: string;
}

/**
 * INDEPENDENT HARD-CODED EXPECTED CATALOG (EXACT 32 DESTINATIONS)
 * QA-14 DOES NOT IMPORT STARTER_DESTINATIONS FROM PRODUCTION CODE TO ENSURE INDEPENDENT VALIDATION.
 */
const INDEPENDENT_EXPECTED_32_DESTINATIONS: ExpectedStarterDestination[] = [
  { name: "Goa", state: "Goa", country: "India" },
  { name: "Mumbai", state: "Maharashtra", country: "India" },
  { name: "Mahabaleshwar", state: "Maharashtra", country: "India" },
  { name: "Pune", state: "Maharashtra", country: "India" },
  { name: "Jaipur", state: "Rajasthan", country: "India" },
  { name: "Udaipur", state: "Rajasthan", country: "India" },
  { name: "Jodhpur", state: "Rajasthan", country: "India" },
  { name: "Jaisalmer", state: "Rajasthan", country: "India" },
  { name: "Mount Abu", state: "Rajasthan", country: "India" },
  { name: "Delhi", state: "Delhi", country: "India" },
  { name: "Agra", state: "Uttar Pradesh", country: "India" },
  { name: "Varanasi", state: "Uttar Pradesh", country: "India" },
  { name: "Lucknow", state: "Uttar Pradesh", country: "India" },
  { name: "Amritsar", state: "Punjab", country: "India" },
  { name: "Srinagar", state: "Jammu & Kashmir", country: "India" },
  { name: "Gulmarg", state: "Jammu & Kashmir", country: "India" },
  { name: "Pahalgam", state: "Jammu & Kashmir", country: "India" },
  { name: "Manali", state: "Himachal Pradesh", country: "India" },
  { name: "Shimla", state: "Himachal Pradesh", country: "India" },
  { name: "Dharamshala", state: "Himachal Pradesh", country: "India" },
  { name: "Leh", state: "Ladakh", country: "India" },
  { name: "Rishikesh", state: "Uttarakhand", country: "India" },
  { name: "Nainital", state: "Uttarakhand", country: "India" },
  { name: "Kochi", state: "Kerala", country: "India" },
  { name: "Munnar", state: "Kerala", country: "India" },
  { name: "Alappuzha", state: "Kerala", country: "India" },
  { name: "Bengaluru", state: "Karnataka", country: "India" },
  { name: "Mysuru", state: "Karnataka", country: "India" },
  { name: "Hampi", state: "Karnataka", country: "India" },
  { name: "Chennai", state: "Tamil Nadu", country: "India" },
  { name: "Ahmedabad", state: "Gujarat", country: "India" },
  { name: "Dwarka", state: "Gujarat", country: "India" },
];

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function runDestinationFoundationTests() {
  console.log("══════════════════════════════════════════════════════════════════════════════");
  console.log("🚀 STARTING QA-14 DESTINATION FOUNDATION & STARTER SEED TEST SUITE");
  console.log("══════════════════════════════════════════════════════════════════════════════\n");

  const agency1Id = "qa14-dest-agency-1";
  const agency2Id = "qa14-dest-agency-2";

  // Cleanup past test data if any
  async function cleanup() {
    for (const aId of [agency1Id, agency2Id]) {
      const trips = await prisma.trip.findMany({ where: { agencyId: aId } });
      for (const t of trips) {
        await prisma.tripHotel.deleteMany({ where: { tripId: t.id } });
        await prisma.tripActivity.deleteMany({ where: { tripId: t.id } });
        await prisma.tripVehicle.deleteMany({ where: { tripId: t.id } });
        await prisma.tripDestination.deleteMany({ where: { tripId: t.id } });
      }
      await prisma.trip.deleteMany({ where: { agencyId: aId } });
      await prisma.hotel.deleteMany({ where: { agencyId: aId } });
      await prisma.activity.deleteMany({ where: { agencyId: aId } });
      await prisma.destination.deleteMany({ where: { agencyId: aId } });
      await prisma.customer.deleteMany({ where: { agencyId: aId } });
      await prisma.agency.deleteMany({ where: { id: aId } });
    }
  }

  await cleanup();

  // 1. Create 2 isolated test agencies
  const agency1 = await prisma.agency.create({
    data: {
      id: agency1Id,
      name: "QA 14 Wanderlust Travels",
      email: "qa14-wanderlust@tripdesk.internal",
      phone: "+919800000014",
      status: "ACTIVE",
    },
  });

  const agency2 = await prisma.agency.create({
    data: {
      id: agency2Id,
      name: "QA 14 Royal Voyages",
      email: "qa14-royal@tripdesk.internal",
      phone: "+919800000015",
      status: "ACTIVE",
    },
  });

  // ─── TEST SECTION 1: STARTER SEEDING (INDEPENDENT EXACT 32 DESTINATIONS) ───
  console.log("--- 1. Testing Starter Destination Seeding (Independent Locked 32 Catalog) ---");

  assert(
    INDEPENDENT_EXPECTED_32_DESTINATIONS.length === 32,
    "Independent expected starter catalog contains exactly 32 destinations"
  );

  const seededCount = await destinationService.seedStarterDestinations(agency1.id);
  assert(seededCount === 32, `Seeded exactly 32 starter destinations on initial run (got ${seededCount})`);

  const agency1Destinations = await prisma.destination.findMany({
    where: { agencyId: agency1.id },
    orderBy: { name: "asc" },
  });

  assert(agency1Destinations.length === 32, "Agency 1 has exactly 32 destination records in database");

  // A. Validate 1-to-1 matching with independent expected catalog
  const dbDestMap = new Map(agency1Destinations.map((d) => [d.name.toLowerCase(), d]));

  let allExpectedMatch = true;
  for (const expected of INDEPENDENT_EXPECTED_32_DESTINATIONS) {
    const dbRecord = dbDestMap.get(expected.name.toLowerCase());
    if (!dbRecord) {
      assert(false, `Expected destination "${expected.name}" exists in database`, "NOT FOUND");
      allExpectedMatch = false;
      continue;
    }
    if (dbRecord.state !== expected.state) {
      assert(false, `Destination "${expected.name}" state matches "${expected.state}"`, `Got "${dbRecord.state}"`);
      allExpectedMatch = false;
    }
    if (dbRecord.country !== expected.country) {
      assert(false, `Destination "${expected.name}" country matches "${expected.country}"`, `Got "${dbRecord.country}"`);
      allExpectedMatch = false;
    }
    if (dbRecord.status !== DestinationStatus.ACTIVE) {
      assert(false, `Destination "${expected.name}" status is ACTIVE`, `Got "${dbRecord.status}"`);
      allExpectedMatch = false;
    }
  }
  if (allExpectedMatch) {
    assert(true, "All 32 independent expected destinations exist in database with matching name, state, country, and ACTIVE status");
  }

  // B. Ensure NO unexpected destinations exist
  const expectedNameSet = new Set(INDEPENDENT_EXPECTED_32_DESTINATIONS.map((d) => d.name.toLowerCase()));
  const unexpectedDests = agency1Destinations.filter((d) => !expectedNameSet.has(d.name.toLowerCase()));
  assert(unexpectedDests.length === 0, `No unexpected destinations seeded (got ${unexpectedDests.length} unexpected)`);

  // C. Explicitly check that historical mistake destinations DO NOT exist
  const HISTORICAL_WRONG_DESTINATIONS = [
    "Haridwar",
    "Mussoorie",
    "Corbett",
    "Coorg",
    "Thekkady",
    "Wayanad",
    "Ooty",
    "Kodaikanal",
    "Darjeeling",
    "Gangtok",
    "Alleppey",
    "Mysore",
  ];

  let noHistoricalMistakes = true;
  for (const wrongName of HISTORICAL_WRONG_DESTINATIONS) {
    if (dbDestMap.has(wrongName.toLowerCase())) {
      assert(false, `Historical mistaken destination "${wrongName}" is absent`, "FOUND IN DATABASE");
      noHistoricalMistakes = false;
    }
  }
  if (noHistoricalMistakes) {
    assert(
      true,
      "All historical mistake destinations (Haridwar, Mussoorie, Corbett, Coorg, Thekkady, Wayanad, Ooty, Kodaikanal, Darjeeling, Gangtok, Alleppey, Mysore) are absent"
    );
  }

  // D. Explicitly check locked specific names
  const LOCKED_VERIFIED_NAMES = [
    { name: "Mahabaleshwar", state: "Maharashtra" },
    { name: "Pune", state: "Maharashtra" },
    { name: "Mount Abu", state: "Rajasthan" },
    { name: "Lucknow", state: "Uttar Pradesh" },
    { name: "Amritsar", state: "Punjab" },
    { name: "Leh", state: "Ladakh" },
    { name: "Alappuzha", state: "Kerala" },
    { name: "Mysuru", state: "Karnataka" },
    { name: "Chennai", state: "Tamil Nadu" },
    { name: "Ahmedabad", state: "Gujarat" },
    { name: "Dwarka", state: "Gujarat" },
  ];

  let allLockedNamesVerified = true;
  for (const locked of LOCKED_VERIFIED_NAMES) {
    const rec = dbDestMap.get(locked.name.toLowerCase());
    if (!rec || rec.state !== locked.state) {
      allLockedNamesVerified = false;
      assert(false, `Locked destination "${locked.name}" (${locked.state}) is verified`);
    }
  }
  if (allLockedNamesVerified) {
    assert(
      true,
      "All locked specific names (Mahabaleshwar, Pune, Mount Abu, Lucknow, Amritsar, Leh, Alappuzha, Mysuru, Chennai, Ahmedabad, Dwarka) are verified"
    );
  }

  // ─── TEST SECTION 2: SEED IDEMPOTENCY ───
  console.log("\n--- 2. Testing Seed Idempotency ---");

  const repeatSeededCount = await destinationService.seedStarterDestinations(agency1.id);
  assert(repeatSeededCount === 0, `Re-running seed on same agency creates 0 new rows (got ${repeatSeededCount})`);

  const countAfterRepeat = await prisma.destination.count({ where: { agencyId: agency1.id } });
  assert(countAfterRepeat === 32, "Total destinations remain exactly 32 after second seed execution");

  // ─── TEST SECTION 3: AGENCY-SCOPED UNIQUENESS ───
  console.log("\n--- 3. Testing Agency-Scoped Uniqueness ---");

  // Attempting duplicate name in Agency 1 must throw ConflictError
  let duplicateThrew = false;
  try {
    await destinationService.createDestination(agency1.id, {
      name: "Goa", // Already exists in Agency 1
      state: "Goa",
    });
  } catch (err: any) {
    duplicateThrew = true;
  }
  assert(duplicateThrew, "Creating duplicate destination name within same agency is rejected with ConflictError");

  // Creating same name in Agency 2 must SUCCEED (tenant scoped)
  const agency2Goa = await destinationService.createDestination(agency2.id, {
    name: "Goa",
    state: "Goa",
  });
  assert(agency2Goa !== null && agency2Goa.agencyId === agency2.id, "Same destination name in a different agency is allowed");

  // ─── TEST SECTION 4: CRUD & ACTIVE / INACTIVE LIFECYCLE ───
  console.log("\n--- 4. Testing CRUD & Lifecycle Management ---");

  // Create custom destination
  const customDest = await destinationService.createDestination(agency1.id, {
    name: "Dubai",
    country: "United Arab Emirates",
    state: "Dubai",
    cityArea: "Downtown",
  });
  assert(customDest.name === "Dubai" && customDest.country === "United Arab Emirates", "Custom destination created successfully");

  // Update custom destination
  const updatedDest = await destinationService.updateDestination(agency1.id, customDest.id, {
    cityArea: "Marina & Palm",
  });
  assert(updatedDest.cityArea === "Marina & Palm", "Destination updated successfully");

  // Deactivate destination
  const deactivatedDest = await destinationService.deactivateDestination(agency1.id, customDest.id);
  assert(deactivatedDest.status === "INACTIVE", "Destination deactivated (status = INACTIVE)");

  // Query filtering
  const activeOnlyList = await destinationService.listDestinations(agency1.id, { page: 1, limit: 100, status: "ACTIVE" });
  assert(!activeOnlyList.items.some((d) => d.id === customDest.id), "ACTIVE query excludes deactivated destination");

  const inactiveOnlyList = await destinationService.listDestinations(agency1.id, { page: 1, limit: 100, status: "INACTIVE" });
  assert(inactiveOnlyList.items.some((d) => d.id === customDest.id), "INACTIVE query returns deactivated destination");

  const allList = await destinationService.listDestinations(agency1.id, { page: 1, limit: 100, status: "ALL" });
  assert(allList.items.some((d) => d.id === customDest.id) && allList.total === 33, "ALL query returns both active and inactive destinations (32 starter + 1 custom)");

  // ─── TEST SECTION 5: TRIP DESTINATION MODEL & MULTI-DESTINATION ORDERING ───
  console.log("\n--- 5. Testing Multi-Destination Trip & Sequence Ordering ---");

  const customer = await prisma.customer.create({
    data: {
      agencyId: agency1.id,
      name: "QA 14 Traveler",
      phone: "+919876543214",
      email: "traveler14@test.internal",
    },
  });

  const trip = await prisma.trip.create({
    data: {
      agencyId: agency1.id,
      customerId: customer.id,
      tripNumber: "TRIP-QA14-001",
      title: "Golden Triangle & Goa Tour",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-10"),
      status: "PLANNING",
    },
  });

  const destDelhi = agency1Destinations.find((d) => d.name === "Delhi")!;
  const destAgra = agency1Destinations.find((d) => d.name === "Agra")!;
  const destGoa = agency1Destinations.find((d) => d.name === "Goa")!;

  // Create ordered TripDestination records: 1. Delhi, 2. Agra, 3. Delhi (Repeated destination test!)
  const leg1 = await prisma.tripDestination.create({
    data: {
      tripId: trip.id,
      destinationId: destDelhi.id,
      sequence: 1,
      notes: "Arrive in Delhi",
    },
  });

  const leg2 = await prisma.tripDestination.create({
    data: {
      tripId: trip.id,
      destinationId: destAgra.id,
      sequence: 2,
      notes: "Taj Mahal visit",
    },
  });

  const leg3 = await prisma.tripDestination.create({
    data: {
      tripId: trip.id,
      destinationId: destDelhi.id, // REPEATED DESTINATION ALLOWED
      sequence: 3,
      notes: "Return transit in Delhi",
    },
  });

  const tripDestList = await prisma.tripDestination.findMany({
    where: { tripId: trip.id },
    orderBy: { sequence: "asc" },
    include: { destination: true },
  });

  assert(tripDestList.length === 3, "Trip has 3 configured destination legs");
  assert(tripDestList[0].destination.name === "Delhi" && tripDestList[0].sequence === 1, "Leg 1 is Delhi (Seq 1)");
  assert(tripDestList[1].destination.name === "Agra" && tripDestList[1].sequence === 2, "Leg 2 is Agra (Seq 2)");
  assert(tripDestList[2].destination.name === "Delhi" && tripDestList[2].sequence === 3, "Leg 3 is Delhi (Seq 3, repeated destination supported)");

  // Attempt duplicate sequence (sequence 1 again on same trip)
  let duplicateSeqThrew = false;
  try {
    await prisma.tripDestination.create({
      data: {
        tripId: trip.id,
        destinationId: destGoa.id,
        sequence: 1, // Duplicate sequence!
      },
    });
  } catch (err: any) {
    duplicateSeqThrew = true;
  }
  assert(duplicateSeqThrew, "Duplicate sequence number on same trip is rejected by unique constraint");

  // ─── TEST SECTION 6: HOTEL & ACTIVITY LINKAGE FOUNDATION ───
  console.log("\n--- 6. Testing Hotel & Activity Destination Linkage ---");

  const hotelInGoa = await prisma.hotel.create({
    data: {
      agencyId: agency1.id,
      destinationId: destGoa.id,
      name: "Goa Beachfront Resort",
      city: "Calangute",
      state: "Goa",
    },
  });

  assert(hotelInGoa.destinationId === destGoa.id, "Hotel created with destinationId link");

  const activityInAgra = await prisma.activity.create({
    data: {
      agencyId: agency1.id,
      destinationId: destAgra.id,
      name: "Sunrise Taj Guided Tour",
      location: "East Gate",
      adultPrice: 1500,
    },
  });

  assert(activityInAgra.destinationId === destAgra.id, "Activity created with destinationId link");

  // ─── TEST SECTION 7: TRIP HOTEL & TRIP ACTIVITY TRIPDESTINATION LINKAGE ───
  console.log("\n--- 7. Testing TripHotel & TripActivity tripDestinationId Linkage ---");

  const tripHotel = await prisma.tripHotel.create({
    data: {
      tripId: trip.id,
      tripDestinationId: leg1.id,
      hotelId: hotelInGoa.id,
      checkIn: new Date("2026-10-01"),
      checkOut: new Date("2026-10-03"),
      roomType: "Deluxe Suite",
      rooms: 2,
      nightlyRate: 4000,
      totalAmount: 16000,
    },
  });

  assert(tripHotel.tripDestinationId === leg1.id, "TripHotel created with tripDestinationId linked to Leg 1");

  const tripActivity = await prisma.tripActivity.create({
    data: {
      tripId: trip.id,
      tripDestinationId: leg2.id,
      activityId: activityInAgra.id,
      name: "Sunrise Taj Guided Tour",
      date: new Date("2026-10-04"),
      numberOfParticipants: 2,
      adultPrice: 1500,
      totalPrice: 3000,
    },
  });

  assert(tripActivity.tripDestinationId === leg2.id, "TripActivity created with tripDestinationId linked to Leg 2");

  // ─── TEST SECTION 8: DELETION SAFETY PROTECTION ───
  console.log("\n--- 8. Testing Deletion Safety Protection ---");

  // Attempting to delete destAgra (referenced by Activity & TripDestination) must be BLOCKED
  let deleteAgraBlocked = false;
  try {
    await destinationService.deleteDestination(agency1.id, destAgra.id);
  } catch (err: any) {
    deleteAgraBlocked = true;
  }
  assert(deleteAgraBlocked, "Deleting Destination referenced by Activity/TripDestination is safely blocked");

  // Attempting to delete destGoa (referenced by Hotel) must be BLOCKED
  let deleteGoaBlocked = false;
  try {
    await destinationService.deleteDestination(agency1.id, destGoa.id);
  } catch (err: any) {
    deleteGoaBlocked = true;
  }
  assert(deleteGoaBlocked, "Deleting Destination referenced by Hotel is safely blocked");

  // Deleting unreferenced destination (customDest) must SUCCEED
  const deletedCustom = await destinationService.deleteDestination(agency1.id, customDest.id);
  assert(deletedCustom.id === customDest.id, "Deleting unreferenced Destination succeeds cleanly");

  // ─── TEST SECTION 9: TENANCY & ISOLATION ───
  console.log("\n--- 9. Testing Cross-Agency Security Boundaries ---");

  let crossAgencyReadNull = false;
  const crossRead = await destinationService.getDestinationById(agency1.id, agency2Goa.id);
  if (crossRead === null) {
    crossAgencyReadNull = true;
  }
  assert(crossAgencyReadNull, "Agency 1 cannot read Agency 2's destination by ID (returns null)");

  let crossAgencyDeleteBlocked = false;
  try {
    await destinationService.deleteDestination(agency1.id, agency2Goa.id);
  } catch (err: any) {
    crossAgencyDeleteBlocked = true;
  }
  assert(crossAgencyDeleteBlocked, "Agency 1 cannot delete Agency 2's destination (NotFoundError thrown)");

  // ─── TEST SECTION 10: COSTING ENGINE REGRESSION ───
  console.log("\n--- 10. Testing Trip Costing Regression Safety ---");

  const costing = await tripCostingService.calculateTripCosting(agency1.id, trip.id);
  assert(costing !== null, "Trip costing calculates cleanly on trip with destinations");
  assert(costing?.hotelsTotal === 16000, `Hotels total matches expected ₹16,000 (got ₹${costing?.hotelsTotal})`);
  assert(costing?.activitiesTotal === 3000, `Activities total matches expected ₹3,000 (got ₹${costing?.activitiesTotal})`);
  assert(costing?.subtotal === 19000, `Subtotal matches expected ₹19,000 (got ₹${costing?.subtotal})`);

  // Final Cleanup of QA-14 data
  await cleanup();

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log(`🏁 QA-14 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("══════════════════════════════════════════════════════════════\n");

  if (failed > 0) {
    throw new Error(`QA-14 test suite failed with ${failed} failure(s).`);
  }
}

runDestinationFoundationTests()
  .catch((err) => {
    console.error("QA-14 test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
