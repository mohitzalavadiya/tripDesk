import "dotenv/config";

// Mock server-only for standalone audit test script execution
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as any;
} catch {}

import { prisma } from "../src/lib/prisma";
import { getAuthenticatedCustomer, requireCustomerAuth } from "../src/lib/auth/customer-auth";
import { customerPortalService } from "../src/lib/services/customer-portal-service";

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

// Helper to construct a mock NextRequest / Request
function createMockRequest(options: {
  headers?: Record<string, string>;
  cookie?: string;
  url?: string;
}): Request {
  const headers = new Headers();
  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      headers.set(key, value);
    }
  }
  if (options.cookie) {
    headers.set("cookie", `tripdesk_customer_session=${encodeURIComponent(options.cookie)}`);
  }
  return new Request(options.url || "http://localhost:3001/api/customer/test", {
    method: "GET",
    headers,
  });
}

async function runDisc02SecurityRegressionTests() {
  console.log("\n=======================================================");
  console.log("   TRIPDESK DISC-02 CUSTOMER AUTH SECURITY REGRESSION");
  console.log("=======================================================\n");

  const timestamp = Date.now();
  const agencyAId = `test-sec-agy-a-${timestamp}`;
  const agencyBId = `test-sec-agy-b-${timestamp}`;
  const customerAId = `test-sec-cust-a-${timestamp}`;
  const customerBId = `test-sec-cust-b-${timestamp}`;
  const tripAId = `test-sec-trip-a-${timestamp}`;
  const tripBId = `test-sec-trip-b-${timestamp}`;
  const shareTokenA = `psl_test_token_a_${timestamp}`;

  try {
    // ═══════════════════════════════════════════════════════════════════
    // Fixture Setup (Isolated ephemeral fixtures)
    // ═══════════════════════════════════════════════════════════════════
    console.log("--- 0. Provisioning Ephemeral Test Fixtures ---");

    await prisma.agency.createMany({
      data: [
        {
          id: agencyAId,
          name: "Security Test Agency A",
          email: `sec_agy_a_${timestamp}@test.tripdesk.io`,
          phone: "+919811111111",
          status: "ACTIVE",
        },
        {
          id: agencyBId,
          name: "Security Test Agency B",
          email: `sec_agy_b_${timestamp}@test.tripdesk.io`,
          phone: "+919822222222",
          status: "ACTIVE",
        },
      ],
    });

    await prisma.customer.createMany({
      data: [
        {
          id: customerAId,
          agencyId: agencyAId,
          customerNumber: `CUST-A-${timestamp}`,
          name: "Alice Traveler",
          email: "alice@test.local",
          phone: "+919876543210",
        },
        {
          id: customerBId,
          agencyId: agencyBId,
          customerNumber: `CUST-B-${timestamp}`,
          name: "Bob Traveler",
          email: "bob@test.local",
          phone: "+919876543211",
        },
      ],
    });

    await prisma.trip.createMany({
      data: [
        {
          id: tripAId,
          agencyId: agencyAId,
          customerId: customerAId,
          tripNumber: `TRIP-A-${timestamp}`,
          title: "Himalayan Expedition",
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000 * 5),
        },
        {
          id: tripBId,
          agencyId: agencyBId,
          customerId: customerBId,
          tripNumber: `TRIP-B-${timestamp}`,
          title: "Goa Beach Retreat",
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000 * 4),
        },
      ],
    });

    await prisma.publicShareLink.create({
      data: {
        agencyId: agencyAId,
        tripId: tripAId,
        tokenHash: shareTokenA,
        status: "ACTIVE",
      },
    });

    console.log("  ✔ Fixtures created successfully\n");

    // ═══════════════════════════════════════════════════════════════════
    // TEST 1: Unauthenticated x-customer-id & x-agency-id Headers Rejected
    // ═══════════════════════════════════════════════════════════════════
    console.log("--- TEST 1: Unauthenticated Header-Based Identity Rejected ---");

    const reqWithHeadersOnly = createMockRequest({
      headers: {
        "x-customer-id": customerAId,
        "x-agency-id": agencyAId,
      },
    });

    const authResult1 = await getAuthenticatedCustomer(reqWithHeadersOnly);
    assert(authResult1 === null, "Supplying valid-looking x-customer-id & x-agency-id headers without session returns null (REJECTED)");

    let guardFailed = false;
    try {
      await requireCustomerAuth(reqWithHeadersOnly);
    } catch {
      guardFailed = true;
    }
    assert(guardFailed, "requireCustomerAuth throws CUSTOMER_UNAUTHORIZED when only headers are provided");

    // ═══════════════════════════════════════════════════════════════════
    // TEST 2: Forged Headers Cannot Override Cookie Session
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 2: Forged Headers Cannot Override Valid Cookie ---");

    const sessionCookieA = JSON.stringify({ customerId: customerAId, agencyId: agencyAId });
    const reqWithCookieAndForgedHeaders = createMockRequest({
      cookie: sessionCookieA,
      headers: {
        "x-customer-id": customerBId, // Attacker tries to impersonate Bob
        "x-agency-id": agencyBId,
      },
    });

    const authResult2 = await getAuthenticatedCustomer(reqWithCookieAndForgedHeaders);
    assert(authResult2 !== null && authResult2.customerId === customerAId, "Identity resolved from valid cookie (Alice), completely ignoring forged headers (Bob)");
    assert(authResult2?.authMethod === "COOKIE", "Auth method is strictly 'COOKIE'");

    // ═══════════════════════════════════════════════════════════════════
    // TEST 3: Valid Customer Session Cookie Authenticates Correctly
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 3: Valid Customer Session Authenticates Properly ---");

    const reqValidCookie = createMockRequest({ cookie: sessionCookieA });
    const authResult3 = await getAuthenticatedCustomer(reqValidCookie);
    assert(authResult3 !== null, "Valid customer session cookie is accepted");
    assert(authResult3?.customerId === customerAId, "Resolved customerId matches session payload");
    assert(authResult3?.agencyId === agencyAId, "Resolved agencyId matches session payload");
    assert(authResult3?.name === "Alice Traveler", "Customer profile name loaded correctly");
    assert(authResult3?.authMethod === "COOKIE", "Auth method is confirmed 'COOKIE'");

    // ═══════════════════════════════════════════════════════════════════
    // TEST 4: Malformed, Tampered, or Incomplete Sessions Rejected
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 4: Invalid, Tampered & Malformed Sessions Rejected ---");

    const reqMalformed = createMockRequest({ cookie: "{ invalid_json: true " });
    const authResult4a = await getAuthenticatedCustomer(reqMalformed);
    assert(authResult4a === null, "Malformed JSON session cookie safely rejected");

    const reqIncomplete = createMockRequest({ cookie: JSON.stringify({ customerId: customerAId }) });
    const authResult4b = await getAuthenticatedCustomer(reqIncomplete);
    assert(authResult4b === null, "Session cookie missing agencyId safely rejected");

    const reqNonExistent = createMockRequest({ cookie: JSON.stringify({ customerId: "non-existent-id", agencyId: agencyAId }) });
    const authResult4c = await getAuthenticatedCustomer(reqNonExistent);
    assert(authResult4c === null, "Session cookie referencing non-existent customer safely rejected");

    // ═══════════════════════════════════════════════════════════════════
    // TEST 5: Customer Resource Isolation Across Route IDs
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 5: Customer Resource Isolation (No Cross-Customer IDOR) ---");

    const tripForAlice = await customerPortalService.getCustomerTripDetail(customerAId, agencyAId, tripAId);
    assert(tripForAlice !== null && tripForAlice.id === tripAId, "Alice can access her own trip detail");

    const crossTrip = await customerPortalService.getCustomerTripDetail(customerAId, agencyAId, tripBId);
    assert(crossTrip === null, "Alice cannot access Bob's trip (returns null / 404)");

    // ═══════════════════════════════════════════════════════════════════
    // TEST 6: Tenant Isolation Across Agency Boundaries
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 6: Multi-Tenant Agency Isolation Intact ---");

    const crossAgencyCookie = JSON.stringify({ customerId: customerAId, agencyId: agencyBId });
    const reqCrossAgency = createMockRequest({ cookie: crossAgencyCookie });
    const authResult6 = await getAuthenticatedCustomer(reqCrossAgency);
    assert(authResult6 === null, "Customer A claiming Agency B membership in session is rejected (database tenant mismatch)");

    // ═══════════════════════════════════════════════════════════════════
    // TEST 7: Valid Public Share Token Scoped Strictly to Associated Trip
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 7: Public Share Token Scoped Strictly to Its Trip ---");

    const reqValidToken = createMockRequest({
      headers: { "x-customer-token": shareTokenA },
    });

    const tokenTripA = await getAuthenticatedCustomer(reqValidToken, { tripId: tripAId });
    assert(tokenTripA !== null, "Share token for Trip A is accepted when requesting Trip A");
    assert(tokenTripA?.authMethod === "SECURE_TOKEN", "Auth method is confirmed 'SECURE_TOKEN'");
    assert(tokenTripA?.tokenTripId === tripAId, "tokenTripId matches requested Trip A");

    const tokenTripB = await getAuthenticatedCustomer(reqValidToken, { tripId: tripBId });
    assert(tokenTripB === null, "Share token for Trip A is REJECTED when attempting to access Trip B");

    // ═══════════════════════════════════════════════════════════════════
    // TEST 8: Share Token Cannot Grant Account-Level Privileges
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 8: Share Token Denied for Account-Wide Privileges ---");

    const tokenAccountAccess = await getAuthenticatedCustomer(reqValidToken, { requireAccountSession: true });
    assert(tokenAccountAccess === null, "Share token rejected when full account session is required (profile/bookings/notifications)");

    const tokenUnscopedAccess = await getAuthenticatedCustomer(reqValidToken);
    assert(tokenUnscopedAccess === null, "Share token rejected for unscoped / default customer requests (fail-closed)");

    // ═══════════════════════════════════════════════════════════════════
    // TEST 9: Arbitrary Booking Number Cannot Masquerade as Token
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 9: Plain Booking Reference Rejected as Token ---");

    const reqBookingAsToken = createMockRequest({
      headers: { "x-customer-token": `TRIP-A-${timestamp}` },
    });
    const authResult9 = await getAuthenticatedCustomer(reqBookingAsToken, { tripId: tripAId });
    assert(authResult9 === null, "Plain booking reference in token header is safely rejected without valid PublicShareLink hash");

    // ═══════════════════════════════════════════════════════════════════
    // TEST 10: Legitimate Portal Access Gateway Flow Preserved
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- TEST 10: Portal Access Gateway with Contact Verification ---");

    const portalAccess = await customerPortalService.lookupCustomerAccess(
      shareTokenA,
      "+919876543210"
    );
    assert(portalAccess !== null, "lookupCustomerAccess succeeds with shareToken + verified phone number");
    assert(portalAccess?.customerId === customerAId, "Authorized access correctly resolves customerId for cookie issuance");
    assert(portalAccess?.agencyId === agencyAId, "Authorized access correctly resolves agencyId for cookie issuance");

    const portalAccessWrongPhone = await customerPortalService.lookupCustomerAccess(
      shareTokenA,
      "+910000000000"
    );
    assert(portalAccessWrongPhone === null, "lookupCustomerAccess fails when phone number does not match customer");

  } catch (err) {
    console.error("Test execution failed with unhandled error:", err);
    failed++;
  } finally {
    // ═══════════════════════════════════════════════════════════════════
    // Cleanup Fixtures
    // ═══════════════════════════════════════════════════════════════════
    console.log("\n--- Cleaning Up Ephemeral Test Fixtures ---");
    try {
      await prisma.publicShareLink.deleteMany({ where: { tokenHash: shareTokenA } });
      await prisma.trip.deleteMany({ where: { id: { in: [tripAId, tripBId] } } });
      await prisma.customer.deleteMany({ where: { id: { in: [customerAId, customerBId] } } });
      await prisma.agency.deleteMany({ where: { id: { in: [agencyAId, agencyBId] } } });
      console.log("  ✔ All test fixtures cleaned up safely.\n");
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr);
    }
    await prisma.$disconnect();
  }

  console.log("=======================================================");
  console.log(`   TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runDisc02SecurityRegressionTests();
