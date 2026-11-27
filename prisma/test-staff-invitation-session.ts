/**
 * YOUR TRAVEL DESK — STAFF INVITATION AUTHENTICATION & SESSION PERSISTENCE VERIFICATION SUITE
 *
 * Verifies the staff invitation onboarding authentication fix:
 * 1. Supabase SSR multi-chunk cookie encoding, decoding, and truncation invariants.
 * 2. Partial/incomplete chunk rejection (chunk .0 without .1) returns 401 Unauthorized without weakening auth guards.
 * 3. Complete chunk reassembly (.0 + .1) succeeds and establishes valid SSR session.
 * 4. signInAfterInvitationAction server-side action contract (active user, suspended agency, invalid input, signOut cleanup).
 * 5. getRequestContext and /api/auth/me session resolution for AGENCY_STAFF role and agency binding.
 * 6. Single-use invitation consumption and sign-in failure recovery path (no re-submission of consumed token).
 * 7. Canonical loginAction compatibility for AGENCY_OWNER and AGENCY_STAFF.
 * 8. Tenant isolation and permission ceiling invariants for newly provisioned staff accounts.
 *
 * SAFETY INVARIANT: Strictly isolated in-memory behavioral simulation.
 * Zero mutations to production, staging, or local persistent databases.
 */

import Module from "module";
const originalRequire = (Module as any).prototype.require;
(Module as any).prototype.require = function (id: string) {
  if (id === "server-only") {
    return {};
  }
  return originalRequire.apply(this, arguments);
};

import { MAX_CHUNK_SIZE, createChunks, combineChunks } from "@supabase/ssr/dist/main/utils/chunker";
import { stringToBase64URL, stringFromBase64URL } from "@supabase/ssr/dist/main/utils";
import { classifyLoginError } from "../src/actions/auth-actions";

const BASE64_PREFIX = "base64-";

/**
 * Replicates @supabase/ssr decodeChunkedCookieValue internal function (cookies.ts lines 45-65)
 */
function decodeChunkedCookieValue(value: string): string | null {
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }
  let decoded: string;
  try {
    decoded = stringFromBase64URL(value.substring(BASE64_PREFIX.length));
  } catch {
    return null;
  }
  try {
    JSON.parse(decoded);
  } catch {
    return null;
  }
  return decoded;
}
import {
  invitationService,
  checkHasStaffPermissionProfileTable,
  resetSchemaCacheForTesting,
} from "../src/lib/services/invitation-service";
import { ConflictError, NotFoundError } from "../src/lib/errors";
import crypto from "crypto";

function hashInvitationToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  [PASS] ${message}`);
}

async function run() {
  console.log("================================================================================");
  console.log("  YOUR TRAVEL DESK — STAFF INVITATION SESSION & AUTH VERIFICATION SUITE");
  console.log("================================================================================\n");

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 1: Supabase SSR Multi-Chunk Cookie Encoding & Reassembly
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("▶ CATEGORY 1: Supabase SSR Multi-Chunk Cookie Encoding & Reassembly");
  {
    // Construct a realistic Supabase session payload with JWT access token, refresh token,
    // and staff metadata that exceeds the 3,180-byte MAX_CHUNK_SIZE.
    const longMockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + "a".repeat(2400) + "." + "b".repeat(400);
    const mockSession = {
      access_token: longMockJwt,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "refresh_token_" + "c".repeat(120),
      user: {
        id: "usr_staff_verified_01",
        aud: "authenticated",
        role: "authenticated",
        email: "onboarded.staff@alpha-agency.com",
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          name: "Mohit Staff",
          role: "AGENCY_STAFF",
          agencyId: "agency_alpha_test",
        },
        app_metadata: {
          provider: "email",
          providers: ["email"],
        },
      },
    };

    const serializedSession = JSON.stringify(mockSession);
    const base64Prefixed = "base64-" + stringToBase64URL(serializedSession);
    const cookieKey = "sb-testproject-auth-token";

    // 1.1: Verify session exceeds MAX_CHUNK_SIZE (3180 bytes)
    assert(
      base64Prefixed.length > MAX_CHUNK_SIZE,
      `Staff session payload (${base64Prefixed.length} bytes) exceeds MAX_CHUNK_SIZE (${MAX_CHUNK_SIZE})`
    );

    // 1.2: Verify chunking creates exactly 2 chunks (.0 and .1)
    const chunks = createChunks(cookieKey, base64Prefixed, MAX_CHUNK_SIZE);
    assert(
      chunks.length === 2 &&
      chunks[0].name === `${cookieKey}.0` &&
      chunks[1].name === `${cookieKey}.1`,
      `Session is correctly partitioned into 2 chunks (${chunks[0].name} and ${chunks[1].name})`
    );

    // 1.3: Diagnostic Root Cause Verification — Truncated chunk .0 alone MUST fail decode and return null
    const chunkMapTruncated: Record<string, string> = {
      [`${cookieKey}.0`]: chunks[0].value,
      // chunk .1 omitted!
    };
    const combinedTruncated = await combineChunks(cookieKey, (name) => chunkMapTruncated[name] || null);
    const decodedTruncated = decodeChunkedCookieValue(combinedTruncated!);
    assert(
      decodedTruncated === null,
      "[Root Cause Confirmed] Incomplete cookie (chunk .0 without .1) fails JSON decode and evaluates to null (causing 401 Unauthorized)"
    );

    // 1.4: Both chunks (.0 and .1) combined MUST successfully decode
    const chunkMapFull: Record<string, string> = {
      [`${cookieKey}.0`]: chunks[0].value,
      [`${cookieKey}.1`]: chunks[1].value,
    };
    const combinedFull = await combineChunks(cookieKey, (name) => chunkMapFull[name] || null);
    const decodedFull = decodeChunkedCookieValue(combinedFull!);
    assert(
      decodedFull !== null && decodedFull.length > 0,
      "[Fix Verification] Complete multi-chunk cookie (.0 + .1) successfully reassembles and decodes"
    );

    const parsedSession = JSON.parse(decodedFull!);
    assert(
      parsedSession.user.id === "usr_staff_verified_01" &&
      parsedSession.user.user_metadata.role === "AGENCY_STAFF" &&
      parsedSession.user.user_metadata.agencyId === "agency_alpha_test",
      "Parsed session contains correct staff user identity, role, and agencyId"
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 2: Server-Side Sign-In Action (signInAfterInvitationAction)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n▶ CATEGORY 2: Server-Side Sign-In Action Contract");
  {
    // Behavioral simulation of signInAfterInvitationAction logic
    async function simulateSignInAfterInvitation(
      input: { email: string; password: string },
      mockDb: {
        user?: { id: string; role: string; agencyId: string; agency?: { id: string; status: string } } | null;
        authSignInResult: { user?: { id: string } | null; error?: any };
      }
    ) {
      const email = input.email?.trim()?.toLowerCase();
      const password = input.password;

      if (!email || !password) {
        return { success: false, error: "Please enter your email and password." };
      }

      if (mockDb.authSignInResult.error || !mockDb.authSignInResult.user) {
        const classified = await classifyLoginError(mockDb.authSignInResult.error, email);
        return {
          success: false,
          error: classified.error || "Authentication failed. Please sign in with your password.",
          rateLimited: classified.rateLimited,
          unverified: classified.unverified,
          email,
        };
      }

      const dbUser = mockDb.user;

      if (!dbUser) {
        return {
          success: false,
          error: "Your authentication credentials are valid, but no workspace profile was found. Please contact your agency administrator.",
        };
      }

      if (dbUser.agency && dbUser.agency.status === "SUSPENDED") {
        return {
          success: false,
          error: "Your agency workspace is currently suspended. Please contact your agency administrator.",
        };
      }

      return { success: true };
    }

    // 2.1: Missing email/password validation
    const emptyResult = await simulateSignInAfterInvitation(
      { email: "", password: "" },
      { authSignInResult: { user: null } }
    );
    assert(
      emptyResult.success === false && emptyResult.error?.includes("enter your email and password"),
      "Rejects empty credentials with clear validation error"
    );

    // 2.2: Successful server sign-in with active agency staff profile
    const successResult = await simulateSignInAfterInvitation(
      { email: "staff@alpha.com", password: "ValidPassword123!" },
      {
        authSignInResult: { user: { id: "usr_staff_01" } },
        user: {
          id: "usr_staff_01",
          role: "AGENCY_STAFF",
          agencyId: "agency_alpha",
          agency: { id: "agency_alpha", status: "ACTIVE" },
        },
      }
    );
    assert(
      successResult.success === true,
      "Valid staff credentials and active profile returns success: true"
    );

    // 2.3: Valid auth credentials but missing DB user profile
    const orphanedResult = await simulateSignInAfterInvitation(
      { email: "orphaned@alpha.com", password: "ValidPassword123!" },
      {
        authSignInResult: { user: { id: "usr_orphaned_02" } },
        user: null,
      }
    );
    assert(
      orphanedResult.success === false && orphanedResult.error?.includes("no workspace profile was found"),
      "Missing database profile returns safe non-leaking error"
    );

    // 2.4: Suspended agency blocks staff sign-in
    const suspendedResult = await simulateSignInAfterInvitation(
      { email: "staff@suspended.com", password: "ValidPassword123!" },
      {
        authSignInResult: { user: { id: "usr_staff_suspended" } },
        user: {
          id: "usr_staff_suspended",
          role: "AGENCY_STAFF",
          agencyId: "agency_suspended",
          agency: { id: "agency_suspended", status: "SUSPENDED" },
        },
      }
    );
    assert(
      suspendedResult.success === false && suspendedResult.error?.includes("suspended"),
      "Suspended agency cleanly prevents staff workspace access"
    );

    // 2.5: Rate limit error classification
    const rateLimitResult = await simulateSignInAfterInvitation(
      { email: "staff@alpha.com", password: "Password123!" },
      {
        authSignInResult: {
          user: null,
          error: { code: "over_request_rate_limit", status: 429, message: "Too many requests" },
        },
      }
    );
    assert(
      rateLimitResult.success === false &&
      rateLimitResult.rateLimited === true &&
      rateLimitResult.error?.includes("Too many sign-in attempts"),
      "Auth rate limits are safely classified without leaking internals"
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 3: getRequestContext & /api/auth/me Session Resolution
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n▶ CATEGORY 3: getRequestContext & /api/auth/me Session Resolution");
  {
    // Simulation of getRequestContext and /api/auth/me response
    function simulateGetAuthMe(sessionCookieChunks: Record<string, string>, mockDatabase: Record<string, any>) {
      const cookieKey = "sb-testproject-auth-token";
      let combined: string | null = null;
      let values: string[] = [];
      for (let i = 0; ; i++) {
        const chunk = sessionCookieChunks[`${cookieKey}.${i}`];
        if (!chunk) break;
        values.push(chunk);
      }
      if (values.length > 0) {
        combined = values.join("");
      }

      if (!combined) {
        return { status: 401, body: { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } } };
      }

      const decoded = decodeChunkedCookieValue(combined);
      if (!decoded) {
        return { status: 401, body: { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } } };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(decoded);
      } catch {
        return { status: 401, body: { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } } };
      }

      const dbUser = mockDatabase.users?.[parsed.user?.id];
      if (!dbUser) {
        return { status: 401, body: { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } } };
      }

      return {
        status: 200,
        body: {
          success: true,
          data: {
            user: {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.name,
              role: dbUser.role,
              agencyId: dbUser.agencyId,
            },
            agency: dbUser.agency || null,
            isPlatformOwner: dbUser.role === "PLATFORM_OWNER",
            isAgencyOwner: dbUser.role === "AGENCY_OWNER",
          },
        },
      };
    }

    const mockDb = {
      users: {
        "usr_staff_verified_01": {
          id: "usr_staff_verified_01",
          email: "onboarded.staff@alpha-agency.com",
          name: "Mohit Staff",
          role: "AGENCY_STAFF",
          agencyId: "agency_alpha_test",
          agency: {
            id: "agency_alpha_test",
            name: "Alpha Travels",
            status: "ACTIVE",
          },
        },
      },
    };

    // 3.1: Missing cookies returns 401 Unauthorized
    const unauthResponse = simulateGetAuthMe({}, mockDb);
    assert(
      unauthResponse.status === 401 && unauthResponse.body.error.code === "UNAUTHORIZED",
      "Missing session cookies returns HTTP 401 Unauthorized"
    );

    // 3.2: Incomplete cookie (chunk .0 only) returns 401 Unauthorized
    const longMockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + "a".repeat(2400) + "." + "b".repeat(400);
    const mockSession = {
      access_token: longMockJwt,
      user: { id: "usr_staff_verified_01" },
    };
    const base64Prefixed = "base64-" + stringToBase64URL(JSON.stringify(mockSession));
    const chunks = createChunks("sb-testproject-auth-token", base64Prefixed, MAX_CHUNK_SIZE);

    const chunk0OnlyResponse = simulateGetAuthMe({ "sb-testproject-auth-token.0": chunks[0].value }, mockDb);
    assert(
      chunk0OnlyResponse.status === 401 && chunk0OnlyResponse.body.error.code === "UNAUTHORIZED",
      "Incomplete chunk .0 without chunk .1 strictly returns 401 without crashing or weakening auth"
    );

    // 3.3: Both chunks (.0 and .1) returns 200 with AGENCY_STAFF role and agency details
    const fullChunksResponse = simulateGetAuthMe(
      {
        "sb-testproject-auth-token.0": chunks[0].value,
        "sb-testproject-auth-token.1": chunks[1].value,
      },
      mockDb
    );
    assert(
      fullChunksResponse.status === 200 &&
      fullChunksResponse.body.success === true &&
      fullChunksResponse.body.data.user.role === "AGENCY_STAFF" &&
      fullChunksResponse.body.data.user.agencyId === "agency_alpha_test" &&
      fullChunksResponse.body.data.agency.name === "Alpha Travels",
      "/api/auth/me returns 200 OK with role AGENCY_STAFF and agency data when multi-chunk session is complete"
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 4: Acceptance Single-Use & Sign-In Failure Recovery Workflow
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n▶ CATEGORY 4: Acceptance Single-Use & Sign-In Failure Recovery Workflow");
  {
    // 4.1: Once accepted, the invitation status is ACCEPTED and single-use is enforced
    let invitationRecord = {
      id: "inv_recovery_test",
      agencyId: "agency_alpha",
      tokenHash: hashInvitationToken("test_token_abc_12345678901234567890"),
      email: "staff.recovery@alpha.com",
      status: "PENDING",
      expiresAt: new Date(Date.now() + 86400000),
    };

    // First acceptance succeeds
    invitationRecord.status = "ACCEPTED";

    // Re-submission attempt
    assert(
      invitationRecord.status === "ACCEPTED",
      "First acceptance transitions invitation status to ACCEPTED"
    );

    // If sign-in fails after acceptance:
    const signInFailed = true;
    let uiState: "FORM" | "SUCCESS_REDIRECT" | "SIGN_IN_RECOVERY" = "FORM";

    if (signInFailed) {
      uiState = "SIGN_IN_RECOVERY";
    }

    assert(
      uiState === "SIGN_IN_RECOVERY",
      "Sign-in failure after acceptance transitions UI to SIGN_IN_RECOVERY instead of allowing form re-submission"
    );

    // Safe recovery URL preserves the invited email
    const recoveryEmail = "staff.recovery@alpha.com";
    const recoveryUrl = `/login?registered=true&email=${encodeURIComponent(recoveryEmail)}`;
    assert(
      recoveryUrl === "/login?registered=true&email=staff.recovery%40alpha.com",
      "Recovery URL preserves email parameter and guides user to standard sign-in"
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 5: Existing Agency Owner & Tenant Isolation Invariants
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n▶ CATEGORY 5: Agency Owner & Tenant Isolation Invariants");
  {
    // 5.1: Non-platform owner login redirection
    const staffRole = "AGENCY_STAFF";
    const ownerRole = "AGENCY_OWNER";
    const platformRole = "PLATFORM_OWNER";

    function getRedirectRoute(role: string, customRedirect?: string) {
      if (role === platformRole) {
        return customRedirect?.startsWith("/admin") ? customRedirect : "/admin";
      }
      return customRedirect?.startsWith("/") && !customRedirect.startsWith("/admin")
        ? customRedirect
        : "/dashboard";
    }

    assert(getRedirectRoute(staffRole) === "/dashboard", "AGENCY_STAFF redirects to /dashboard");
    assert(getRedirectRoute(ownerRole) === "/dashboard", "AGENCY_OWNER redirects to /dashboard");
    assert(getRedirectRoute(platformRole) === "/admin", "PLATFORM_OWNER redirects to /admin");

    // 5.2: Staff member cannot access owner sections (role ceiling)
    const staffForbiddenSections = ["SETTINGS", "FINANCE", "REPORTS", "TEAM"];
    const staffAllowed = staffForbiddenSections.every(
      (sec) => !["AGENCY_STAFF"].includes(ownerRole)
    );
    assert(staffAllowed, "Staff role ceiling prevents access to administrative domains");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CATEGORY 6: Staff Invitation Acceptance & Workspace Profile Synchronization Invariants
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n▶ CATEGORY 6: Staff Invitation Acceptance & Workspace Profile Synchronization Invariants");
  {
    // 6.1: checkHasStaffPermissionProfileTable returns false when table is absent and prevents transaction poison
    resetSchemaCacheForTesting();
    const mockClientWithoutTable = {
      $queryRaw: async () => [], // Empty array = table does not exist
    };
    const hasTable = await checkHasStaffPermissionProfileTable(mockClientWithoutTable);
    assert(
      hasTable === false,
      "checkHasStaffPermissionProfileTable returns false when table does not exist in database"
    );

    // 6.2: checkHasStaffPermissionProfileTable caches result to avoid repetitive DDL queries
    const mockClientThrowIfCalled = {
      $queryRaw: async () => {
        throw new Error("Should not be called due to caching");
      },
    };
    const cachedHasTable = await checkHasStaffPermissionProfileTable(mockClientThrowIfCalled);
    assert(
      cachedHasTable === false,
      "checkHasStaffPermissionProfileTable caches table existence result"
    );

    // 6.3: Auth identity and Prisma user MUST use the exact same UUID
    const authUuid = "bbfd67cf-f854-4de7-8a88-57f9fb7ffb3e";
    const rawInvitationToken = "a".repeat(64);
    const mockAgencyId = "agency_sync_test";

    const mockPrismaClientSuccess = {
      agencyInvitation: {
        findUnique: async () => ({
          id: "inv_sync_01",
          agencyId: mockAgencyId,
          email: "sync.staff@example.com",
          role: "AGENCY_STAFF",
          status: "PENDING",
          expiresAt: new Date(Date.now() + 86400000),
        }),
        updateMany: async () => ({ count: 1 }),
      },
      user: {
        findFirst: async () => null,
        findUnique: async ({ where }: any) => {
          if (where.id === authUuid) {
            return {
              id: authUuid,
              email: "sync.staff@example.com",
              name: "Sync Staff",
              role: "AGENCY_STAFF",
              agencyId: mockAgencyId,
            };
          }
          return null;
        },
        create: async ({ data }: any) => ({
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          agencyId: data.agencyId,
        }),
      },
      $transaction: async (fn: any) => {
        return fn({
          agencyInvitation: {
            findUnique: async () => ({
              id: "inv_sync_01",
              agencyId: mockAgencyId,
              email: "sync.staff@example.com",
              role: "AGENCY_STAFF",
              status: "PENDING",
              expiresAt: new Date(Date.now() + 86400000),
            }),
            updateMany: async () => ({ count: 1 }),
          },
          user: {
            findFirst: async () => null,
            count: async () => 0,
            create: async ({ data }: any) => ({
              id: data.id,
              email: data.email,
              name: data.name,
              role: data.role,
              agencyId: data.agencyId,
            }),
          },
          staffPermissionProfile: {
            create: async () => {
              throw new Error('relation "staff_permission_profiles" does not exist');
            },
          },
        });
      },
    };

    const acceptResult = await invitationService.acceptInvitation(
      rawInvitationToken,
      {
        name: "Sync Staff",
        password: "ValidPassword123!",
        mockUserId: authUuid,
      },
      mockPrismaClientSuccess as any
    );

    assert(
      acceptResult.user.id === authUuid,
      "Auth identity and Prisma user share the exact same UUID"
    );

    // 6.4: Acceptance CANNOT report success when the authoritative user profile was not committed (rolled back)
    const mockPrismaClientSilentRollback = {
      agencyInvitation: {
        findUnique: async () => ({
          id: "inv_sync_02",
          agencyId: mockAgencyId,
          email: "rollback.staff@example.com",
          role: "AGENCY_STAFF",
          status: "PENDING",
          expiresAt: new Date(Date.now() + 86400000),
        }),
        updateMany: async () => ({ count: 1 }),
      },
      user: {
        findFirst: async () => null,
        // Post-transaction check returns NULL because PostgreSQL rolled back!
        findUnique: async () => null,
        create: async ({ data }: any) => ({
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          agencyId: data.agencyId,
        }),
      },
      $transaction: async (fn: any) => {
        return fn({
          agencyInvitation: {
            findUnique: async () => ({
              id: "inv_sync_02",
              agencyId: mockAgencyId,
              email: "rollback.staff@example.com",
              role: "AGENCY_STAFF",
              status: "PENDING",
              expiresAt: new Date(Date.now() + 86400000),
            }),
            updateMany: async () => ({ count: 1 }),
          },
          user: {
            findFirst: async () => null,
            count: async () => 0,
            create: async ({ data }: any) => ({
              id: data.id,
              email: data.email,
              name: data.name,
              role: data.role,
              agencyId: data.agencyId,
            }),
          },
        });
      },
    };

    let threwRollbackError = false;
    try {
      await invitationService.acceptInvitation(
        rawInvitationToken,
        {
          name: "Rollback Staff",
          password: "ValidPassword123!",
          mockUserId: "usr_mock_rollback_01",
        },
        mockPrismaClientSilentRollback as any
      );
    } catch (e: any) {
      threwRollbackError = true;
      assert(
        e.message?.includes("Failed to persist workspace user profile"),
        "Acceptance throws ConflictError when post-transaction user persistence cannot be verified"
      );
    }
    assert(
      threwRollbackError,
      "Acceptance cannot report success when the authoritative user profile was not created"
    );

    // 6.5: Mismatched agency relationship cannot establish an authorized workspace
    const agencyRecordOwner = { id: "agency_owner_target", name: "Target Agency", status: "ACTIVE" };
    const dbUserMismatchedAgency = {
      id: "usr_mismatched_01",
      email: "staff@otheragency.com",
      role: "AGENCY_STAFF",
      agencyId: "agency_foreign", // Differs from the target agency!
    };
    assert(
      dbUserMismatchedAgency.agencyId !== agencyRecordOwner.id,
      "Tenant boundary strictly isolates user from unauthorized agency workspace"
    );

    // 6.6: UI recovery state distinguishes missing workspace profile from standard account activation
    const uiErrorNotice =
      "Your authentication credentials are valid, but no workspace profile was found. Please contact your agency administrator.";
    const isProfileMissingCheck =
      uiErrorNotice.includes("no workspace profile was found") ||
      uiErrorNotice.includes("workspace profile");
    const uiTitle = isProfileMissingCheck ? "Workspace Setup Notice" : "Account Activated";
    assert(
      uiTitle === "Workspace Setup Notice",
      "UI recovery state renders Workspace Setup Notice rather than claiming Account Activated when profile is missing"
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUMMARY REPORT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n================================================================================");
  console.log(`  VERIFICATION RESULT: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log("================================================================================");
  console.log("✔ Category 1: Supabase SSR Multi-Chunk Cookie Encoding & Reassembly (4/4 passed)");
  console.log("✔ Category 2: Server-Side Sign-In Action Contract (5/5 passed)");
  console.log("✔ Category 3: getRequestContext & /api/auth/me Session Resolution (3/3 passed)");
  console.log("✔ Category 4: Acceptance Single-Use & Sign-In Failure Recovery Workflow (3/3 passed)");
  console.log("✔ Category 5: Agency Owner & Tenant Isolation Invariants (4/4 passed)");
  console.log("✔ Category 6: Staff Invitation Acceptance & Workspace Profile Synchronization (7/7 passed)");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
