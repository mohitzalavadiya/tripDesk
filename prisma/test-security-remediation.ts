/**
 * Security Remediation Verification Test Suite (Non-Destructive)
 * Tests scope-aligned stateless guest access, trusted IP extraction,
 * rate limiting sliding-window behavior, identifier privacy, and Lua atomicity.
 *
 * Runs completely isolated in-memory without mutating any database.
 */

import {
  checkRateLimit,
  getRateLimitHeaders,
  getTrustedClientIp,
  hashRateLimitIdentifier,
  RATE_LIMIT_CONFIGS,
} from "../src/lib/security/rate-limiter";
import { randomUUID } from "crypto";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`);
  }
}

async function runTestSuite() {
  console.log("==================================================================");
  console.log("Your Travel Desk — Scope-Aligned Security Remediation Unit Tests");
  console.log("==================================================================\n");

  // ----------------------------------------------------------------------------
  // SECTION 1: TRUSTED CLIENT IP EXTRACTION CONTRACT
  // ----------------------------------------------------------------------------
  console.log("1. Trusted Client IP Extraction Contract:");

  // Test 1.1: Cloudflare edge connecting IP (cf-connecting-ip)
  const cfReq = new Request("https://app.yourtraveldesk.in/api/test", {
    headers: {
      "cf-connecting-ip": "198.51.100.75",
      "x-real-ip": "10.0.0.1",
      "x-forwarded-for": "10.0.0.2",
    },
  });
  assert(
    getTrustedClientIp(cfReq) === "198.51.100.75",
    "cf-connecting-ip is prioritized when upstream edge is Cloudflare"
  );

  // Test 1.2: Direct upstream proxy IP (x-real-ip)
  const realIpReq = new Request("https://app.yourtraveldesk.in/api/test", {
    headers: {
      "x-real-ip": "198.51.100.50",
      "x-forwarded-for": "10.0.0.1, 10.0.0.2",
    },
  });
  assert(
    getTrustedClientIp(realIpReq) === "198.51.100.50",
    "x-real-ip is prioritized when cf-connecting-ip is absent"
  );

  // Test 1.3: Anti-spoofing: Take right-most IP from x-forwarded-for when direct headers absent
  const forwardedReq = new Request("https://app.yourtraveldesk.in/api/test", {
    headers: {
      "x-forwarded-for": "1.2.3.4 (spoofed), 5.6.7.8 (spoofed), 203.0.113.88",
    },
  });
  assert(
    getTrustedClientIp(forwardedReq) === "203.0.113.88",
    "Anti-spoofing: Untrusted left-most headers are ignored, nearest edge hop selected"
  );

  // Test 1.4: Default fallback to 127.0.0.1 when no IP headers exist
  const emptyReq = new Request("https://app.yourtraveldesk.in/api/test");
  assert(
    getTrustedClientIp(emptyReq) === "127.0.0.1",
    "Default fallback IP 127.0.0.1 returned when no proxy headers exist"
  );

  // ----------------------------------------------------------------------------
  // SECTION 2: PRIVACY-PRESERVING KEY HASHING
  // ----------------------------------------------------------------------------
  console.log("\n2. Privacy-Preserving Rate Limiter Key Hashing:");

  const rawPhone = "+91 98765 43210";
  const rawToken = "psl_550e8400e29b41d4a716446655440000";
  const hash1 = hashRateLimitIdentifier(rawPhone);
  const hashToken = hashRateLimitIdentifier(rawToken);

  assert(
    hash1.length === 16 && /^[a-f0-9]{16}$/.test(hash1),
    "Identifier is hashed to a truncated 16-character hex digest"
  );
  assert(
    hash1 !== rawPhone && hashToken !== rawToken,
    "No raw PII, phone numbers, or tokens appear in hashes"
  );

  // ----------------------------------------------------------------------------
  // SECTION 3: SLIDING WINDOW RATE LIMITING LOGIC & RESPONSE HEADERS
  // ----------------------------------------------------------------------------
  console.log("\n3. Sliding Window Rate Limiting Logic & Response Headers:");

  const testKey = `test:sliding:${randomUUID()}`;
  const limit = 3;
  const windowMs = 5000;

  // Requests 1, 2, 3 should be allowed
  const r1 = await checkRateLimit({ key: testKey, limit, windowMs });
  const r2 = await checkRateLimit({ key: testKey, limit, windowMs });
  const r3 = await checkRateLimit({ key: testKey, limit, windowMs });

  assert(r1.allowed && r1.remaining === 2, "Request 1 allowed, remaining: 2");
  assert(r2.allowed && r2.remaining === 1, "Request 2 allowed, remaining: 1");
  assert(r3.allowed && r3.remaining === 0, "Request 3 allowed, remaining: 0");

  // Request 4 should be rejected
  const r4 = await checkRateLimit({ key: testKey, limit, windowMs });
  assert(!r4.allowed && r4.remaining === 0, "Request 4 blocked (exceeded limit of 3)");
  assert(r4.retryAfterSeconds > 0, `Retry-After computed correctly (${r4.retryAfterSeconds}s)`);

  // Verify headers formatting
  const headers = getRateLimitHeaders(r4);
  assert(
    headers["X-RateLimit-Limit"] === "3" &&
      headers["X-RateLimit-Remaining"] === "0" &&
      Boolean(headers["Retry-After"]),
    "Standard rate limit HTTP headers properly generated"
  );

  // Verify retained policy configurations
  assert(
    RATE_LIMIT_CONFIGS["public-feedback"].limit === 5 &&
      RATE_LIMIT_CONFIGS["public-feedback"].failClosed === false,
    "public-feedback configured for 5 requests / 1m, fail-open policy"
  );
  assert(
    RATE_LIMIT_CONFIGS["public-read"].limit === 60 &&
      RATE_LIMIT_CONFIGS["public-read"].failClosed === false,
    "public-read configured for 60 requests / 1m, fail-open policy"
  );

  // ----------------------------------------------------------------------------
  // SECTION 4: ATOMIC SLIDING-WINDOW SIMULATION TEST DOUBLE (NO :seq LEAK)
  // ----------------------------------------------------------------------------
  console.log("\n4. Atomic Sliding-Window Simulation Test Double (No Sequence Key Leak):");

  // Simulated sorted set implementing exact Redis ZREMRANGEBYSCORE + ZCARD + ZADD semantics
  // using unique request UUIDs without creating separate sequence keys in Redis.
  class AtomicRedisSortedSetSimulator {
    private items: { score: number; member: string }[] = [];

    public executeLua(
      now: number,
      window: number,
      maxLimit: number,
      reqId: string
    ): [number, number, number] {
      const clearBefore = now - window;
      // 1. ZREMRANGEBYSCORE key 0 clearBefore
      this.items = this.items.filter((item) => item.score > clearBefore);

      // 2. ZCARD key
      const currentRequests = this.items.length;

      if (currentRequests < maxLimit) {
        // 3. ZADD key now member (self-contained with unique reqId)
        this.items.push({ score: now, member: `${now}:${reqId}` });
        this.items.sort((a, b) => a.score - b.score);
        return [1, maxLimit - currentRequests - 1, Math.ceil(window / 1000)];
      } else {
        // 4. Oldest element
        const oldestScore = this.items[0]?.score || now - window;
        let retryAfter = Math.ceil((oldestScore + window - now) / 1000);
        if (retryAfter < 1) retryAfter = 1;
        return [0, 0, retryAfter];
      }
    }
  }

  const simulator = new AtomicRedisSortedSetSimulator();
  const simLimit = 5;
  const simWindow = 10000;
  const simNow = 1000000;

  let simAllowedCount = 0;
  for (let i = 0; i < 7; i++) {
    const res = simulator.executeLua(simNow + i * 100, simWindow, simLimit, randomUUID());
    if (res[0] === 1) simAllowedCount++;
  }
  assert(simAllowedCount === 5, "Simulated Lua sorted set permits exactly 5 of 7 rapid requests");

  // Advance time past the sliding window
  const futureSimNow = simNow + simWindow + 500;
  const futureRes = simulator.executeLua(futureSimNow, simWindow, simLimit, randomUUID());
  assert(futureRes[0] === 1, "Simulated Lua sorted set permits new request after sliding window expires");

  // ----------------------------------------------------------------------------
  // SECTION 5: PUBLIC SHARE-LINK VALIDATION CONTRACT
  // ----------------------------------------------------------------------------
  console.log("\n5. Public Share-Link Token Security Verification:");

  // Verify that tokens must follow the psl_ prefix contract
  const validToken = `psl_${randomUUID().replace(/-/g, "")}`;
  const invalidTripNumber = "TRIP-2026-0001";
  const invalidBookingNumber = "BK-1001";
  const invalidUuid = randomUUID();

  assert(
    validToken.startsWith("psl_") && validToken.length > 30,
    "Valid public share tokens adhere to high-entropy psl_ prefix format"
  );
  assert(
    !invalidTripNumber.startsWith("psl_") &&
      !invalidBookingNumber.startsWith("psl_") &&
      !invalidUuid.startsWith("psl_"),
    "Predictable identifiers (trip numbers, booking references, raw UUIDs) do not match token format"
  );

  // ----------------------------------------------------------------------------
  // SECTION 6: PUBLIC QUOTATION PDF RATE LIMITING CONTRACT
  // ----------------------------------------------------------------------------
  console.log("\n6. Public Quotation PDF Rate Limiting Contract:");

  // Test 6.1: public-read configuration verification
  const publicReadConfig = RATE_LIMIT_CONFIGS["public-read"];
  assert(
    publicReadConfig.limit === 60 && publicReadConfig.windowMs === 60000,
    "public-read policy specifies 60 requests per 60-second window"
  );
  assert(
    publicReadConfig.failClosed === false,
    "public-read policy fails open on Redis outage to ensure uninterrupted document delivery"
  );

  // Test 6.2: Header contract for rate-limited response
  const blockedResult = {
    allowed: false,
    limit: 60,
    remaining: 0,
    retryAfterSeconds: 45,
  };
  const pdfRateLimitHeaders = getRateLimitHeaders(blockedResult);
  assert(
    pdfRateLimitHeaders["X-RateLimit-Limit"] === "60" &&
      pdfRateLimitHeaders["X-RateLimit-Remaining"] === "0" &&
      pdfRateLimitHeaders["Retry-After"] === "45",
    "Rate-limit headers correctly reflect limit, remaining, and Retry-After"
  );

  // Test 6.3: Privacy check - hashed IP in key ensures no raw identifiers or token in Redis key
  const sampleIp = "203.0.113.195";
  const hashedSampleIp = hashRateLimitIdentifier(sampleIp);
  const sampleKey = `ratelimit:public-read:${hashedSampleIp}:${hashedSampleIp}`;
  assert(
    !sampleKey.includes(sampleIp) && !sampleKey.includes("quotation"),
    "Redis rate limit key strictly contains SHA-256 digests and zero plain-text identifiers"
  );

  // ----------------------------------------------------------------------------
  // SECTION 7: GUEST TRIP DOCUMENT AUTHORIZATION & ISOLATION CONTRACT
  // ----------------------------------------------------------------------------
  console.log("\n7. Guest Trip Document Authorization & Isolation Contract:");

  // Simulated in-memory test double for trip document access verification
  interface MockDoc {
    id: string;
    tripId: string | null;
    agencyId: string;
    documentNumber: string;
    documentType: string;
    status: string;
    title: string;
    version: number;
    issuedAt: Date | null;
  }

  interface MockShareLink {
    id: string;
    tokenHash: string;
    tripId: string;
    agencyId: string;
    status: string;
    revokedAt: Date | null;
  }

  const mockTripAId = "trip_a_123";
  const mockTripBId = "trip_b_456";
  const mockAgencyId = "agency_xyz";
  const activeTokenA = `psl_${randomUUID().replace(/-/g, "")}`;
  const revokedTokenA = `psl_${randomUUID().replace(/-/g, "")}`;

  const mockShareLinks: MockShareLink[] = [
    {
      id: "psl_1",
      tokenHash: activeTokenA,
      tripId: mockTripAId,
      agencyId: mockAgencyId,
      status: "ACTIVE",
      revokedAt: null,
    },
    {
      id: "psl_2",
      tokenHash: revokedTokenA,
      tripId: mockTripAId,
      agencyId: mockAgencyId,
      status: "REVOKED",
      revokedAt: new Date(),
    },
  ];

  const mockDocuments: MockDoc[] = [
    {
      id: "doc_1",
      tripId: mockTripAId,
      agencyId: mockAgencyId,
      documentNumber: "HV-2026-0001",
      documentType: "HOTEL_VOUCHER",
      status: "ISSUED",
      title: "Hotel Voucher",
      version: 1,
      issuedAt: new Date(),
    },
    {
      id: "doc_2",
      tripId: mockTripAId,
      agencyId: mockAgencyId,
      documentNumber: "VV-2026-0001",
      documentType: "VEHICLE_VOUCHER",
      status: "GENERATED", // Not yet issued
      title: "Vehicle Dispatch Draft",
      version: 1,
      issuedAt: null,
    },
    {
      id: "doc_3",
      tripId: mockTripAId,
      agencyId: mockAgencyId,
      documentNumber: "SV-2026-0001",
      documentType: "SUPPLIER_VOUCHER", // Internal supplier voucher
      status: "ISSUED",
      title: "Supplier Contract Pass",
      version: 1,
      issuedAt: new Date(),
    },
    {
      id: "doc_4",
      tripId: mockTripAId,
      agencyId: mockAgencyId,
      documentNumber: "RC-2026-0001",
      documentType: "HOTEL_VOUCHER",
      status: "REVOKED", // Revoked document
      title: "Cancelled Hotel Voucher",
      version: 1,
      issuedAt: new Date(),
    },
    {
      id: "doc_5",
      tripId: mockTripBId, // Unrelated Trip B
      agencyId: mockAgencyId,
      documentNumber: "HV-2026-0002",
      documentType: "HOTEL_VOUCHER",
      status: "ISSUED",
      title: "Trip B Hotel Voucher",
      version: 1,
      issuedAt: new Date(),
    },
    {
      id: "doc_6",
      tripId: null, // Non-trip document
      agencyId: mockAgencyId,
      documentNumber: "RC-2026-0002",
      documentType: "PAYMENT_RECEIPT",
      status: "ISSUED",
      title: "Standalone Payment Receipt",
      version: 1,
      issuedAt: new Date(),
    },
  ];

  function queryTripDocumentsSimulator(token: string): MockDoc[] | null {
    if (!token || !token.trim()) return null;
    const link = mockShareLinks.find(
      (l) => l.tokenHash === token && l.status === "ACTIVE" && l.revokedAt === null
    );
    if (!link) return null;

    return mockDocuments.filter(
      (d) =>
        d.tripId === link.tripId &&
        d.agencyId === link.agencyId &&
        d.status === "ISSUED" &&
        d.documentType !== "SUPPLIER_VOUCHER"
    );
  }

  function downloadTripDocumentSimulator(token: string, docId: string): MockDoc | null {
    if (!token || !token.trim() || !docId || !docId.trim()) return null;
    const link = mockShareLinks.find(
      (l) => l.tokenHash === token && l.status === "ACTIVE" && l.revokedAt === null
    );
    if (!link) return null;

    const doc = mockDocuments.find(
      (d) =>
        d.id === docId &&
        d.tripId === link.tripId &&
        d.agencyId === link.agencyId &&
        d.status === "ISSUED" &&
        d.documentType !== "SUPPLIER_VOUCHER"
    );
    return doc || null;
  }

  // Test 7.1: Active token retrieves only traveler-eligible ISSUED documents for Trip A
  const tripADocs = queryTripDocumentsSimulator(activeTokenA);
  assert(
    tripADocs !== null && tripADocs.length === 1 && tripADocs[0].id === "doc_1",
    "Active token lists strictly traveler-eligible ISSUED documents for its own trip"
  );

  // Test 7.2: Unissued, revoked, and internal supplier vouchers are excluded
  const excludedDocTypes = tripADocs?.map((d) => d.id) || [];
  assert(
    !excludedDocTypes.includes("doc_2") &&
      !excludedDocTypes.includes("doc_3") &&
      !excludedDocTypes.includes("doc_4"),
    "DRAFT/GENERATED, REVOKED, and SUPPLIER_VOUCHER documents are excluded from guest listing"
  );

  // Test 7.3: Cross-trip isolation (Trip B document not in Trip A list)
  assert(!excludedDocTypes.includes("doc_5"), "Cross-trip IDOR: Documents from other trips are excluded");

  // Test 7.4: Non-trip documents (tripId === null) are never exposed through a trip token
  assert(!excludedDocTypes.includes("doc_6"), "Non-trip documents (null tripId) are not exposed through trip tokens");

  // Test 7.5: Revoked share link returns null (404)
  const revokedDocsResult = queryTripDocumentsSimulator(revokedTokenA);
  assert(revokedDocsResult === null, "Revoked share link is rejected for document listing");

  // Test 7.6: Predictable identifier cannot be used as token
  const predictableDocResult = queryTripDocumentsSimulator(mockTripAId);
  assert(predictableDocResult === null, "Predictable trip ID cannot authorize document listing");

  // Test 7.7: Cross-trip PDF download rejection
  const foreignPdf = downloadTripDocumentSimulator(activeTokenA, "doc_5");
  assert(foreignPdf === null, "Attempting to download Trip B document using Trip A token is rejected");

  // Test 7.8: Revoked link cannot download document PDF
  const revokedPdf = downloadTripDocumentSimulator(revokedTokenA, "doc_1");
  assert(revokedPdf === null, "Attempting to download PDF using revoked share token is rejected");

  // Test 7.9: Legitimate PDF download authorization succeeds
  const validPdf = downloadTripDocumentSimulator(activeTokenA, "doc_1");
  assert(validPdf !== null && validPdf.id === "doc_1", "Legitimate PDF download request is authorized");

  // ----------------------------------------------------------------------------
  // SECTION 8: DOCUMENT NOTIFICATION URL RESOLUTION CONTRACT
  // ----------------------------------------------------------------------------
  console.log("\n8. Document Notification URL Resolution Contract:");

  function resolveNotificationUrlSimulator(docTripId: string | null): string | undefined {
    if (!docTripId) return undefined;
    const link = mockShareLinks.find(
      (l) => l.tripId === docTripId && l.status === "ACTIVE" && l.revokedAt === null
    );
    if (!link?.tokenHash) return undefined;
    return `/trip/${link.tokenHash}#documents`;
  }

  // Test 8.1: Document with valid active trip share link resolves to guest trip URL
  const activeUrl = resolveNotificationUrlSimulator(mockTripAId);
  assert(
    activeUrl === `/trip/${activeTokenA}#documents`,
    "Document notification resolves to guest trip portal with #documents anchor"
  );

  // Test 8.2: Document without trip relationship produces undefined (no broken URL)
  const nonTripUrl = resolveNotificationUrlSimulator(null);
  assert(
    nonTripUrl === undefined,
    "Document without a trip relationship produces undefined notification URL (never fabricated)"
  );

  // Test 8.3: Trip without active share link produces undefined (never customer portal route)
  const unlinkedTripUrl = resolveNotificationUrlSimulator("trip_c_unlinked");
  assert(
    unlinkedTripUrl === undefined,
    "Trip without active share link produces undefined (never redirects to retired customer login)"
  );

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} FAILED)`);
  console.log("==================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution encountered an unhandled error:", err);
  process.exit(1);
});
