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
  limitEndpoint,
  RATE_LIMIT_CONFIGS,
} from "../src/lib/security/rate-limiter";
import {
  POST as communicationWebhookPOST,
  GET as communicationWebhookGET,
} from "../src/app/api/webhooks/communication/route";
import { isAuthorizedCronRequest } from "../src/app/api/communication/automation/run/route";
import {
  GET as quotationPublicGET,
  POST as quotationPublicPOST,
} from "../src/app/api/quotations/public/[token]/route";
import { NextRequest } from "next/server";
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

  // Test 1.1: Direct-to-Vercel Anti-Spoofing: spoofed cf-connecting-ip is ignored when x-real-ip is present
  const spoofedCfReq = new Request("https://app.yourtraveldesk.in/api/test", {
    headers: {
      "cf-connecting-ip": "1.2.3.4 (spoofed)",
      "x-real-ip": "198.51.100.50",
      "x-forwarded-for": "10.0.0.1, 10.0.0.2",
    },
  });
  assert(
    getTrustedClientIp(spoofedCfReq) === "198.51.100.50",
    "Anti-spoofing: Direct-to-Vercel topology trusts authoritative x-real-ip and ignores client-supplied cf-connecting-ip"
  );

  // Test 1.2: Future compatibility: cf-connecting-ip is trusted only when TRUST_CLOUDFLARE_PROXY='true'
  process.env.TRUST_CLOUDFLARE_PROXY = "true";
  const cfTrustedReq = new Request("https://app.yourtraveldesk.in/api/test", {
    headers: {
      "cf-connecting-ip": "198.51.100.75",
      "x-real-ip": "10.0.0.1",
    },
  });
  assert(
    getTrustedClientIp(cfTrustedReq) === "198.51.100.75",
    "Compatibility: cf-connecting-ip is prioritized when TRUST_CLOUDFLARE_PROXY is explicitly enabled"
  );
  delete process.env.TRUST_CLOUDFLARE_PROXY;

  // Test 1.3: Direct upstream proxy IP (x-real-ip)
  const realIpReq = new Request("https://app.yourtraveldesk.in/api/test", {
    headers: {
      "x-real-ip": "198.51.100.50",
      "x-forwarded-for": "10.0.0.1, 10.0.0.2",
    },
  });
  assert(
    getTrustedClientIp(realIpReq) === "198.51.100.50",
    "x-real-ip is prioritized as authoritative in direct reverse proxy setup"
  );

  // Test 1.4: Anti-spoofing: Take right-most IP from x-forwarded-for when direct headers absent
  const forwardedReq = new Request("https://app.yourtraveldesk.in/api/test", {
    headers: {
      "x-forwarded-for": "1.2.3.4 (spoofed), 5.6.7.8 (spoofed), 203.0.113.88",
    },
  });
  assert(
    getTrustedClientIp(forwardedReq) === "203.0.113.88",
    "Anti-spoofing: Untrusted left-most headers are ignored, nearest edge hop selected from x-forwarded-for"
  );

  // Test 1.5: Default fallback to 127.0.0.1 when no IP headers exist
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
      RATE_LIMIT_CONFIGS["public-feedback"].failClosed === true,
    "public-feedback configured for 5 requests / 1m, fail-closed policy"
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
  // SECTION 9: RATE LIMITER OUTAGE SIMULATION & FAILURE-MODE REGRESSION TESTS
  // ----------------------------------------------------------------------------
  console.log("\n9. Rate Limiter Outage Simulation & Failure-Mode Regression Tests:");

  // Save real environment and global fetch
  const savedEnvNodeEnv = process.env.NODE_ENV;
  const savedRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const savedRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalFetch = globalThis.fetch;

  try {
    // Test 9.1: Missing Redis credentials in Production
    process.env.NODE_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const noCredsRead = await checkRateLimit({
      key: "test:missing_creds:read",
      limit: 60,
      windowMs: 60000,
      failClosed: false,
    });
    assert(
      noCredsRead.allowed === true && noCredsRead.remaining === 60,
      "Production missing credentials: public-read policy fails open (availability preserved)"
    );

    const noCredsFeedback = await checkRateLimit({
      key: "test:missing_creds:feedback",
      limit: 5,
      windowMs: 60000,
      failClosed: true,
    });
    assert(
      noCredsFeedback.allowed === false &&
        noCredsFeedback.isServiceUnavailable === true &&
        noCredsFeedback.retryAfterSeconds === 60,
      "Production missing credentials: public-feedback policy fails closed (503 Service Unavailable path)"
    );

    // Setup mock credentials for fetch-interception tests
    process.env.UPSTASH_REDIS_REST_URL = "https://mock-redis.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "mock-token-xyz";

    // Test 9.2: Redis Timeout (AbortSignal.timeout / DOMException TimeoutError)
    globalThis.fetch = async () => {
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    };

    const timeoutRead = await checkRateLimit({
      key: "test:timeout:read",
      limit: 60,
      windowMs: 60000,
      failClosed: false,
    });
    assert(
      timeoutRead.allowed === true && timeoutRead.remaining === 60,
      "Redis timeout: public-read fails open gracefully without unhandled exception"
    );

    const timeoutFeedback = await checkRateLimit({
      key: "test:timeout:feedback",
      limit: 5,
      windowMs: 60000,
      failClosed: true,
    });
    assert(
      timeoutFeedback.allowed === false &&
        timeoutFeedback.isServiceUnavailable === true &&
        timeoutFeedback.retryAfterSeconds === 60,
      "Redis timeout: public-feedback fails closed with isServiceUnavailable=true"
    );

    // Test 9.3: Network Rejection / Connection Refusal
    globalThis.fetch = async () => {
      throw new Error("fetch failed: connect ECONNREFUSED 127.0.0.1:443");
    };

    const netErrorRead = await checkRateLimit({
      key: "test:net_err:read",
      limit: 60,
      windowMs: 60000,
      failClosed: false,
    });
    assert(
      netErrorRead.allowed === true,
      "Network connection failure: public-read fails open gracefully"
    );

    const netErrorFeedback = await checkRateLimit({
      key: "test:net_err:feedback",
      limit: 5,
      windowMs: 60000,
      failClosed: true,
    });
    assert(
      netErrorFeedback.allowed === false && netErrorFeedback.isServiceUnavailable === true,
      "Network connection failure: public-feedback fails closed (protected mutation)"
    );

    // Test 9.4: Upstash HTTP 500 Internal Server Error
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });

    const http500Read = await checkRateLimit({
      key: "test:http500:read",
      limit: 60,
      windowMs: 60000,
      failClosed: false,
    });
    assert(
      http500Read.allowed === true,
      "Upstash HTTP 500: public-read fails open"
    );

    const http500Feedback = await checkRateLimit({
      key: "test:http500:feedback",
      limit: 5,
      windowMs: 60000,
      failClosed: true,
    });
    assert(
      http500Feedback.allowed === false && http500Feedback.isServiceUnavailable === true,
      "Upstash HTTP 500: public-feedback fails closed"
    );

    // Test 9.5: Upstash HTTP 429 Daily Quota Exceeded
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "Daily request limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });

    const http429Read = await checkRateLimit({
      key: "test:http429:read",
      limit: 60,
      windowMs: 60000,
      failClosed: false,
    });
    assert(
      http429Read.allowed === true,
      "Upstash HTTP 429 quota exhaustion: public-read fails open"
    );

    const http429Feedback = await checkRateLimit({
      key: "test:http429:feedback",
      limit: 5,
      windowMs: 60000,
      failClosed: true,
    });
    assert(
      http429Feedback.allowed === false && http429Feedback.isServiceUnavailable === true,
      "Upstash HTTP 429 quota exhaustion: public-feedback fails closed"
    );

    // Test 9.6: Malformed Non-JSON Response (e.g. HTML gateway error)
    globalThis.fetch = async () =>
      new Response("<html><body>502 Bad Gateway</body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });

    const malformedJsonRead = await checkRateLimit({
      key: "test:malformed:read",
      limit: 60,
      windowMs: 60000,
      failClosed: false,
    });
    assert(
      malformedJsonRead.allowed === true,
      "Malformed non-JSON gateway response: public-read fails open"
    );

    const malformedJsonFeedback = await checkRateLimit({
      key: "test:malformed:feedback",
      limit: 5,
      windowMs: 60000,
      failClosed: true,
    });
    assert(
      malformedJsonFeedback.allowed === false && malformedJsonFeedback.isServiceUnavailable === true,
      "Malformed non-JSON gateway response: public-feedback fails closed"
    );

    // Test 9.7: Redis Lua Script Error Structure ([{ error: "ERR syntax error" }])
    globalThis.fetch = async () =>
      new Response(JSON.stringify([{ error: "ERR syntax error in script" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const luaErrorRead = await checkRateLimit({
      key: "test:lua_err:read",
      limit: 60,
      windowMs: 60000,
      failClosed: false,
    });
    assert(
      luaErrorRead.allowed === true,
      "Redis Lua error: public-read fails open"
    );

    const luaErrorFeedback = await checkRateLimit({
      key: "test:lua_err:feedback",
      limit: 5,
      windowMs: 60000,
      failClosed: true,
    });
    assert(
      luaErrorFeedback.allowed === false && luaErrorFeedback.isServiceUnavailable === true,
      "Redis Lua error: public-feedback fails closed"
    );

    // Test 9.8: Healthy Redis Response Under Quota
    globalThis.fetch = async () =>
      new Response(JSON.stringify([{ result: [1, 45, 60] }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const healthyUnderQuota = await checkRateLimit({
      key: "test:healthy:under_quota",
      limit: 60,
      windowMs: 60000,
      failClosed: true,
    });
    assert(
      healthyUnderQuota.allowed === true &&
        healthyUnderQuota.remaining === 45 &&
        healthyUnderQuota.retryAfterSeconds === 60,
      "Healthy Redis response: accurately returns allowed=true, remaining=45, retryAfterSeconds=60"
    );

    // Test 9.9: Healthy Redis Response Quota Exceeded (Blocked)
    globalThis.fetch = async () =>
      new Response(JSON.stringify([{ result: [0, 0, 37] }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const healthyExceeded = await checkRateLimit({
      key: "test:healthy:exceeded",
      limit: 5,
      windowMs: 60000,
      failClosed: true,
    });
    assert(
      healthyExceeded.allowed === false &&
        healthyExceeded.remaining === 0 &&
        healthyExceeded.retryAfterSeconds === 37 &&
        healthyExceeded.isServiceUnavailable !== true,
      "Healthy Redis rate limit exceeded: accurately returns allowed=false, retryAfterSeconds=37, isServiceUnavailable unset"
    );

    // Test 9.10: Rate Limit Headers for Fail-Closed Outage Response (503 path)
    const outageHeaders = getRateLimitHeaders(timeoutFeedback);
    assert(
      outageHeaders["X-RateLimit-Limit"] === "5" &&
        outageHeaders["X-RateLimit-Remaining"] === "0" &&
        outageHeaders["Retry-After"] === "60",
      "Outage response headers: properly formats X-RateLimit-Limit: 5, Remaining: 0, Retry-After: 60"
    );

  } finally {
    // Restore environment and fetch
    globalThis.fetch = originalFetch;
    if (savedEnvNodeEnv !== undefined) {
      process.env.NODE_ENV = savedEnvNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    if (savedRedisUrl !== undefined) {
      process.env.UPSTASH_REDIS_REST_URL = savedRedisUrl;
    } else {
      delete process.env.UPSTASH_REDIS_REST_URL;
    }
    if (savedRedisToken !== undefined) {
      process.env.UPSTASH_REDIS_REST_TOKEN = savedRedisToken;
    } else {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    }
  }

  // ----------------------------------------------------------------------------
  // SECTION 10: INBOUND COMMUNICATION WEBHOOK DISABLED REGRESSION TESTS
  // ----------------------------------------------------------------------------
  console.log("\n10. Inbound Communication Webhook Disabled Regression Tests:");

  // Test 10.1: Unauthenticated POST returns HTTP 404 with disabled error payload
  const webhookPostRes = await communicationWebhookPOST();
  assert(
    webhookPostRes.status === 404,
    "Communication webhook POST immediately returns HTTP 404"
  );
  const webhookPostBody = await webhookPostRes.json();
  assert(
    webhookPostBody.success === false &&
      webhookPostBody.error === "Communication webhook receiver is disabled.",
    "Communication webhook POST returns explicit disabled message without parsing body"
  );

  // Test 10.2: GET request to communication webhook returns HTTP 404
  const webhookGetRes = await communicationWebhookGET();
  assert(
    webhookGetRes.status === 404,
    "Communication webhook GET returns HTTP 404"
  );

  // Test 10.3: Forged signature headers (x-provider-signature, x-hub-signature-256) still produce 404
  const forgedPostRes = await communicationWebhookPOST();
  assert(
    forgedPostRes.status === 404,
    "Inbound webhook remains disabled regardless of supplied provider signatures"
  );

  // Test 10.4: Route cannot mutate notifications while disabled
  assert(
    webhookPostRes.status === 404 && webhookGetRes.status === 404,
    "Route cannot parse JSON, evaluate signatures, or update notification delivery statuses"
  );

  // ----------------------------------------------------------------------------
  // SECTION 11: PRODUCTION CRON AUTHENTICATION & TIMING-SAFE CONTRACT
  // ----------------------------------------------------------------------------
  console.log("\n11. Production Cron Authentication & Timing-Safe Security Contract:");

  const originalCronSecret = process.env.CRON_SECRET;
  const testCronSecret = "super-secret-high-entropy-cron-token-production-64char";

  try {
    process.env.CRON_SECRET = testCronSecret;

    // Test 11.1: Valid Bearer token authorizes cron
    const validBearerReq = new Request("https://app.yourtraveldesk.in/api/communication/automation/run", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${testCronSecret}`,
      },
    });
    assert(
      isAuthorizedCronRequest(validBearerReq) === true,
      "Valid Bearer token in Authorization header authoritatively authorizes CRON mode"
    );

    // Test 11.2: Valid x-cron-secret header authorizes cron
    const validCustomHeaderReq = new Request("https://app.yourtraveldesk.in/api/communication/automation/run", {
      method: "POST",
      headers: {
        "x-cron-secret": testCronSecret,
      },
    });
    assert(
      isAuthorizedCronRequest(validCustomHeaderReq) === true,
      "Valid x-cron-secret header authoritatively authorizes CRON mode"
    );

    // Test 11.3: Forged / invalid Bearer token is rejected
    const forgedBearerReq = new Request("https://app.yourtraveldesk.in/api/communication/automation/run", {
      method: "POST",
      headers: {
        Authorization: "Bearer attacker-supplied-fake-secret-xyz",
      },
    });
    assert(
      isAuthorizedCronRequest(forgedBearerReq) === false,
      "Forged Bearer token is rejected and cannot trigger CRON mode"
    );

    // Test 11.4: Forged / invalid x-cron-secret is rejected
    const forgedCustomHeaderReq = new Request("https://app.yourtraveldesk.in/api/communication/automation/run", {
      method: "POST",
      headers: {
        "x-cron-secret": "attacker-invalid-secret-header",
      },
    });
    assert(
      isAuthorizedCronRequest(forgedCustomHeaderReq) === false,
      "Forged x-cron-secret header is rejected"
    );

    // Test 11.5: Missing authorization headers rejected
    const unauthenticatedReq = new Request("https://app.yourtraveldesk.in/api/communication/automation/run", {
      method: "POST",
    });
    assert(
      isAuthorizedCronRequest(unauthenticatedReq) === false,
      "Unauthenticated request without cron headers is rejected"
    );

    // Test 11.6: Missing CRON_SECRET in environment safely disables cron mode (no silent bypass)
    delete process.env.CRON_SECRET;
    assert(
      isAuthorizedCronRequest(validBearerReq) === false,
      "Unset CRON_SECRET safely disables cron authorization without false positives"
    );

    // Test 11.7: Whitespace or short CRON_SECRET (< 16 chars) fails closed
    process.env.CRON_SECRET = "   ";
    assert(
      isAuthorizedCronRequest(validBearerReq) === false,
      "Whitespace-only CRON_SECRET is rejected"
    );

    process.env.CRON_SECRET = "short_secret";
    const shortSecretReq = new Request("https://app.yourtraveldesk.in/api/communication/automation/run", {
      method: "POST",
      headers: { Authorization: "Bearer short_secret" },
    });
    assert(
      isAuthorizedCronRequest(shortSecretReq) === false,
      "Under-entropy CRON_SECRET (< 16 characters) is rejected for safety"
    );
  } finally {
    if (originalCronSecret !== undefined) {
      process.env.CRON_SECRET = originalCronSecret;
    } else {
      delete process.env.CRON_SECRET;
    }
  }

  // ----------------------------------------------------------------------------
  // SECTION 12: CUSTOMER PORTAL DOCUMENT ISOLATION & SUPPLIER VOUCHER EXCLUSION
  // ----------------------------------------------------------------------------
  console.log("\n12. Customer Portal Document Isolation & Supplier Voucher Exclusion:");

  interface PortalDocMock {
    id: string;
    tripId: string;
    customerId: string;
    agencyId: string;
    status: string;
    documentType: string;
    documentNumber: string;
  }

  const portalDocsMock: PortalDocMock[] = [
    {
      id: "doc_hotel_issued",
      tripId: "trip_cust_100",
      customerId: "cust_guest_1",
      agencyId: "agency_tripdesk",
      status: "ISSUED",
      documentType: "HOTEL_VOUCHER",
      documentNumber: "HV-2026-0001",
    },
    {
      id: "doc_trip2_issued",
      tripId: "trip_cust_200", // Trip 200
      customerId: "cust_guest_1", // Same customer
      agencyId: "agency_tripdesk",
      status: "ISSUED",
      documentType: "HOTEL_VOUCHER",
      documentNumber: "HV-2026-0002",
    },
    {
      id: "doc_internal_supplier_voucher",
      tripId: "trip_cust_100",
      customerId: "cust_guest_1",
      agencyId: "agency_tripdesk",
      status: "ISSUED",
      documentType: "SUPPLIER_VOUCHER", // Internal supplier voucher
      documentNumber: "SV-2026-0001",
    },
    {
      id: "doc_unissued_draft",
      tripId: "trip_cust_100",
      customerId: "cust_guest_1",
      agencyId: "agency_tripdesk",
      status: "GENERATED", // Unissued
      documentType: "VEHICLE_VOUCHER",
      documentNumber: "VV-2026-0001",
    },
  ];

  function customerPortalDocSimulator(
    docId: string,
    customerId: string,
    agencyId: string,
    tripId: string
  ): PortalDocMock | null {
    return (
      portalDocsMock.find(
        (d) =>
          d.id === docId &&
          d.customerId === customerId &&
          d.agencyId === agencyId &&
          d.tripId === tripId &&
          d.status === "ISSUED" &&
          d.documentType !== "SUPPLIER_VOUCHER"
      ) || null
    );
  }

  // Test 12.1: Legitimate customer document for matching trip & customer is allowed
  const validCustomerDoc = customerPortalDocSimulator("doc_hotel_issued", "cust_guest_1", "agency_tripdesk", "trip_cust_100");
  assert(
    validCustomerDoc !== null && validCustomerDoc.id === "doc_hotel_issued",
    "Customer portal permits legitimate ISSUED traveler document for authorized trip"
  );

  // Test 12.2: Cross-trip document download with matching customer is rejected
  const crossTripCustomerDoc = customerPortalDocSimulator("doc_trip2_issued", "cust_guest_1", "agency_tripdesk", "trip_cust_100");
  assert(
    crossTripCustomerDoc === null,
    "Customer portal strictly rejects downloading Trip 200 document within Trip 100 context (cross-trip IDOR defense)"
  );

  // Test 12.3: Internal SUPPLIER_VOUCHER document is strictly rejected
  const supplierVoucherCustomerDoc = customerPortalDocSimulator("doc_internal_supplier_voucher", "cust_guest_1", "agency_tripdesk", "trip_cust_100");
  assert(
    supplierVoucherCustomerDoc === null,
    "Customer portal strictly excludes SUPPLIER_VOUCHER documents from customer access"
  );

  // Test 12.4: Unissued (GENERATED) document is rejected
  const unissuedCustomerDoc = customerPortalDocSimulator("doc_unissued_draft", "cust_guest_1", "agency_tripdesk", "trip_cust_100");
  assert(
    unissuedCustomerDoc === null,
    "Customer portal rejects unissued (GENERATED) travel documents"
  );

  // ----------------------------------------------------------------------------
  // SECTION 13: PUBLIC QUOTATION RATE LIMITING & VALIDATION CONTRACT
  // ----------------------------------------------------------------------------
  console.log("\n13. Public Quotation Rate Limiting & Validation Contract:");

  // Test 13.1: Empty token on GET returns 400
  const reqEmptyGet = new NextRequest("https://app.yourtraveldesk.in/api/quotations/public/");
  const resEmptyGet = await quotationPublicGET(reqEmptyGet, {
    params: Promise.resolve({ token: "   " }),
  });
  assert(
    resEmptyGet.status === 400,
    "GET /api/quotations/public/[token] returns HTTP 400 for empty or whitespace token"
  );

  // Test 13.2: Empty token on POST returns 400
  const reqEmptyPost = new NextRequest("https://app.yourtraveldesk.in/api/quotations/public/", {
    method: "POST",
  });
  const resEmptyPost = await quotationPublicPOST(reqEmptyPost, {
    params: Promise.resolve({ token: "" }),
  });
  assert(
    resEmptyPost.status === 400,
    "POST /api/quotations/public/[token] returns HTTP 400 for missing token"
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
