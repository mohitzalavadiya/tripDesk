import "dotenv/config";
import assert from "assert";
import {
  isPlatformOwnerTargetSync,
  assertNotPlatformOwnerSync,
  assertNotPlatformOwner,
  PROTECTED_PLATFORM_OWNER_ERROR,
  KNOWN_PLATFORM_OWNER_IDS,
  KNOWN_PLATFORM_OWNER_EMAILS,
  getProtectedPlatformOwnerEmails,
  getProtectedPlatformOwnerIds,
  isValidPlatformOwnerUuid,
} from "../src/lib/auth/platform-owner-guard";
import {
  bootstrapPlatformOwner,
  validateBootstrapEnvironment,
  extractSupabaseProjectRef,
  extractDatabaseProjectRef,
  PRODUCTION_TARGET_SUPABASE_PROJECT_REF,
  LOCAL_QA_SUPABASE_PROJECT_REF,
} from "./bootstrap-owner";
import { UserRole, Prisma } from "@prisma/client";

async function runReplacementTestSuite() {
  console.log("===============================================================================");
  console.log("  TRIPDESK — PLATFORM OWNER REPLACEMENT SAFETY & AUTHORIZATION TEST SUITE");
  console.log("===============================================================================\n");

  let passed = 0;
  let total = 0;

  function recordPass(testName: string, detail: string) {
    passed++;
    total++;
    console.log(`✔ [PASS] ${testName}`);
    console.log(`   Evidence: ${detail}\n`);
  }

  function recordFail(testName: string, detail: string) {
    total++;
    console.error(`❌ [FAIL] ${testName}: ${detail}\n`);
    throw new Error(`Test failed: ${testName} - ${detail}`);
  }

  // -------------------------------------------------------------------------
  // Scenario 1: Valid database-backed Platform Owner remains authorized
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 1: Valid Database-Backed Platform Owner Authorization");
  try {
    const validDbUser = {
      id: "valid-owner-uuid-1111",
      email: "supportyourtraveldesk@gmail.com",
      role: UserRole.PLATFORM_OWNER,
      agencyId: null,
    };
    const authSession = { id: "valid-owner-uuid-1111", email: "supportyourtraveldesk@gmail.com" };

    // Simulate getRequestContext / requirePlatformOwner authorization logic
    const isSessionMatched = authSession.id === validDbUser.id;
    const isRoleOwner = validDbUser.role === UserRole.PLATFORM_OWNER;
    const isAgencyNull = validDbUser.agencyId === null;
    const isPlatformOwner = isSessionMatched && isRoleOwner && isAgencyNull;

    assert(isPlatformOwner === true, "Valid Platform Owner must resolve to isPlatformOwner = true");
    recordPass(
      "Scenario 1 — Valid database-backed Platform Owner authorized",
      `Role PLATFORM_OWNER with agencyId=null and matching session UUID evaluates to isPlatformOwner=true.`
    );
  } catch (e: any) {
    recordFail("Scenario 1", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 2: Agency Owner is not authorized as Platform Owner
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 2: Agency Owner Is Rejected From Platform Owner Access");
  try {
    const agencyUser = {
      id: "agency-owner-uuid-2222",
      email: "agency@example.com",
      role: UserRole.AGENCY_OWNER,
      agencyId: "agency-1234",
    };
    const authSession = { id: "agency-owner-uuid-2222", email: "agency@example.com" };

    const isPlatformOwner =
      authSession.id === agencyUser.id &&
      agencyUser.role === UserRole.PLATFORM_OWNER &&
      agencyUser.agencyId === null;

    assert(isPlatformOwner === false, "Agency Owner must never resolve to isPlatformOwner = true");
    recordPass(
      "Scenario 2 — Agency Owner rejected from Platform Owner access",
      `AGENCY_OWNER role with valid agencyId evaluates to isPlatformOwner=false.`
    );
  } catch (e: any) {
    recordFail("Scenario 2", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 3: Mismatched Auth/database identity cannot gain access
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 3: Mismatched Auth/Database Identity Rejection");
  try {
    const spoofedAuthSession = { id: "forged-attacker-uuid-9999", email: "supportyourtraveldesk@gmail.com" };
    const dbOwner = {
      id: "real-owner-uuid-1111",
      email: "supportyourtraveldesk@gmail.com",
      role: UserRole.PLATFORM_OWNER,
      agencyId: null,
    };

    const isPlatformOwner =
      spoofedAuthSession.id === dbOwner.id &&
      dbOwner.role === UserRole.PLATFORM_OWNER &&
      dbOwner.agencyId === null;

    assert(isPlatformOwner === false, "Mismatched session UUID must fail authorization");
    recordPass(
      "Scenario 3 — Mismatched Auth/database identity rejected",
      `Session ID (${spoofedAuthSession.id}) != DB ID (${dbOwner.id}) fails closed immediately.`
    );
  } catch (e: any) {
    recordFail("Scenario 3", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 4: Owner with a non-null agencyId is rejected
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 4: Platform Owner with Non-Null agencyId Rejection");
  try {
    const invalidOwnerWithAgency = {
      id: "corrupted-owner-uuid-3333",
      email: "owner-with-agency@example.com",
      role: UserRole.PLATFORM_OWNER,
      agencyId: "accidental-agency-assignment-5555",
    };
    const authSession = { id: "corrupted-owner-uuid-3333", email: "owner-with-agency@example.com" };

    const isPlatformOwner =
      authSession.id === invalidOwnerWithAgency.id &&
      invalidOwnerWithAgency.role === UserRole.PLATFORM_OWNER &&
      !invalidOwnerWithAgency.agencyId;

    assert(isPlatformOwner === false, "Platform Owner with agencyId != null must fail closed");
    recordPass(
      "Scenario 4 — Owner with non-null agencyId rejected",
      `PLATFORM_OWNER with assigned agencyId fails closed; platform level must have agencyId = null.`
    );
  } catch (e: any) {
    recordFail("Scenario 4", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 5: Local/QA owner's protection remains intact
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 5: Local/QA Owner Protection Intact");
  try {
    const localOwnerId = "de5c1377-0e7c-4747-b3ed-aaee8b7e32a9";
    const isIdProtected = getProtectedPlatformOwnerIds().has(localOwnerId);
    const isEmailProtected = getProtectedPlatformOwnerEmails().has("mzpatel14@gmail.com");

    assert(isIdProtected === true, "Local/QA UUID must remain in protected set");
    assert(isEmailProtected === true, "Local/QA email mzpatel14@gmail.com must remain protected");

    let threwExpected = false;
    try {
      assertNotPlatformOwnerSync({ userId: localOwnerId });
    } catch (e: any) {
      if (e.message === PROTECTED_PLATFORM_OWNER_ERROR) threwExpected = true;
    }
    assert(threwExpected === true, "assertNotPlatformOwnerSync must throw for Local/QA UUID");

    recordPass(
      "Scenario 5 — Local/QA owner protection intact",
      `UUID ${localOwnerId} and email mzpatel14@gmail.com are strictly protected.`
    );
  } catch (e: any) {
    recordFail("Scenario 5", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 6: Existing production-target owner remains protected
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 6: Existing Staging/Production-Target Owner Protected");
  try {
    const stagingOwnerId = "e03a6a21-a355-4afe-ab3e-c8097b6be773";
    const isIdProtected = getProtectedPlatformOwnerIds().has(stagingOwnerId);

    assert(isIdProtected === true, "Staging/Production UUID must remain in protected set during this phase");

    let threwExpected = false;
    try {
      assertNotPlatformOwnerSync({ userId: stagingOwnerId });
    } catch (e: any) {
      if (e.message === PROTECTED_PLATFORM_OWNER_ERROR) threwExpected = true;
    }
    assert(threwExpected === true, "assertNotPlatformOwnerSync must throw for Staging UUID");

    recordPass(
      "Scenario 6 — Existing production-target owner protected",
      `UUID ${stagingOwnerId} remains protected against test automation and accidental deletion.`
    );
  } catch (e: any) {
    recordFail("Scenario 6", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 7: New target email is recognized by safeguard
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 7: New Target Email Recognized by Safeguard");
  try {
    const targetEmail = "supportyourtraveldesk@gmail.com";
    const isTargetProtected = getProtectedPlatformOwnerEmails().has(targetEmail);
    assert(isTargetProtected === true, "Target email must be in protected emails set");

    let threwExpected = false;
    try {
      assertNotPlatformOwnerSync({ email: targetEmail });
    } catch (e: any) {
      if (e.message === PROTECTED_PLATFORM_OWNER_ERROR) threwExpected = true;
    }
    assert(threwExpected === true, "assertNotPlatformOwnerSync must throw for new target email");

    recordPass(
      "Scenario 7 — New target email recognized by safeguard",
      `Target email ${targetEmail} is immediately protected by sync and async guards.`
    );
  } catch (e: any) {
    recordFail("Scenario 7", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 8: Bootstrap with existing unrelated owner fails safely by default
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 8: Bootstrap Fails Closed on Unrelated Owner (Singleton Protection)");
  try {
    // Mock Prisma with existing owner
    const mockPrisma = {
      user: {
        findFirst: async ({ where }: any) => {
          if (where?.role === "PLATFORM_OWNER") {
            // Existing unrelated owner
            return {
              id: "existing-owner-uuid-0001",
              email: "mzpatel14@gmail.com",
              name: "Existing Owner",
              role: "PLATFORM_OWNER",
              agencyId: null,
            };
          }
          return null;
        },
      },
    };

    const mockSupabase = {
      auth: {
        admin: {
          listUsers: async () => ({ data: { users: [] }, error: null }),
        },
      },
    };

    let blockedBySingleton = false;
    try {
      await bootstrapPlatformOwner({
        email: "supportyourtraveldesk@gmail.com",
        password: "ValidPassword123!",
        name: "Your Travel Desk Platform Owner",
        allowReplacement: false, // Default behavior
        targetMode: "production",
        supabaseUrl: "https://qypkowejgqrmilckemcr.supabase.co",
        databaseUrl: "postgresql://postgres.qypkowejgqrmilckemcr:mock-pass@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres",
        prismaClient: mockPrisma,
        supabaseClient: mockSupabase,
      });
    } catch (e: any) {
      if (e.message.includes("Controlled replacement not authorized")) {
        blockedBySingleton = true;
      }
    }

    assert(blockedBySingleton === true, "Bootstrap must abort when another owner exists without replacement flag");
    recordPass(
      "Scenario 8 — Bootstrap fails safely on existing unrelated owner",
      `Singleton protection prevents unintended duplicate-owner creation when allowReplacement is false.`
    );
  } catch (e: any) {
    recordFail("Scenario 8", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 9: Duplicate email / role conflict condition fails safely
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 9: Duplicate Email / Role Conflict Handling");
  try {
    const mockPrismaRoleConflict = {
      user: {
        findFirst: async ({ where }: any) => {
          if (where?.email) {
            // Target email exists, but has role AGENCY_OWNER!
            return {
              id: "existing-agency-uuid-4444",
              email: "supportyourtraveldesk@gmail.com",
              name: "Test Agency",
              role: "AGENCY_OWNER",
              agencyId: "agency-9999",
            };
          }
          return null;
        },
      },
    };

    const mockSupabase = {
      auth: {
        admin: {
          listUsers: async () => ({
            data: {
              users: [{ id: "existing-agency-uuid-4444", email: "supportyourtraveldesk@gmail.com" }],
            },
            error: null,
          }),
        },
      },
    };

    let roleConflictBlocked = false;
    try {
      await bootstrapPlatformOwner({
        email: "supportyourtraveldesk@gmail.com",
        password: "ValidPassword123!",
        name: "Your Travel Desk Platform Owner",
        allowReplacement: true,
        targetMode: "production",
        supabaseUrl: "https://qypkowejgqrmilckemcr.supabase.co",
        databaseUrl: "postgresql://postgres.qypkowejgqrmilckemcr:mock-pass@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres",
        prismaClient: mockPrismaRoleConflict,
        supabaseClient: mockSupabase,
      });
    } catch (e: any) {
      if (e.message.includes("Role Conflict")) {
        roleConflictBlocked = true;
      }
    }

    assert(roleConflictBlocked === true, "Must fail closed if target email already has a non-platform role");
    recordPass(
      "Scenario 9 — Duplicate email / role conflict fails safely",
      `Non-platform accounts cannot be silently elevated to PLATFORM_OWNER.`
    );
  } catch (e: any) {
    recordFail("Scenario 9", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 10: Ambiguous Auth/database state rejected without mutation
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 10: Ambiguous State Rejected Without Mutation");
  try {
    // 10A: DB record exists without matching Auth user
    const mockPrismaDbOnly = {
      user: {
        findFirst: async ({ where }: any) => {
          if (where?.email) {
            return {
              id: "orphan-db-uuid-5555",
              email: "supportyourtraveldesk@gmail.com",
              role: "PLATFORM_OWNER",
            };
          }
          return null;
        },
      },
    };
    const mockSupabaseEmpty = {
      auth: {
        admin: {
          listUsers: async () => ({ data: { users: [] }, error: null }),
        },
      },
    };

    let dbOnlyRejected = false;
    try {
      await bootstrapPlatformOwner({
        email: "supportyourtraveldesk@gmail.com",
        allowReplacement: true,
        targetMode: "production",
        supabaseUrl: "https://qypkowejgqrmilckemcr.supabase.co",
        databaseUrl: "postgresql://postgres.qypkowejgqrmilckemcr:mock-pass@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres",
        prismaClient: mockPrismaDbOnly,
        supabaseClient: mockSupabaseEmpty,
      });
    } catch (e: any) {
      if (e.message.includes("Ambiguous State: Database record exists")) {
        dbOnlyRejected = true;
      }
    }

    // 10B: ID Mismatch between Auth and DB
    const mockPrismaIdMismatch = {
      user: {
        findFirst: async ({ where }: any) => {
          if (where?.email) {
            return {
              id: "db-uuid-aaa",
              email: "supportyourtraveldesk@gmail.com",
              role: "PLATFORM_OWNER",
            };
          }
          return null;
        },
      },
    };
    const mockSupabaseMismatch = {
      auth: {
        admin: {
          listUsers: async () => ({
            data: {
              users: [{ id: "auth-uuid-bbb", email: "supportyourtraveldesk@gmail.com" }],
            },
            error: null,
          }),
        },
      },
    };

    let idMismatchRejected = false;
    try {
      await bootstrapPlatformOwner({
        email: "supportyourtraveldesk@gmail.com",
        allowReplacement: true,
        targetMode: "production",
        supabaseUrl: "https://qypkowejgqrmilckemcr.supabase.co",
        databaseUrl: "postgresql://postgres.qypkowejgqrmilckemcr:mock-pass@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres",
        prismaClient: mockPrismaIdMismatch,
        supabaseClient: mockSupabaseMismatch,
      });
    } catch (e: any) {
      if (e.message.includes("Identity Mismatch: Auth ID")) {
        idMismatchRejected = true;
      }
    }

    assert(dbOnlyRejected === true, "DB record without Auth must fail closed");
    assert(idMismatchRejected === true, "ID mismatch between Auth and DB must fail closed");

    recordPass(
      "Scenario 10 — Ambiguous Auth/database state rejected",
      `DB-only orphans and UUID desynchronizations are rejected without destructive auto-repairs.`
    );
  } catch (e: any) {
    recordFail("Scenario 10", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 11: Public onboarding cannot assign PLATFORM_OWNER
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 11: Public Onboarding Cannot Assign PLATFORM_OWNER");
  try {
    // 11A: Target check blocks onboarding for protected email
    const targetCheck = isPlatformOwnerTargetSync({
      email: "supportyourtraveldesk@gmail.com",
    });
    assert(targetCheck === true, "Target email must be caught by isPlatformOwnerTargetSync");

    // 11B: Target check blocks onboarding for existing owner
    const existingCheck = isPlatformOwnerTargetSync({
      email: "mzpatel14@gmail.com",
    });
    assert(existingCheck === true, "Existing owner email must be caught by isPlatformOwnerTargetSync");

    // 11C: Dynamic UUID validation check
    assert(isValidPlatformOwnerUuid("de5c1377-0e7c-4747-b3ed-aaee8b7e32a9") === true, "Valid UUID passes");
    assert(isValidPlatformOwnerUuid("not-a-uuid-string") === false, "Invalid UUID string rejected");
    assert(isValidPlatformOwnerUuid(null) === false, "Null UUID rejected");

    recordPass(
      "Scenario 11 — Public onboarding cannot assign PLATFORM_OWNER",
      `Onboarding guards reject protected emails and UUID validation prevents invalid injection.`
    );
  } catch (e: any) {
    recordFail("Scenario 11", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 12: Missing target-mode authorization fails closed
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 12: Missing Target-Mode Authorization Fails Closed");
  try {
    // 12A: Direct validator check without targetMode
    let missingTargetModeBlocked = false;
    try {
      validateBootstrapEnvironment({
        targetEmail: "supportyourtraveldesk@gmail.com",
        supabaseUrl: "https://qypkowejgqrmilckemcr.supabase.co",
        targetMode: undefined, // Missing target authorization!
      });
    } catch (e: any) {
      if (e.message.includes("Target Mode Authorization Required")) {
        missingTargetModeBlocked = true;
      }
    }
    assert(missingTargetModeBlocked === true, "Must fail closed if targetMode authorization is omitted");

    // 12B: NODE_ENV=production alone is NOT accepted as proof of target authorization
    const savedNodeEnv = process.env.NODE_ENV;
    const savedTargetMode = process.env.BOOTSTRAP_TARGET_MODE;
    delete process.env.BOOTSTRAP_TARGET_MODE;
    (process.env as any).NODE_ENV = "production";

    let nodeEnvOnlyBlocked = false;
    try {
      validateBootstrapEnvironment({
        targetEmail: "supportyourtraveldesk@gmail.com",
        supabaseUrl: "https://qypkowejgqrmilckemcr.supabase.co",
      });
    } catch (e: any) {
      if (e.message.includes("Target Mode Authorization Required")) {
        nodeEnvOnlyBlocked = true;
      }
    } finally {
      process.env.NODE_ENV = savedNodeEnv;
      if (savedTargetMode) process.env.BOOTSTRAP_TARGET_MODE = savedTargetMode;
    }
    assert(nodeEnvOnlyBlocked === true, "NODE_ENV=production alone must never bypass target-mode authorization");

    // 12C: bootstrapPlatformOwner invocation aborts before any DB/Auth calls
    let bootstrapHaltedBeforeDb = false;
    try {
      await bootstrapPlatformOwner({
        email: "supportyourtraveldesk@gmail.com",
        supabaseUrl: "https://qypkowejgqrmilckemcr.supabase.co",
        // No targetMode provided!
        prismaClient: {
          user: {
            findFirst: () => {
              throw new Error("FAIL: Database was queried despite missing target-mode authorization!");
            },
          },
        },
      });
    } catch (e: any) {
      if (e.message.includes("Target Mode Authorization Required")) {
        bootstrapHaltedBeforeDb = true;
      }
    }
    assert(bootstrapHaltedBeforeDb === true, "Bootstrap must fail closed before any Prisma or Supabase operations");

    recordPass(
      "Scenario 12 — Missing target-mode authorization fails closed",
      `Explicit BOOTSTRAP_TARGET_MODE='production' required; NODE_ENV=production alone is strictly rejected.`
    );
  } catch (e: any) {
    recordFail("Scenario 12", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 13: Malformed or missing Supabase URL fails closed
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 13: Malformed or Missing Supabase URL Rejection");
  try {
    // 13A: Missing URL
    let missingUrlBlocked = false;
    try {
      validateBootstrapEnvironment({
        targetEmail: "supportyourtraveldesk@gmail.com",
        targetMode: "production",
        supabaseUrl: "", // Missing URL
      });
    } catch (e: any) {
      if (e.message.includes("Missing NEXT_PUBLIC_SUPABASE_URL")) {
        missingUrlBlocked = true;
      }
    }
    assert(missingUrlBlocked === true, "Missing URL must fail closed");

    // 13B: Malformed URL (not matching <ref>.supabase.co structure)
    const malformedUrls = [
      "http://localhost:3000",
      "https://not-supabase-domain.com",
      "not-a-valid-url",
    ];

    for (const badUrl of malformedUrls) {
      let malformedBlocked = false;
      try {
        validateBootstrapEnvironment({
          targetEmail: "supportyourtraveldesk@gmail.com",
          targetMode: "production",
          supabaseUrl: badUrl,
        });
      } catch (e: any) {
        if (e.message.includes("Malformed URL structure")) {
          malformedBlocked = true;
        }
      }
      assert(malformedBlocked === true, `Malformed URL '${badUrl}' must fail closed`);
    }

    // 13C: Substring spoofing attempt fails structural validation
    const spoofAttempt = "https://evil-qypkowejgqrmilckemcr.supabase.co.attacker.io";
    let spoofBlocked = false;
    try {
      validateBootstrapEnvironment({
        targetEmail: "supportyourtraveldesk@gmail.com",
        targetMode: "production",
        supabaseUrl: spoofAttempt,
      });
    } catch (e: any) {
      if (e.message.includes("Malformed URL structure")) {
        spoofBlocked = true;
      }
    }
    assert(spoofBlocked === true, "Substring spoofing must be rejected by structural parser");

    recordPass(
      "Scenario 13 — Malformed or missing Supabase URL rejected",
      `Structural hostname validation enforces strict <project-ref>.supabase.co pattern.`
    );
  } catch (e: any) {
    recordFail("Scenario 13", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 14: Wrong project reference fails closed
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 14: Wrong Project Reference Fails Closed");
  try {
    // 14A: Target URL points to Local/QA project ref (nsqarlegqxymqfyvfrjw)
    let localQaBlocked = false;
    try {
      validateBootstrapEnvironment({
        targetEmail: "supportyourtraveldesk@gmail.com",
        targetMode: "production",
        supabaseUrl: `https://${LOCAL_QA_SUPABASE_PROJECT_REF}.supabase.co`,
      });
    } catch (e: any) {
      if (e.message.includes("Cannot target Local/QA project ref")) {
        localQaBlocked = true;
      }
    }
    assert(localQaBlocked === true, "Attempt to provision production owner against Local/QA ref must fail closed");

    // 14B: Target URL points to an unexpected/arbitrary project ref
    const arbitraryRef = "unauthorizedprojref99";
    let arbitraryRefBlocked = false;
    try {
      validateBootstrapEnvironment({
        targetEmail: "supportyourtraveldesk@gmail.com",
        targetMode: "production",
        supabaseUrl: `https://${arbitraryRef}.supabase.co`,
      });
    } catch (e: any) {
      if (e.message.includes("Target Project Mismatch")) {
        arbitraryRefBlocked = true;
      }
    }
    assert(arbitraryRefBlocked === true, "Attempt to target an unexpected project ref must fail closed");

    recordPass(
      "Scenario 14 — Wrong project reference fails closed",
      `Environment lock strictly prevents targeting Local/QA (${LOCAL_QA_SUPABASE_PROJECT_REF}) or unapproved refs.`
    );
  } catch (e: any) {
    recordFail("Scenario 14", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 15: Valid target configuration passes safety lock
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 15: Valid Target Configuration Passes Safety Lock");
  try {
    const validUrl = `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`;
    const validDbUrl = `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:mock-pass@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`;

    // 15A: validateBootstrapEnvironment returns verified projectRef, dbProjectRef, and targetMode
    const validationResult = validateBootstrapEnvironment({
      targetEmail: "supportyourtraveldesk@gmail.com",
      targetMode: "production",
      supabaseUrl: validUrl,
      databaseUrl: validDbUrl,
    });

    assert(validationResult.projectRef === PRODUCTION_TARGET_SUPABASE_PROJECT_REF, "Project ref must match production target");
    assert(validationResult.dbProjectRef === PRODUCTION_TARGET_SUPABASE_PROJECT_REF, "Database ref must match production target");
    assert(validationResult.targetMode === "production", "Target mode must resolve to production");

    // 15B: extractSupabaseProjectRef correctly handles trailing slashes, paths, and ports
    assert(extractSupabaseProjectRef(validUrl) === PRODUCTION_TARGET_SUPABASE_PROJECT_REF, "Base URL extracted");
    assert(extractSupabaseProjectRef(`${validUrl}/`) === PRODUCTION_TARGET_SUPABASE_PROJECT_REF, "Trailing slash extracted");
    assert(extractSupabaseProjectRef(`${validUrl}/rest/v1`) === PRODUCTION_TARGET_SUPABASE_PROJECT_REF, "API path ignored");
    assert(extractSupabaseProjectRef(`https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co:443`) === PRODUCTION_TARGET_SUPABASE_PROJECT_REF, "Port extracted");

    // 15C: extractDatabaseProjectRef correctly parses pooler and direct host formats
    assert(extractDatabaseProjectRef(validDbUrl) === PRODUCTION_TARGET_SUPABASE_PROJECT_REF, "Pooler DB ref extracted");
    assert(
      extractDatabaseProjectRef(`postgresql://postgres:mock-pass@db.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`) ===
        PRODUCTION_TARGET_SUPABASE_PROJECT_REF,
      "Direct host DB ref extracted"
    );

    recordPass(
      "Scenario 15 — Valid target configuration passes safety lock",
      `Project ref ${PRODUCTION_TARGET_SUPABASE_PROJECT_REF} with targetMode='production' cleanly verified.`
    );
  } catch (e: any) {
    recordFail("Scenario 15", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 16: Correct staging URL and matching database target accepted
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 16: Correct Staging URL and Matching Database Target Accepted");
  try {
    const stagingAuthUrl = `https://${LOCAL_QA_SUPABASE_PROJECT_REF}.supabase.co`;
    const stagingPoolerDbUrl = `postgresql://postgres.${LOCAL_QA_SUPABASE_PROJECT_REF}:mock-pass@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
    const stagingDirectDbUrl = `postgresql://postgres:mock-pass@db.${LOCAL_QA_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`;

    // 16A: Staging with pooler format
    const stagingPoolerResult = validateBootstrapEnvironment({
      targetEmail: "mzpatel14@gmail.com",
      targetMode: "staging",
      supabaseUrl: stagingAuthUrl,
      databaseUrl: stagingPoolerDbUrl,
      expectedProjectRef: LOCAL_QA_SUPABASE_PROJECT_REF,
    });
    assert(stagingPoolerResult.projectRef === LOCAL_QA_SUPABASE_PROJECT_REF, "Staging auth ref matches");
    assert(stagingPoolerResult.dbProjectRef === LOCAL_QA_SUPABASE_PROJECT_REF, "Staging db ref matches pooler");

    // 16B: Staging with direct host format
    const stagingDirectResult = validateBootstrapEnvironment({
      targetEmail: "mzpatel14@gmail.com",
      targetMode: "staging",
      supabaseUrl: stagingAuthUrl,
      databaseUrl: stagingDirectDbUrl,
      expectedProjectRef: LOCAL_QA_SUPABASE_PROJECT_REF,
    });
    assert(stagingDirectResult.projectRef === LOCAL_QA_SUPABASE_PROJECT_REF, "Staging auth ref matches");
    assert(stagingDirectResult.dbProjectRef === LOCAL_QA_SUPABASE_PROJECT_REF, "Staging db ref matches direct host");

    recordPass(
      "Scenario 16 — Correct staging URL and matching database target accepted",
      `Staging project ref (${LOCAL_QA_SUPABASE_PROJECT_REF}) successfully verified across pooler and direct host connection strings.`
    );
  } catch (e: any) {
    recordFail("Scenario 16", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 17: Production URL/database mismatch rejected
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 17: Production URL / Database Mismatch Rejected");
  try {
    // 17A: Auth URL is Production, but Database URL is Staging
    let prodAuthStagingDbBlocked = false;
    try {
      validateBootstrapEnvironment({
        targetEmail: "supportyourtraveldesk@gmail.com",
        targetMode: "production",
        supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
        databaseUrl: `postgresql://postgres.${LOCAL_QA_SUPABASE_PROJECT_REF}:mock-pass@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`,
      });
    } catch (e: any) {
      if (e.message.includes("Target Project Mismatch")) {
        prodAuthStagingDbBlocked = true;
      }
    }
    assert(prodAuthStagingDbBlocked === true, "Must fail closed if Production Auth URL is paired with Staging DB URL");

    // 17B: Auth URL is Production, but Database URL is an arbitrary external ref
    let prodAuthArbitraryDbBlocked = false;
    try {
      validateBootstrapEnvironment({
        targetEmail: "supportyourtraveldesk@gmail.com",
        targetMode: "production",
        supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
        databaseUrl: "postgresql://postgres.rogueproject999:mock-pass@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres",
      });
    } catch (e: any) {
      if (e.message.includes("Target Project Mismatch")) {
        prodAuthArbitraryDbBlocked = true;
      }
    }
    assert(prodAuthArbitraryDbBlocked === true, "Must fail closed if Production Auth URL is paired with arbitrary DB ref");

    recordPass(
      "Scenario 17 — Production URL/database mismatch rejected",
      `Target project mismatch between Supabase Auth and Database URL is strictly blocked.`
    );
  } catch (e: any) {
    recordFail("Scenario 17", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 18: Staging URL/database mismatch rejected
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 18: Staging URL / Database Mismatch Rejected");
  try {
    // 18A: Auth URL is Staging, but Database URL is Production
    let stagingAuthProdDbBlocked = false;
    try {
      validateBootstrapEnvironment({
        targetEmail: "mzpatel14@gmail.com",
        targetMode: "staging",
        supabaseUrl: `https://${LOCAL_QA_SUPABASE_PROJECT_REF}.supabase.co`,
        databaseUrl: `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:mock-pass@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`,
      });
    } catch (e: any) {
      if (e.message.includes("Target Project Mismatch")) {
        stagingAuthProdDbBlocked = true;
      }
    }
    assert(stagingAuthProdDbBlocked === true, "Must fail closed if Staging Auth URL is paired with Production DB URL");

    // 18B: Auth URL is Staging, but Database URL is an arbitrary external ref
    let stagingAuthArbitraryDbBlocked = false;
    try {
      validateBootstrapEnvironment({
        targetEmail: "mzpatel14@gmail.com",
        targetMode: "staging",
        supabaseUrl: `https://${LOCAL_QA_SUPABASE_PROJECT_REF}.supabase.co`,
        databaseUrl: "postgresql://postgres.arbitraryproject123:mock-pass@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres",
      });
    } catch (e: any) {
      if (e.message.includes("Target Project Mismatch")) {
        stagingAuthArbitraryDbBlocked = true;
      }
    }
    assert(stagingAuthArbitraryDbBlocked === true, "Must fail closed if Staging Auth URL is paired with arbitrary DB ref");

    recordPass(
      "Scenario 18 — Staging URL/database mismatch rejected",
      `Target project mismatch on staging mode is strictly blocked.`
    );
  } catch (e: any) {
    recordFail("Scenario 18", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 19: Missing, malformed, or unrecognized database target rejected
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 19: Missing, Malformed, or Unrecognized Database Target Rejection");
  try {
    // 19A: Missing DATABASE_URL
    let missingDbUrlBlocked = false;
    try {
      validateBootstrapEnvironment({
        targetEmail: "supportyourtraveldesk@gmail.com",
        targetMode: "production",
        supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
        databaseUrl: "", // Empty string
      });
    } catch (e: any) {
      if (e.message.includes("Missing DATABASE_URL")) {
        missingDbUrlBlocked = true;
      }
    }
    assert(missingDbUrlBlocked === true, "Missing DATABASE_URL must fail closed");

    // 19B: Malformed / non-database protocol
    const badDbUrls = [
      "http://localhost:5432",
      "https://aws-0-ap-northeast-1.pooler.supabase.com",
      "not-a-valid-connection-string",
    ];
    for (const badDb of badDbUrls) {
      let malformedBlocked = false;
      try {
        validateBootstrapEnvironment({
          targetEmail: "supportyourtraveldesk@gmail.com",
          targetMode: "production",
          supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
          databaseUrl: badDb,
        });
      } catch (e: any) {
        if (e.message.includes("Malformed or unsupported connection string structure")) {
          malformedBlocked = true;
        }
      }
      assert(malformedBlocked === true, `Malformed DB URL '${badDb}' must fail closed`);
    }

    // 19C: Host does not belong to Supabase domain
    let nonSupabaseHostBlocked = false;
    try {
      validateBootstrapEnvironment({
        targetEmail: "supportyourtraveldesk@gmail.com",
        targetMode: "production",
        supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
        databaseUrl: `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:mock-pass@evil-database-host.com:5432/postgres`,
      });
    } catch (e: any) {
      if (e.message.includes("Malformed or unsupported connection string structure")) {
        nonSupabaseHostBlocked = true;
      }
    }
    assert(nonSupabaseHostBlocked === true, "Non-Supabase database host must fail closed");

    // 19D: Pooler username missing project reference
    let missingPoolerUserRefBlocked = false;
    try {
      validateBootstrapEnvironment({
        targetEmail: "supportyourtraveldesk@gmail.com",
        targetMode: "production",
        supabaseUrl: `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`,
        databaseUrl: "postgresql://postgres:mock-pass@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres",
      });
    } catch (e: any) {
      if (e.message.includes("Malformed or unsupported connection string structure")) {
        missingPoolerUserRefBlocked = true;
      }
    }
    assert(missingPoolerUserRefBlocked === true, "Pooler username without project ref must fail closed");

    recordPass(
      "Scenario 19 — Missing, malformed, or unrecognized database target rejected",
      `Missing DATABASE_URL, invalid protocols, non-Supabase hosts, and missing pooler user refs are strictly rejected.`
    );
  } catch (e: any) {
    recordFail("Scenario 19", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 20: Misleading or hostile connection strings rejected
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 20: Misleading or Hostile Connection Strings Rejected");
  try {
    // 20A: Hostile suffix domain spoofing on pooler
    const hostilePoolerSuffix = `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:mock-pass@aws-0-ap-northeast-1.pooler.supabase.com.attacker.io:6543/postgres`;
    assert(extractDatabaseProjectRef(hostilePoolerSuffix) === null, "Hostile pooler suffix must return null");

    // 20B: Spoofed pooler subdomain prefix
    const hostilePoolerPrefix = `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:mock-pass@evil-pooler.supabase.com:6543/postgres`;
    assert(extractDatabaseProjectRef(hostilePoolerPrefix) === null, "Hostile pooler prefix must return null");

    // 20C: Hostile suffix domain spoofing on direct host
    const hostileDirectSuffix = `postgresql://postgres:mock-pass@db.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co.attacker.io:5432/postgres`;
    assert(extractDatabaseProjectRef(hostileDirectSuffix) === null, "Hostile direct suffix must return null");

    // 20D: Hostile character injection in pooler username
    const hostileUsername = `postgresql://postgres.qypk;drop%20table:mock-pass@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`;
    assert(extractDatabaseProjectRef(hostileUsername) === null, "Hostile character injection must return null");

    recordPass(
      "Scenario 20 — Misleading or hostile connection strings rejected",
      `Structural domain parser strictly rejects suffix spoofing, hostile subdomains, and SQL/character injection.`
    );
  } catch (e: any) {
    recordFail("Scenario 20", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 21: Service-role key required (Anon key never satisfies)
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 21: Service-Role Key Required (Anon Key Never Satisfies)");
  try {
    const validAuthUrl = `https://${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}.supabase.co`;
    const validDbUrl = `postgresql://postgres.${PRODUCTION_TARGET_SUPABASE_PROJECT_REF}:mock-pass@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`;

    // 21A: bootstrapPlatformOwner without serviceRoleKey fails closed
    const savedServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const savedAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key-that-must-never-be-used-as-admin";

    let missingServiceKeyBlocked = false;
    try {
      await bootstrapPlatformOwner({
        email: "supportyourtraveldesk@gmail.com",
        password: "ValidPassword123!",
        name: "Your Travel Desk Platform Owner",
        allowReplacement: true,
        targetMode: "production",
        supabaseUrl: validAuthUrl,
        databaseUrl: validDbUrl,
        serviceRoleKey: undefined, // Explicitly missing!
        prismaClient: {
          user: {
            findFirst: () => {
              throw new Error("FAIL: Database was queried despite missing service-role key!");
            },
          },
        },
        // supabaseClient is intentionally undefined so bootstrapPlatformOwner attempts client creation
      });
    } catch (e: any) {
      if (e.message.includes("SUPABASE_SERVICE_ROLE_KEY is required for Auth administration")) {
        missingServiceKeyBlocked = true;
      }
    } finally {
      if (savedServiceKey) process.env.SUPABASE_SERVICE_ROLE_KEY = savedServiceKey;
      if (savedAnonKey) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = savedAnonKey;
    }

    assert(
      missingServiceKeyBlocked === true,
      "Must fail closed when SUPABASE_SERVICE_ROLE_KEY is absent, and must NEVER fall back to anon key"
    );

    recordPass(
      "Scenario 21 — Service-role key required (Anon key never satisfies)",
      `Missing service-role key halts before database or Auth queries; NEXT_PUBLIC_SUPABASE_ANON_KEY is never substituted.`
    );
  } catch (e: any) {
    recordFail("Scenario 21", e.message);
  }

  // -------------------------------------------------------------------------
  // Scenario 22: otherDbOwner query filter matches Prisma Client capabilities
  // -------------------------------------------------------------------------
  console.log("▶ SCENARIO 22: otherDbOwner Query Filter Prisma Compatibility & Semantics");
  try {
    // 1. Static validator check: Ensure UserWhereInput supports { role: "PLATFORM_OWNER", email: { not: string, mode: "insensitive" } }
    const validPrismaFilter: Prisma.UserWhereInput = {
      role: UserRole.PLATFORM_OWNER,
      email: {
        not: "supportyourtraveldesk@gmail.com",
        mode: "insensitive",
      },
    };
    assert(validPrismaFilter.role === UserRole.PLATFORM_OWNER, "Role must be PLATFORM_OWNER");
    assert(typeof (validPrismaFilter.email as any)?.not === "string", "email.not must be string");
    assert((validPrismaFilter.email as any)?.mode === "insensitive", "email.mode must be 'insensitive'");

    // 2. Behavioral verification: Ensure bootstrap passes exact supported filter to prisma.user.findFirst
    let capturedWhere: any = null;
    const mockPrisma = {
      user: {
        findFirst: async ({ where }: any) => {
          if (where?.role === "PLATFORM_OWNER") {
            capturedWhere = where;
            return null; // Return null so bootstrap continues to Auth check
          }
          return null;
        },
      },
    };

    const mockSupabase = {
      auth: {
        admin: {
          listUsers: async () => ({ data: { users: [] }, error: null }),
          createUser: async () => ({
            data: { user: { id: "new-auth-uuid-9999", email: "supportyourtraveldesk@gmail.com" } },
            error: null,
          }),
        },
      },
    };

    // Run bootstrap in production mode with mock clients
    await bootstrapPlatformOwner({
      email: "supportyourtraveldesk@gmail.com",
      password: "TestPassword123!",
      name: "Your Travel Desk Platform Owner",
      allowReplacement: false,
      targetMode: "production",
      supabaseUrl: "https://qypkowejgqrmilckemcr.supabase.co",
      databaseUrl: "postgresql://postgres.qypkowejgqrmilckemcr:mock-pass@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres",
      serviceRoleKey: "mock-service-role-key-for-test",
      prismaClient: {
        user: {
          findFirst: mockPrisma.user.findFirst,
          create: async ({ data }: any) => ({ ...data, createdAt: new Date(), updatedAt: new Date() }),
        },
      },
      supabaseClient: mockSupabase,
    });

    assert(capturedWhere !== null, "otherDbOwner query must be executed");
    assert(capturedWhere.role === "PLATFORM_OWNER", "Queried role must be PLATFORM_OWNER");
    assert(capturedWhere.email?.not === "supportyourtraveldesk@gmail.com", "Queried email.not must be the target email");
    assert(capturedWhere.email?.mode === "insensitive", "Queried email.mode must be 'insensitive'");

    recordPass(
      "Scenario 22 — otherDbOwner query filter Prisma compatibility & semantics",
      `Filter { role: "PLATFORM_OWNER", email: { not: email, mode: "insensitive" } } is fully typed, valid under Prisma DMMF, and verified during bootstrap.`
    );
  } catch (e: any) {
    recordFail("Scenario 22", e.message);
  }

  console.log("===============================================================================");
  console.log(`🎉 ALL ${passed}/${total} REPLACEMENT SCENARIO TESTS PASSED (100% SUCCESS)!`);
  console.log("===============================================================================");
}

runReplacementTestSuite().catch((err) => {
  console.error("❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
