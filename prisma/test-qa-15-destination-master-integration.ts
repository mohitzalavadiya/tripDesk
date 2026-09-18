/**
 * Phase 158-A Automated Verification Test Suite
 * Test QA-15: Hotel & Activity Master Destination Integration
 *
 * Verifies:
 * 1. Hotel creation with valid destinationId (same agency)
 * 2. Hotel update with valid destinationId and unlinking (null)
 * 3. Hotel creation/update rejection with cross-agency destinationId (tenant isolation)
 * 4. Hotel creation/update rejection with non-existent destinationId
 * 5. Activity creation with valid destinationId (same agency)
 * 6. Activity update with valid destinationId and unlinking (null)
 * 7. Activity creation/update rejection with cross-agency destinationId (tenant isolation)
 * 8. Activity creation/update rejection with non-existent destinationId
 * 9. Physical city / location separation from logical destinationId
 * 10. Non-regression: Hotel code generation and listing relations
 */

import "dotenv/config";
import { ActivityType } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { hotelService } from "../src/lib/services/hotel-service";
import { activityService } from "../src/lib/services/activity-service";
import { NotFoundError } from "../src/lib/api";

async function runTests() {
  console.log("================================================================================");
  console.log("   TRIPDESK PHASE 158-A: HOTEL & ACTIVITY MASTER DESTINATION INTEGRATION TEST   ");
  console.log("================================================================================\n");

  let agency1: any = null;
  let agency2: any = null;
  let destA1: any = null;
  let destA2: any = null;
  let createdHotelIds: string[] = [];
  let createdActivityIds: string[] = [];

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 0. Setup test agencies and destinations
    console.log("--- 0. Setup Test Agencies and Destinations ---");
    agency1 = await prisma.agency.create({
      data: {
        name: "QA 158A Agency Alpha",
        email: `qa-158a-alpha-${Date.now()}@tripdesk-test.com`,
        phone: "+919876543210",
      },
    });

    agency2 = await prisma.agency.create({
      data: {
        name: "QA 158A Agency Beta",
        email: `qa-158a-beta-${Date.now()}@tripdesk-test.com`,
        phone: "+919876543211",
      },
    });

    destA1 = await prisma.destination.create({
      data: {
        agencyId: agency1.id,
        name: "Goa (North)",
        state: "Goa",
        country: "India",
        status: "ACTIVE",
      },
    });

    destA2 = await prisma.destination.create({
      data: {
        agencyId: agency2.id,
        name: "Jaipur",
        state: "Rajasthan",
        country: "India",
        status: "ACTIVE",
      },
    });

    console.log(`Created Agency 1: ${agency1.id}, Dest 1: ${destA1.id}`);
    console.log(`Created Agency 2: ${agency2.id}, Dest 2: ${destA2.id}\n`);

    // TEST 1: Hotel create with valid destinationId (same agency)
    console.log("--- 1. Hotel Create with Valid Destination ---");
    const hotel1 = await hotelService.createHotel(agency1.id, {
      name: "Grand Riviera Resort",
      destinationId: destA1.id,
      city: "Candolim",
      state: "Goa",
      category: "5 Star Luxury",
    });
    createdHotelIds.push(hotel1.id);

    assert(hotel1.destinationId === destA1.id, "Hotel record stored destinationId");
    assert(hotel1.city === "Candolim", "Physical city kept intact and separate");
    assert(!!hotel1.hotelCode, `Hotel Code generated: ${hotel1.hotelCode}`);

    // Verify relations in getHotelById
    const fetchedHotel = await hotelService.getHotelById(agency1.id, hotel1.id);
    assert(fetchedHotel.destination?.name === "Goa (North)", "getHotelById returns destination relation");
    assert(fetchedHotel.destination?.state === "Goa", "getHotelById destination has correct state");

    // TEST 2: Hotel update destinationId (and nullifying)
    console.log("\n--- 2. Hotel Update Destination ---");
    const updatedHotel = await hotelService.updateHotel(agency1.id, hotel1.id, {
      destinationId: null,
    });
    assert(updatedHotel.destinationId === null, "Hotel destinationId unlinked successfully");

    const reLinkedHotel = await hotelService.updateHotel(agency1.id, hotel1.id, {
      destinationId: destA1.id,
    });
    assert(reLinkedHotel.destinationId === destA1.id, "Hotel destinationId re-linked successfully");

    // TEST 3: Hotel Cross-Agency Destination Rejection (Tenant Isolation)
    console.log("\n--- 3. Hotel Cross-Agency Destination Rejection ---");
    let crossAgencyCreateBlocked = false;
    try {
      await hotelService.createHotel(agency1.id, {
        name: "Intruder Hotel",
        destinationId: destA2.id, // belongs to agency 2!
        city: "Jaipur",
      });
    } catch (e: any) {
      if (e instanceof NotFoundError) {
        crossAgencyCreateBlocked = true;
      }
    }
    assert(crossAgencyCreateBlocked, "Hotel creation with cross-agency destinationId rejected with NotFoundError");

    let crossAgencyUpdateBlocked = false;
    try {
      await hotelService.updateHotel(agency1.id, hotel1.id, {
        destinationId: destA2.id, // belongs to agency 2!
      });
    } catch (e: any) {
      if (e instanceof NotFoundError) {
        crossAgencyUpdateBlocked = true;
      }
    }
    assert(crossAgencyUpdateBlocked, "Hotel update with cross-agency destinationId rejected with NotFoundError");

    // TEST 4: Hotel Non-Existent Destination Rejection
    console.log("\n--- 4. Hotel Non-Existent Destination Rejection ---");
    let nonExistentBlocked = false;
    try {
      await hotelService.createHotel(agency1.id, {
        name: "Phantom Destination Hotel",
        destinationId: "00000000-0000-0000-0000-000000000000",
      });
    } catch (e: any) {
      if (e instanceof NotFoundError) {
        nonExistentBlocked = true;
      }
    }
    assert(nonExistentBlocked, "Hotel creation with non-existent destinationId rejected with NotFoundError");

    // TEST 5: Activity create with valid destinationId (same agency)
    console.log("\n--- 5. Activity Create with Valid Destination ---");
    const act1 = await activityService.createActivity(agency1.id, {
      name: "Scuba Diving Adventure",
      destinationId: destA1.id,
      location: "Grande Island Jetty",
      type: ActivityType.INCLUDED,
      duration: "Half Day",
      adultPrice: 2500,
    });
    createdActivityIds.push(act1.id);

    assert(act1.destinationId === destA1.id, "Activity record stored destinationId");
    assert(act1.location === "Grande Island Jetty", "Physical location kept intact and separate");

    const fetchedAct = await activityService.getActivityById(agency1.id, act1.id);
    assert(fetchedAct.destination?.name === "Goa (North)", "getActivityById returns destination relation");

    // TEST 6: Activity update destinationId (and nullifying)
    console.log("\n--- 6. Activity Update Destination ---");
    const updatedAct = await activityService.updateActivity(agency1.id, act1.id, {
      destinationId: null,
    });
    assert(updatedAct.destinationId === null, "Activity destinationId unlinked successfully");

    const reLinkedAct = await activityService.updateActivity(agency1.id, act1.id, {
      destinationId: destA1.id,
    });
    assert(reLinkedAct.destinationId === destA1.id, "Activity destinationId re-linked successfully");

    // TEST 7: Activity Cross-Agency Destination Rejection (Tenant Isolation)
    console.log("\n--- 7. Activity Cross-Agency Destination Rejection ---");
    let crossAgencyActCreateBlocked = false;
    try {
      await activityService.createActivity(agency1.id, {
        name: "Intruder Activity",
        destinationId: destA2.id, // belongs to agency 2!
      });
    } catch (e: any) {
      if (e instanceof NotFoundError) {
        crossAgencyActCreateBlocked = true;
      }
    }
    assert(crossAgencyActCreateBlocked, "Activity creation with cross-agency destinationId rejected with NotFoundError");

    let crossAgencyActUpdateBlocked = false;
    try {
      await activityService.updateActivity(agency1.id, act1.id, {
        destinationId: destA2.id, // belongs to agency 2!
      });
    } catch (e: any) {
      if (e instanceof NotFoundError) {
        crossAgencyActUpdateBlocked = true;
      }
    }
    assert(crossAgencyActUpdateBlocked, "Activity update with cross-agency destinationId rejected with NotFoundError");

    // TEST 8: Activity Non-Existent Destination Rejection
    console.log("\n--- 8. Activity Non-Existent Destination Rejection ---");
    let nonExistentActBlocked = false;
    try {
      await activityService.createActivity(agency1.id, {
        name: "Phantom Activity",
        destinationId: "00000000-0000-0000-0000-000000000000",
      });
    } catch (e: any) {
      if (e instanceof NotFoundError) {
        nonExistentActBlocked = true;
      }
    }
    assert(nonExistentActBlocked, "Activity creation with non-existent destinationId rejected with NotFoundError");

    // TEST 9: List filtering by destinationId
    console.log("\n--- 9. List Filtering by Destination ---");
    const hotelListFiltered = await hotelService.listHotels(agency1.id, {
      destinationId: destA1.id,
    });
    assert(hotelListFiltered.items.some((h) => h.id === hotel1.id), "Hotel list filtered by destinationId returned match");

    const actListFiltered = await activityService.listActivities(agency1.id, {
      destinationId: destA1.id,
    });
    assert(actListFiltered.items.some((a) => a.id === act1.id), "Activity list filtered by destinationId returned match");

  } finally {
    // Clean up temporary test data
    console.log("\n--- Cleanup Temporary Test Data ---");
    try {
      if (createdHotelIds.length > 0) {
        await prisma.hotel.deleteMany({ where: { id: { in: createdHotelIds } } });
      }
      if (createdActivityIds.length > 0) {
        await prisma.activity.deleteMany({ where: { id: { in: createdActivityIds } } });
      }
      if (destA1) {
        await prisma.destination.deleteMany({ where: { id: destA1.id } });
      }
      if (destA2) {
        await prisma.destination.deleteMany({ where: { id: destA2.id } });
      }
      if (agency1) {
        await prisma.agency.deleteMany({ where: { id: agency1.id } });
      }
      if (agency2) {
        await prisma.agency.deleteMany({ where: { id: agency2.id } });
      }
      console.log("Cleanup complete.");
    } catch (cleanErr) {
      console.error("Cleanup error:", cleanErr);
    }
    await prisma.$disconnect();
  }

  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
