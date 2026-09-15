import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { verifyEmailOtpAction } from "../src/actions/auth-actions";
import { provisionOnboardedAgencyOwner } from "../src/lib/services/onboarding-service";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runEmailOtpVerificationQA() {
  console.log("===============================================================================");
  console.log("  TRIPDESK QA-11 — OPTION B EMAIL OTP VERIFICATION QA SUITE");
  console.log("===============================================================================\n");

  let testsPassed = 0;
  let testsTotal = 0;

  function assert(condition: boolean, message: string) {
    testsTotal++;
    if (condition) {
      testsPassed++;
      console.log(`  ✔ [PASS] ${message}`);
    } else {
      console.error(`  ✖ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Database Baseline Invariant Check
    // -------------------------------------------------------------------------
    console.log("▶ TEST 1: Database Baseline Invariant Verification");
    const initialUsers = await prisma.user.findMany();
    const initialAgencies = await prisma.agency.findMany();
    const initialSubs = await prisma.subscription.findMany();
    const initialPayments = await prisma.subscriptionPayment.findMany();

    assert(initialUsers.length === 1, "Exactly 1 User exists (Platform Owner)");
    assert(initialUsers[0].role === "PLATFORM_OWNER", "User role is strictly PLATFORM_OWNER");
    assert(initialUsers[0].email === "mzpatel14@gmail.com", "Platform Owner email matches mzpatel14@gmail.com");
    assert(initialAgencies.length === 0, "Agencies table is strictly 0 (Clean State)");
    assert(initialSubs.length === 0, "Subscriptions table is strictly 0 (Clean State)");
    assert(initialPayments.length === 0, "SubscriptionPayments table is strictly 0 (Clean State)");

    const starterPlan = await prisma.subscriptionPlan.findFirst({
      where: { name: { equals: "Starter", mode: "insensitive" } },
    });
    assert(!!starterPlan && starterPlan.isActive, "Active Starter SubscriptionPlan resolved from catalog");

    // -------------------------------------------------------------------------
    // TEST 2: Input Validation Invariants (verifyEmailOtpAction)
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 2: Input Validation Invariants in verifyEmailOtpAction");

    // 2A: Missing email
    const fdMissingEmail = new FormData();
    fdMissingEmail.append("token", "123456");
    const res1 = await verifyEmailOtpAction({}, fdMissingEmail);
    assert(!!res1.error && res1.error.includes("registered email"), "Rejects missing email");

    // 2B: Invalid email format
    const fdBadEmail = new FormData();
    fdBadEmail.append("email", "invalid-email");
    fdBadEmail.append("token", "123456");
    const res2 = await verifyEmailOtpAction({}, fdBadEmail);
    assert(!!res2.error && res2.error.includes("valid email"), "Rejects malformed email address");

    // 2C: Missing token
    const fdMissingToken = new FormData();
    fdMissingToken.append("email", "agency@test.com");
    const res3 = await verifyEmailOtpAction({}, fdMissingToken);
    assert(!!res3.error && res3.error.includes("verification code"), "Rejects missing token");

    // 2D: Non-numeric token
    const fdAlphaToken = new FormData();
    fdAlphaToken.append("email", "agency@test.com");
    fdAlphaToken.append("token", "12345a");
    const res4 = await verifyEmailOtpAction({}, fdAlphaToken);
    assert(!!res4.error && res4.error.includes("6 to 8 numeric digits"), "Rejects non-numeric characters in OTP token");

    // 2E: Short token (< 6 digits)
    const fdShortToken = new FormData();
    fdShortToken.append("email", "agency@test.com");
    fdShortToken.append("token", "12345");
    const res5 = await verifyEmailOtpAction({}, fdShortToken);
    assert(!!res5.error && res5.error.includes("6 to 8 numeric digits"), "Rejects short OTP token (< 6 digits)");

    // 2F: Long token (> 8 digits)
    const fdLongToken = new FormData();
    fdLongToken.append("email", "agency@test.com");
    fdLongToken.append("token", "123456789");
    const res6 = await verifyEmailOtpAction({}, fdLongToken);
    assert(!!res6.error && res6.error.includes("6 to 8 numeric digits"), "Rejects long OTP token (> 8 digits)");

    // -------------------------------------------------------------------------
    // TEST 3: Onboarding Service Isolation & Unverified Email Gate
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 3: Onboarding Service Unverified Email Security Gate");

    const mockUnverifiedUser: any = {
      id: "mock-unverified-user-id",
      email: "unverified@test.com",
      email_confirmed_at: null,
      confirmed_at: null,
      user_metadata: {
        agencyName: "Unverified Agency",
        agencyPhone: "+919999999999",
        agencyEmail: "unverified@test.com",
        city: "Mumbai",
        ownerName: "Test Owner",
      },
    };

    const mockSupabaseClient: any = {
      auth: {
        signOut: async () => ({ error: null }),
        updateUser: async () => ({ data: {}, error: null }),
      },
    };

    const unverifiedResult = await provisionOnboardedAgencyOwner(mockUnverifiedUser, mockSupabaseClient);
    assert(!unverifiedResult.success, "Rejects unverified Supabase user");
    assert(unverifiedResult.error === "unverified_account", "Returns error code unverified_account");

    // -------------------------------------------------------------------------
    // TEST 4: Onboarding Service Missing Metadata Gate
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 4: Onboarding Service Missing Metadata Rejection");

    const mockMissingMetaUser: any = {
      id: "mock-missing-meta-user-id",
      email: "missingmeta@test.com",
      email_confirmed_at: new Date().toISOString(),
      user_metadata: {},
    };

    const missingMetaResult = await provisionOnboardedAgencyOwner(mockMissingMetaUser, mockSupabaseClient);
    assert(!missingMetaResult.success, "Rejects user with missing onboarding metadata");
    assert(missingMetaResult.error === "missing_onboarding_data", "Returns error code missing_onboarding_data");

    // -------------------------------------------------------------------------
    // TEST 5: Post-Test Database State Invariant (Zero Side-Effects)
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 5: Post-Test Clean Database State Invariant");
    const postUsers = await prisma.user.findMany();
    const postAgencies = await prisma.agency.findMany();
    const postSubs = await prisma.subscription.findMany();
    const postPayments = await prisma.subscriptionPayment.findMany();

    assert(postUsers.length === 1, "Users count remains exactly 1 (Platform Owner)");
    assert(postAgencies.length === 0, "Agencies count remains strictly 0");
    assert(postSubs.length === 0, "Subscriptions count remains strictly 0");
    assert(postPayments.length === 0, "SubscriptionPayments count remains strictly 0");

    console.log("\n===============================================================================");
    console.log(`  ALL ${testsPassed}/${testsTotal} QA-11 ASSERTIONS PASSED SUCCESSFULLY!`);
    console.log("===============================================================================\n");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runEmailOtpVerificationQA().catch((err) => {
  console.error("\n[FATAL] QA-11 Test Execution Failed:", err);
  process.exit(1);
});
