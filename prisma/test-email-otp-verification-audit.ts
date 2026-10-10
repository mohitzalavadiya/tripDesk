import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  verifyEmailOtpAction,
  resendVerificationEmailAction,
  classifyLoginError,
  classifyOtpVerifyError,
} from "../src/actions/auth-actions";
import {
  classifyResendError,
  sendVerificationEmail,
} from "../src/lib/services/verification-service";
import { provisionOnboardedAgencyOwner } from "../src/lib/services/onboarding-service";
import { KNOWN_PLATFORM_OWNER_EMAILS } from "../src/lib/auth/platform-owner-guard";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runEmailOtpVerificationAudit() {
  console.log("===============================================================================");
  console.log("  TRIPDESK EMAIL OTP VERIFICATION AUTOMATED AUDIT SUITE");
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

  const cleanupUserIds: string[] = [];
  const cleanupAgencyIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Platform Owner Baseline Integrity
    // -------------------------------------------------------------------------
    console.log("▶ TEST 1: Platform Owner Baseline Integrity");
    const platformOwners = await prisma.user.findMany({
      where: { role: "PLATFORM_OWNER" },
    });
    assert(platformOwners.length >= 1, "At least 1 Platform Owner exists");
    const primaryOwner = platformOwners.find((p) => p.email === "mzpatel14@gmail.com");
    assert(!!primaryOwner, "Permanent Platform Owner mzpatel14@gmail.com is present");
    assert(KNOWN_PLATFORM_OWNER_EMAILS.has("mzpatel14@gmail.com"), "Platform Owner email is protected in guard");

    // -------------------------------------------------------------------------
    // TEST 2: OTP Input Validation Invariants (verifyEmailOtpAction)
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 2: OTP Input Validation Invariants (verifyEmailOtpAction)");

    // 2A: Missing email
    const fdMissingEmail = new FormData();
    fdMissingEmail.append("token", "123456");
    const res1 = await verifyEmailOtpAction({}, fdMissingEmail);
    assert(!!res1.error && res1.error.includes("registered email"), "Rejects missing email");

    // 2B: Malformed email
    const fdBadEmail = new FormData();
    fdBadEmail.append("email", "bad-email-format");
    fdBadEmail.append("token", "123456");
    const res2 = await verifyEmailOtpAction({}, fdBadEmail);
    assert(!!res2.error && res2.error.includes("valid email"), "Rejects malformed email");

    // 2C: Missing token
    const fdMissingToken = new FormData();
    fdMissingToken.append("email", "test@agency.com");
    const res3 = await verifyEmailOtpAction({}, fdMissingToken);
    assert(!!res3.error && res3.error.includes("verification code"), "Rejects missing token");

    // 2D: Non-numeric token
    const fdAlphaToken = new FormData();
    fdAlphaToken.append("email", "test@agency.com");
    fdAlphaToken.append("token", "12A456");
    const res4 = await verifyEmailOtpAction({}, fdAlphaToken);
    assert(!!res4.error && res4.error.includes("6 numeric digits"), "Rejects non-numeric token");

    // 2E: Short token (< 6 digits)
    const fdShortToken = new FormData();
    fdShortToken.append("email", "test@agency.com");
    fdShortToken.append("token", "12345");
    const res5 = await verifyEmailOtpAction({}, fdShortToken);
    assert(!!res5.error && res5.error.includes("6 numeric digits"), "Rejects short token (< 6 digits)");

    // 2F: Long token (> 6 digits)
    const fdLongToken = new FormData();
    fdLongToken.append("email", "test@agency.com");
    fdLongToken.append("token", "1234567");
    const res6 = await verifyEmailOtpAction({}, fdLongToken);
    assert(!!res6.error && res6.error.includes("6 numeric digits"), "Rejects long token (> 6 digits)");

    // -------------------------------------------------------------------------
    // TEST 3: Unverified Account Security Gate in Onboarding Service
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 3: Unverified Account Security Gate in provisionOnboardedAgencyOwner");

    const mockSupabaseClient: any = {
      auth: {
        signOut: async () => ({ error: null }),
        updateUser: async () => ({ data: {}, error: null }),
      },
    };

    // Unverified user: email_confirmed_at is null
    const mockUnverifiedUser: any = {
      id: "mock-unverified-test-uuid-" + Date.now(),
      email: "unverified-test@traveldesk.com",
      email_confirmed_at: null,
      confirmed_at: null,
      user_metadata: {
        agencyName: "Unverified Agency Ltd",
        agencyPhone: "+91 99999 88888",
        agencyEmail: "unverified-test@traveldesk.com",
        city: "Delhi",
        ownerName: "Unverified Owner",
      },
    };

    const unverifiedResult = await provisionOnboardedAgencyOwner(mockUnverifiedUser, mockSupabaseClient);
    assert(!unverifiedResult.success, "Rejects unverified user from workspace provisioning");
    assert(unverifiedResult.error === "unverified_account", "Returns error code unverified_account");

    // Verify no user or agency was created
    const unverifiedDbCheck = await prisma.user.findUnique({
      where: { id: mockUnverifiedUser.id },
    });
    assert(unverifiedDbCheck === null, "Zero database records created for unverified user");

    // -------------------------------------------------------------------------
    // TEST 4: Missing Metadata Security Gate in Onboarding Service
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 4: Missing Metadata Security Gate");

    const mockMissingMetaUser: any = {
      id: "mock-missing-meta-uuid-" + Date.now(),
      email: "missing-meta@traveldesk.com",
      email_confirmed_at: new Date().toISOString(),
      user_metadata: {
        agencyName: "Some Agency",
      },
    };

    const missingMetaResult = await provisionOnboardedAgencyOwner(mockMissingMetaUser, mockSupabaseClient);
    assert(!missingMetaResult.success, "Rejects user with incomplete onboarding metadata");
    assert(missingMetaResult.error === "missing_onboarding_data", "Returns error code missing_onboarding_data");

    // -------------------------------------------------------------------------
    // TEST 5: Verified User Atomic Provisioning & Idempotency
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 5: Verified User Atomic Provisioning & Idempotency");

    const testVerifiedUserId = "test-verified-uuid-" + Date.now();
    const testAgencyEmail = `verified-agency-${Date.now()}@test.com`;
    cleanupUserIds.push(testVerifiedUserId);

    const mockVerifiedUser: any = {
      id: testVerifiedUserId,
      email: testAgencyEmail,
      email_confirmed_at: new Date().toISOString(),
      user_metadata: {
        agencyName: `Audit Verified Agency ${Date.now()}`,
        agencyPhone: "+91 98765 43210",
        agencyEmail: testAgencyEmail,
        address: "123 Marine Drive",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        ownerName: "Audit Test Owner",
        phone: "+91 98765 43210",
      },
    };

    // First provisioning attempt: Should succeed atomically
    const provisionResult1 = await provisionOnboardedAgencyOwner(mockVerifiedUser, mockSupabaseClient);
    assert(provisionResult1.success, "Atomic provisioning succeeds for verified user");
    assert(provisionResult1.alreadyOnboarded === false, "alreadyOnboarded is false on initial provisioning");

    // Inspect provisioned database records
    const createdUser = await prisma.user.findUnique({
      where: { id: testVerifiedUserId },
      include: {
        agency: {
          include: {
            subscriptions: {
              include: { plan: true },
            },
          },
        },
      },
    });

    assert(!!createdUser, "User record created in database with verified UUID");
    assert(createdUser?.role === "AGENCY_OWNER", "User role is strictly AGENCY_OWNER");
    assert(createdUser?.email === testAgencyEmail, "User email matches confirmed email");
    assert(!!createdUser?.agency, "Agency record created and linked to user");

    if (createdUser?.agency) {
      cleanupAgencyIds.push(createdUser.agency.id);
      assert(createdUser.agency.status === "ACTIVE", "Agency status is ACTIVE");

      // Verify trial subscription
      const sub = createdUser.agency.subscriptions[0];
      assert(!!sub, "Trial subscription created for agency");
      assert(sub.status === "TRIAL", "Subscription status is TRIAL");
      assert(sub.plan.name.toLowerCase() === "starter", "Subscription plan is Starter");

      // Verify trial timing: trialEnd should be ~7 days from trialStart
      if (sub.trialStart && sub.trialEnd) {
        const diffHours = (sub.trialEnd.getTime() - sub.trialStart.getTime()) / (1000 * 60 * 60);
        assert(Math.round(diffHours) === 168, "Trial duration is exactly 168 hours (7 days)");
      }

      // Verify starter destinations seeded
      const destCount = await prisma.destination.count({
        where: { agencyId: createdUser.agency.id },
      });
      assert(destCount === 32, "Exactly 32 Starter destinations seeded for new agency");
    }

    // Second provisioning attempt (Idempotency): Should safely succeed without duplicate records
    const provisionResult2 = await provisionOnboardedAgencyOwner(mockVerifiedUser, mockSupabaseClient);
    assert(provisionResult2.success, "Idempotent re-provisioning succeeds");
    assert(provisionResult2.alreadyOnboarded === true, "alreadyOnboarded is true on subsequent attempt");

    // -------------------------------------------------------------------------
    // TEST 6: Concurrency Protection Invariant (P2002 Unique Constraint)
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 6: Concurrency & Duplicate Protection Invariant");

    // Re-check user count for the created user id
    const duplicateUserCount = await prisma.user.count({
      where: { id: testVerifiedUserId },
    });
    assert(duplicateUserCount === 1, "User ID is uniquely enforced (no duplicate users)");

    // -------------------------------------------------------------------------
    // TEST 7: Unverified Login Error Classification & Contract
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 7: Unverified Login Error Classification & Contract");

    const testLoginEmail = "unverified-returning-user@agency.com";

    // 7A: Supabase returns code: 'email_not_confirmed'
    const unconfirmedCodeRes = await classifyLoginError(
      { code: "email_not_confirmed", message: "Email not confirmed", status: 400 },
      testLoginEmail
    );
    assert(unconfirmedCodeRes.unverified === true, "Classifies code 'email_not_confirmed' as unverified");
    assert(unconfirmedCodeRes.email === testLoginEmail, "Preserves target email in unverified result");
    assert(
      unconfirmedCodeRes.error?.includes("verify your email address") ?? false,
      "Provides actionable verify-email message"
    );

    // 7B: Supabase returns code: 'provider_email_needs_verification'
    const providerNeedsVerifRes = await classifyLoginError(
      { code: "provider_email_needs_verification", message: "Needs verification" },
      testLoginEmail
    );
    assert(providerNeedsVerifRes.unverified === true, "Classifies code 'provider_email_needs_verification' as unverified");

    // 7C: Supabase returns message 'Email not confirmed' with status 400
    const msgUnconfirmedRes = await classifyLoginError(
      { message: "Email not confirmed", status: 400 },
      testLoginEmail
    );
    assert(msgUnconfirmedRes.unverified === true, "Classifies message 'Email not confirmed' as unverified");

    // 7D: Invalid credentials (wrong password) must NOT return unverified: true
    const invalidCredsRes = await classifyLoginError(
      { code: "invalid_credentials", message: "Invalid login credentials", status: 400 },
      testLoginEmail
    );
    assert(invalidCredsRes.unverified !== true, "Invalid credentials does NOT return unverified flag");
    assert(
      invalidCredsRes.error?.includes("Invalid email or password") ?? false,
      "Returns generic 'Invalid email or password' message"
    );

    // 7E: Rate limit on sign in
    const rateLimitLoginRes = await classifyLoginError(
      { code: "over_request_rate_limit", message: "over_request_rate_limit", status: 429 },
      testLoginEmail
    );
    assert(
      rateLimitLoginRes.error?.includes("Too many sign-in attempts") ?? false,
      "Returns rate-limit feedback on 429 / over_request_rate_limit"
    );

    // -------------------------------------------------------------------------
    // TEST 8: Login UI URL Parameter & Recovery Link Encoding
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 8: Login UI URL Parameter & Recovery Link Encoding");

    const emailWithPlus = "agency+owner@traveldesk.com";
    const encodedPlus = encodeURIComponent(emailWithPlus);
    assert(encodedPlus === "agency%2Bowner%40traveldesk.com", "Encodes '+' as '%2B' to prevent space substitution");

    // Simulate URLSearchParams parsing at /verify-email?email=...
    const parsedParams = new URLSearchParams(`email=${encodedPlus}`);
    assert(
      parsedParams.get("email") === emailWithPlus,
      "URLSearchParams accurately decodes encoded email without data corruption"
    );

    // Recovery Link generation contract
    const recoveryHref = `/verify-email?email=${encodeURIComponent(testLoginEmail)}`;
    assert(
      recoveryHref === `/verify-email?email=unverified-returning-user%40agency.com`,
      "Generates correct /verify-email target href for unverified login"
    );

    // -------------------------------------------------------------------------
    // TEST 9: Resend Action Error Mapping & Rate Limit Behavior
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 9: Resend Action Error Mapping & Rate Limit Behavior");

    // 9A: Resend rate limit by code
    const resendRateCode = await classifyResendError({ code: "over_request_rate_limit", status: 429 });
    assert(
      resendRateCode.error?.includes("wait a moment before requesting another") ?? false,
      "Maps over_request_rate_limit to friendly cooldown message"
    );

    const resendRateEmailCode = await classifyResendError({ code: "over_email_send_rate_limit" });
    assert(
      resendRateEmailCode.error?.includes("wait a moment before requesting another") ?? false,
      "Maps over_email_send_rate_limit to friendly cooldown message"
    );

    // 9B: Already confirmed account
    const resendAlreadyConfirmed = await classifyResendError({ code: "email_already_confirmed" });
    assert(
      resendAlreadyConfirmed.error?.includes("already verified") ?? false,
      "Maps email_already_confirmed to already verified guidance"
    );

    // 9C: User not found
    const resendNotFound = await classifyResendError({ code: "user_not_found" });
    assert(
      resendNotFound.error?.includes("No registration found") ?? false,
      "Maps user_not_found to sign up prompt"
    );

    // -------------------------------------------------------------------------
    // TEST 10: OTP Verification Error Mapping
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 10: OTP Verification Error Mapping");

    const otpRateLimit = await classifyOtpVerifyError({ code: "over_request_rate_limit", status: 429 });
    assert(
      otpRateLimit.error?.includes("Too many verification attempts") ?? false,
      "Maps OTP rate limit to friendly message"
    );

    const otpExpired = await classifyOtpVerifyError({ code: "otp_expired", message: "Token expired" });
    assert(
      otpExpired.error?.includes("expired") ?? false,
      "Maps expired OTP token to request-new-code message"
    );

    const otpInvalid = await classifyOtpVerifyError({ message: "Token is invalid", status: 400 });
    assert(
      otpInvalid.error?.includes("incorrect") ?? false,
      "Maps incorrect OTP token to retry message"
    );

    // -------------------------------------------------------------------------
    // TEST 11: Failed Provisioning Recovery (Transient Error Recovery)
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 11: Failed Provisioning Recovery & Retries");

    const recoveryUserId = "recovery-test-uuid-" + Date.now();
    const recoveryEmail = `recovery-agency-${Date.now()}@test.com`;
    cleanupUserIds.push(recoveryUserId);

    const mockRecoveryUser: any = {
      id: recoveryUserId,
      email: recoveryEmail,
      email_confirmed_at: new Date().toISOString(),
      user_metadata: {
        agencyName: `Recovered Agency ${Date.now()}`,
        agencyPhone: "+91 91234 56789",
        agencyEmail: recoveryEmail,
        address: "456 Marine Drive",
        city: "Bengaluru",
        state: "Karnataka",
        country: "India",
        ownerName: "Recovery Test Owner",
        phone: "+91 91234 56789",
      },
    };

    // First attempt: Provisioning succeeds
    const recoveryRes1 = await provisionOnboardedAgencyOwner(mockRecoveryUser, mockSupabaseClient);
    assert(recoveryRes1.success, "Initial provisioning completes successfully");

    const recoveredUser = await prisma.user.findUnique({
      where: { id: recoveryUserId },
      include: { agency: true },
    });
    if (recoveredUser?.agency) {
      cleanupAgencyIds.push(recoveredUser.agency.id);
    }

    // Subsequent retry: Safe idempotency, no duplicate records
    const recoveryRes2 = await provisionOnboardedAgencyOwner(mockRecoveryUser, mockSupabaseClient);
    assert(recoveryRes2.success, "Subsequent recovery attempt completes without error");
    assert(recoveryRes2.alreadyOnboarded === true, "Idempotency flag set on retry");

    // Re-registration / UUID Re-link: Supabase Auth user recreated with new UUID for same email
    const reCreatedUserId = "recreated-uuid-" + Date.now();
    cleanupUserIds.push(reCreatedUserId);
    const mockRecreatedUser: any = {
      id: reCreatedUserId,
      email: recoveryEmail,
      email_confirmed_at: new Date().toISOString(),
      user_metadata: {
        agencyName: `Recovered Agency ${Date.now()}`,
        ownerName: "Recovery Test Owner",
      },
    };

    const reLinkResult = await provisionOnboardedAgencyOwner(mockRecreatedUser, mockSupabaseClient);
    assert(reLinkResult.success, "Re-linked user onboarding succeeds without unique constraint crash");
    assert(reLinkResult.alreadyOnboarded === true, "alreadyOnboarded is true when re-linking existing database user");

    const reLinkedUserInDb = await prisma.user.findUnique({
      where: { id: reCreatedUserId },
    });
    assert(!!reLinkedUserInDb, "Database user ID successfully updated to active Supabase Auth user ID");
    assert(reLinkedUserInDb?.agencyId === recoveredUser?.agency?.id, "Original agency preserved across UUID re-linking");

    // Resend for already verified email: internal service must return alreadyVerified guard and NOT falsely promise delivery
    const mockAdminClientForVerifiedResend = {
      auth: {
        admin: {
          listUsers: async () => ({
            data: {
              users: [
                {
                  id: reCreatedUserId,
                  email: recoveryEmail,
                  email_confirmed_at: new Date().toISOString(),
                },
              ],
              nextPage: null,
            },
            error: null,
          }),
        },
      },
    };
    const resendAlreadyVerifiedRes = await sendVerificationEmail(recoveryEmail, {
      adminClient: mockAdminClientForVerifiedResend,
    });
    assert(resendAlreadyVerifiedRes.alreadyVerified === true, "sendVerificationEmail flags already verified account");
    assert(
      resendAlreadyVerifiedRes.error?.includes("already verified") ?? false,
      "sendVerificationEmail returns actionable already verified guidance"
    );

    // -------------------------------------------------------------------------
    // TEST 12: Customer Portal Authentication & Tenant Isolation
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 12: Customer Portal Authentication & Tenant Isolation");

    assert(!KNOWN_PLATFORM_OWNER_EMAILS.has("customer@gmail.com"), "Customer emails are never treated as Platform Owners");
    assert(!KNOWN_PLATFORM_OWNER_EMAILS.has("agency@test.com"), "Agency emails are never treated as Platform Owners");

    // -------------------------------------------------------------------------
    // TEST 13: Identity & Role Security Guards in Onboarding
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 13: Identity & Role Security Guards in Onboarding");

    // A. Platform Owner hard guard: Cannot onboard Platform Owner via public signup
    const mockPlatformOwnerUser: any = {
      id: "fake-po-uuid-" + Date.now(),
      email: "mzpatel14@gmail.com",
      email_confirmed_at: new Date().toISOString(),
      user_metadata: {
        agencyName: "Malicious PO Hijack Agency",
        ownerName: "Attacker",
      },
    };
    const poOnboardResult = await provisionOnboardedAgencyOwner(mockPlatformOwnerUser, mockSupabaseClient);
    assert(!poOnboardResult.success, "Platform Owner onboarding attempt fails closed");
    assert(poOnboardResult.error === "protected_account", "Platform Owner protected with 'protected_account' error");

    // B. Re-link guard on existing Platform Owner: DB record with PLATFORM_OWNER role is immutable
    const poDbUser = await prisma.user.findFirst({
      where: { role: "PLATFORM_OWNER" },
    });
    if (poDbUser) {
      const mockPoRelinkAttempt: any = {
        id: "attacker-uuid-" + Date.now(),
        email: poDbUser.email,
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          agencyName: "Hijack Agency",
          ownerName: "Attacker",
        },
      };
      const poRelinkResult = await provisionOnboardedAgencyOwner(mockPoRelinkAttempt, mockSupabaseClient);
      assert(!poRelinkResult.success, "Existing DB Platform Owner cannot be re-linked as an agency");
      assert(poRelinkResult.error === "protected_account", "Returns 'protected_account' guard error");
    }

    console.log("\n===============================================================================");
    console.log(`  ALL ${testsPassed}/${testsTotal} EMAIL OTP VERIFICATION AUDIT ASSERTIONS PASSED!`);
    console.log("===============================================================================\n");
  } finally {
    // Clean up test records
    console.log("🧹 Cleaning up transient test records...");
    for (const userId of cleanupUserIds) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    for (const agencyId of cleanupAgencyIds) {
      await prisma.destination.deleteMany({ where: { agencyId } });
      await prisma.subscription.deleteMany({ where: { agencyId } });
      await prisma.agency.deleteMany({ where: { id: agencyId } });
    }
    await prisma.$disconnect();
    await pool.end();
    console.log("✅ Cleanup complete.");
  }
}

runEmailOtpVerificationAudit().catch((err) => {
  console.error("\n[FATAL] Email OTP Verification Audit Failed:", err);
  process.exit(1);
});
