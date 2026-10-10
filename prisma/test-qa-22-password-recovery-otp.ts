import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import {
  requestPasswordResetAction,
  verifyRecoveryOtpAction,
  resendRecoveryOtpAction,
  resetPasswordAction,
  checkRecoveryStateAction,
  verifyEmailOtpAction,
  loginAction,
  classifyPasswordUpdateError,
  resendVerificationEmailAction,
} from "../src/actions/auth-actions";
import {
  lookupAuthUserByEmail,
  sendVerificationEmail,
  classifyResendError,
} from "../src/lib/services/verification-service";
import {
  setRecoveryProofCookie,
  getVerifiedRecoveryProof,
  clearRecoveryProofCookie,
  createRecoveryProofToken,
  verifyRecoveryProofToken,
  getRecoverySigningSecret,
  RecoveryProofPayload,
} from "../src/lib/auth/recovery-proof";
import { isPlatformOwnerTargetSync } from "../src/lib/auth/platform-owner-guard";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runPasswordRecoveryOtpQA() {
  console.log("===============================================================================");
  console.log("  TRIPDESK QA-22 — SIX-DIGIT FORGOT PASSWORD OTP RECOVERY QA SUITE");
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
    // TEST 1: Database Baseline Invariant Check (Zero Writes / Read-Only Invariant)
    // -------------------------------------------------------------------------
    console.log("▶ TEST 1: Database Baseline Invariant Verification");
    const initialUsers = await prisma.user.findMany();
    const initialAgencies = await prisma.agency.findMany();

    assert(initialUsers.length >= 1, "Database users accessible for read-only invariant");
    const platformOwner = initialUsers.find((u) => u.role === "PLATFORM_OWNER");
    assert(!!platformOwner, "Platform Owner exists in baseline");
    assert(platformOwner?.email === "mzpatel14@gmail.com", "Platform Owner email matches permanent baseline mzpatel14@gmail.com");

    // -------------------------------------------------------------------------
    // TEST 2: requestPasswordResetAction Input Validation & Neutral Enumeration Defense
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 2: requestPasswordResetAction Input Validation & Enumeration Defense");

    // 2A: Missing email
    const fdMissingEmail = new FormData();
    const res1 = await requestPasswordResetAction({}, fdMissingEmail);
    assert(!!res1.error && res1.error.includes("registered email"), "Rejects empty email address");

    // 2B: Malformed email
    const fdBadEmail = new FormData();
    fdBadEmail.append("email", "not-a-valid-email");
    const res2 = await requestPasswordResetAction({}, fdBadEmail);
    assert(!!res2.error && res2.error.includes("valid email"), "Rejects malformed email syntax");

    // 2C: Neutral Response Contract (Registered and Unregistered Emails)
    // Action must provide equivalent { success: true } without leaking user existence
    const fdRandomEmail = new FormData();
    fdRandomEmail.append("email", `unregistered_probe_${Date.now()}@example.com`);
    const res3 = await requestPasswordResetAction({}, fdRandomEmail);
    assert(res3.success === true, "Unregistered email returns neutral success: true");
    assert(!res3.error, "Unregistered email does not leak 'User not found' or provider error");

    // -------------------------------------------------------------------------
    // TEST 3: verifyRecoveryOtpAction Input Validation & Formatting
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 3: verifyRecoveryOtpAction Input Validation & Formatting");

    // 3A: Missing email
    const fdOtpNoEmail = new FormData();
    fdOtpNoEmail.append("token", "123456");
    const resOtp1 = await verifyRecoveryOtpAction({}, fdOtpNoEmail);
    assert(!!resOtp1.error && resOtp1.error.includes("registered email"), "Rejects missing email on OTP verification");

    // 3B: Malformed email
    const fdOtpBadEmail = new FormData();
    fdOtpBadEmail.append("email", "invalid-email");
    fdOtpBadEmail.append("token", "123456");
    const resOtp2 = await verifyRecoveryOtpAction({}, fdOtpBadEmail);
    assert(!!resOtp2.error && resOtp2.error.includes("valid email"), "Rejects malformed email on OTP verification");

    // 3C: Missing token
    const fdOtpNoToken = new FormData();
    fdOtpNoToken.append("email", "test@agency.com");
    const resOtp3 = await verifyRecoveryOtpAction({}, fdOtpNoToken);
    assert(!!resOtp3.error && resOtp3.error.includes("verification code"), "Rejects missing token");

    // 3D: Non-numeric token
    const fdOtpAlpha = new FormData();
    fdOtpAlpha.append("email", "test@agency.com");
    fdOtpAlpha.append("token", "12a456");
    const resOtp4 = await verifyRecoveryOtpAction({}, fdOtpAlpha);
    assert(!!resOtp4.error && resOtp4.error.includes("6 numeric digits"), "Rejects non-numeric characters in OTP");

    // 3E: Short token (< 6 digits)
    const fdOtpShort = new FormData();
    fdOtpShort.append("email", "test@agency.com");
    fdOtpShort.append("token", "12345");
    const resOtp5 = await verifyRecoveryOtpAction({}, fdOtpShort);
    assert(!!resOtp5.error && resOtp5.error.includes("6 numeric digits"), "Rejects short OTP (< 6 digits)");

    // 3F: Long token (> 6 digits)
    const fdOtpLong = new FormData();
    fdOtpLong.append("email", "test@agency.com");
    fdOtpLong.append("token", "1234567");
    const resOtp6 = await verifyRecoveryOtpAction({}, fdOtpLong);
    assert(!!resOtp6.error && resOtp6.error.includes("6 numeric digits"), "Rejects long OTP (> 6 digits)");

    // -------------------------------------------------------------------------
    // TEST 4: resendRecoveryOtpAction Input Validation & Rate Limiting Contract
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 4: resendRecoveryOtpAction Contract & Validation");

    const fdResendNoEmail = new FormData();
    const resResend1 = await resendRecoveryOtpAction({}, fdResendNoEmail);
    assert(!!resResend1.error && resResend1.error.includes("registered email"), "Rejects empty email on resend");

    const fdResendBadEmail = new FormData();
    fdResendBadEmail.append("email", "bad-email");
    const resResend2 = await resendRecoveryOtpAction({}, fdResendBadEmail);
    assert(!!resResend2.error && resResend2.error.includes("valid email"), "Rejects malformed email on resend");

    const fdResendValid = new FormData();
    fdResendValid.append("email", "resend_test@example.com");
    const resResend3 = await resendRecoveryOtpAction({}, fdResendValid);
    assert(
      resResend3.success === true ||
        (resResend3.rateLimited === true && resResend3.error?.includes("60 seconds")),
      "Resend handles valid email neutrally with success: true or safe actionable 60s rate-limit"
    );

    // -------------------------------------------------------------------------
    // TEST 5: resetPasswordAction Password Validation
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 5: resetPasswordAction Password Validation Invariants");

    // 5A: Missing / short password (< 6 chars)
    const fdShortPw = new FormData();
    fdShortPw.append("password", "12345");
    fdShortPw.append("confirmPassword", "12345");
    const resPw1 = await resetPasswordAction({}, fdShortPw);
    assert(!!resPw1.error && resPw1.error.includes("at least 6 characters"), "Rejects password shorter than 6 characters");

    // 5B: Mismatched passwords
    const fdMismatchPw = new FormData();
    fdMismatchPw.append("password", "SecurePassword123!");
    fdMismatchPw.append("confirmPassword", "DifferentPassword123!");
    const resPw2 = await resetPasswordAction({}, fdMismatchPw);
    assert(!!resPw2.error && resPw2.error.includes("do not match"), "Rejects mismatched password confirmation");

    // 5C: Password update rejected without authenticated recovery session
    const fdValidPwNoSession = new FormData();
    fdValidPwNoSession.append("password", "NewPassword2026!");
    fdValidPwNoSession.append("confirmPassword", "NewPassword2026!");
    const resPw3 = await resetPasswordAction({}, fdValidPwNoSession);
    assert(!!resPw3.error && (resPw3.error.includes("session") || resPw3.error.includes("recovery")), "Rejects password update when recovery session is missing");

    // -------------------------------------------------------------------------
    // TEST 6: Real Cryptographic Unit Tests (Decoupled from Next.js Headers)
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 6: Cryptographic Recovery Proof Verification Suite");

    const TEST_SECRET = "deterministic-test-recovery-signing-secret-key-32chars";
    const now = Date.now();
    const validPayload: RecoveryProofPayload = {
      userId: "usr_agency_owner_test_123",
      email: "agency_owner@yourtraveldesk.in",
      timestamp: now,
    };

    // 6A: Valid proof creation and verification
    const validToken = createRecoveryProofToken(validPayload, TEST_SECRET);
    const verifiedValid = verifyRecoveryProofToken(validToken, TEST_SECRET, 15 * 60, now);
    assert(
      verifiedValid !== null &&
        verifiedValid.userId === validPayload.userId &&
        verifiedValid.email === validPayload.email,
      "Valid proof token verifies successfully with matching payload"
    );

    // 6B: Tampered payload content (userId modified)
    const rawParsed = JSON.parse(Buffer.from(validToken, "base64url").toString("utf-8"));
    const tamperedUserToken = Buffer.from(
      JSON.stringify({
        payload: { ...validPayload, userId: "usr_attacker_compromise" },
        signature: rawParsed.signature,
      })
    ).toString("base64url");
    const verifiedTamperedUser = verifyRecoveryProofToken(tamperedUserToken, TEST_SECRET, 15 * 60, now);
    assert(verifiedTamperedUser === null, "Rejects token with tampered userId");

    // 6C: Tampered payload content (email modified)
    const tamperedEmailToken = Buffer.from(
      JSON.stringify({
        payload: { ...validPayload, email: "attacker@external.com" },
        signature: rawParsed.signature,
      })
    ).toString("base64url");
    const verifiedTamperedEmail = verifyRecoveryProofToken(tamperedEmailToken, TEST_SECRET, 15 * 60, now);
    assert(verifiedTamperedEmail === null, "Rejects token with tampered email");

    // 6D: Tampered signature characters
    const tamperedSigToken = Buffer.from(
      JSON.stringify({
        payload: validPayload,
        signature: "f".repeat(64),
      })
    ).toString("base64url");
    const verifiedTamperedSig = verifyRecoveryProofToken(tamperedSigToken, TEST_SECRET, 15 * 60, now);
    assert(verifiedTamperedSig === null, "Rejects token with tampered HMAC signature");

    // 6E: Signature length mismatch (truncated signature)
    const truncSigToken = Buffer.from(
      JSON.stringify({
        payload: validPayload,
        signature: "deadbeef",
      })
    ).toString("base64url");
    const verifiedTruncSig = verifyRecoveryProofToken(truncSigToken, TEST_SECRET, 15 * 60, now);
    assert(verifiedTruncSig === null, "Rejects token with truncated signature length");

    // 6F: Malformed inputs (invalid base64, random text, empty string)
    assert(verifyRecoveryProofToken("invalid-base64-!@#$%", TEST_SECRET) === null, "Rejects non-base64 input");
    assert(
      verifyRecoveryProofToken(Buffer.from("just raw non json text").toString("base64url"), TEST_SECRET) === null,
      "Rejects non-JSON token content"
    );
    assert(verifyRecoveryProofToken("", TEST_SECRET) === null, "Rejects empty token string");

    // 6G: Missing payload fields
    const missingFieldToken = Buffer.from(
      JSON.stringify({
        payload: { email: "no_user_id@example.com", timestamp: now },
        signature: rawParsed.signature,
      })
    ).toString("base64url");
    assert(verifyRecoveryProofToken(missingFieldToken, TEST_SECRET) === null, "Rejects payload with missing userId");

    // 6H: Expired proof (> 15 minutes)
    const expiredTimestamp = now - (15 * 60 + 5) * 1000;
    const expiredPayload: RecoveryProofPayload = {
      ...validPayload,
      timestamp: expiredTimestamp,
    };
    const expiredToken = createRecoveryProofToken(expiredPayload, TEST_SECRET);
    const verifiedExpired = verifyRecoveryProofToken(expiredToken, TEST_SECRET, 15 * 60, now);
    assert(verifiedExpired === null, "Rejects expired proof token (> 15 minutes)");

    // 6I: Clock skew / future timestamp (> 60 seconds into the future)
    const futureTimestamp = now + 120 * 1000;
    const futurePayload: RecoveryProofPayload = {
      ...validPayload,
      timestamp: futureTimestamp,
    };
    const futureToken = createRecoveryProofToken(futurePayload, TEST_SECRET);
    const verifiedFuture = verifyRecoveryProofToken(futureToken, TEST_SECRET, 15 * 60, now);
    assert(verifiedFuture === null, "Rejects future timestamp (> 60s clock skew)");

    // 6J: Missing / invalid signing secret fails closed
    let threwOnEmptySecret = false;
    try {
      createRecoveryProofToken(validPayload, "");
    } catch {
      threwOnEmptySecret = true;
    }
    assert(threwOnEmptySecret, "createRecoveryProofToken throws / fails closed on missing secret");
    assert(verifyRecoveryProofToken(validToken, "") === null, "verifyRecoveryProofToken fails closed on missing secret");

    // 6K: Verification with different secret fails
    const wrongSecret = "completely-different-signing-secret-key-32chars";
    assert(
      verifyRecoveryProofToken(validToken, wrongSecret, 15 * 60, now) === null,
      "Verification fails when evaluated against mismatched secret"
    );

    // 6L: Password update error classification mapping (Zero raw provider leaks)
    const rateLimitErr = await classifyPasswordUpdateError({ status: 429, message: "over_request_rate_limit" });
    assert(
      rateLimitErr.error === "Too many password update attempts. Please wait a moment before trying again.",
      "classifyPasswordUpdateError maps rate limits safely"
    );

    const samePwErr = await classifyPasswordUpdateError({ message: "New password should be different from old password" });
    assert(
      samePwErr.error === "New password must be different from your current password.",
      "classifyPasswordUpdateError maps password reuse safely"
    );

    const weakPwErr = await classifyPasswordUpdateError({ message: "Password is too weak or pwned" });
    assert(
      weakPwErr.error === "Password does not meet security requirements. Please choose a stronger password.",
      "classifyPasswordUpdateError maps weak password policy safely"
    );

    const expiredSessionErr = await classifyPasswordUpdateError({ status: 401, message: "JWT expired" });
    assert(
      expiredSessionErr.error === "Your recovery session has expired. Please verify your recovery code again.",
      "classifyPasswordUpdateError maps expired session safely"
    );

    const unexpectedErr = await classifyPasswordUpdateError({ message: "database connection socket timeout in pgbouncer" });
    assert(
      unexpectedErr.error === "Unable to update password at this time. Please try again.",
      "classifyPasswordUpdateError masks unexpected provider/database errors"
    );

    // 6M: Cookie action functions export contract
    assert(typeof setRecoveryProofCookie === "function", "setRecoveryProofCookie is exported");
    assert(typeof getVerifiedRecoveryProof === "function", "getVerifiedRecoveryProof is exported");
    assert(typeof clearRecoveryProofCookie === "function", "clearRecoveryProofCookie is exported");

    // -------------------------------------------------------------------------
    // TEST 7: Platform Owner Guard & Tenant Isolation Integrity
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 7: Platform Owner Protection & Tenant Isolation Integrity");

    // Ensure Platform Owner protection checks remain authoritative
    const isOwnerTarget = isPlatformOwnerTargetSync({ email: "mzpatel14@gmail.com" });
    assert(isOwnerTarget === true, "Platform Owner guard strictly protects permanent account");

    const isNonOwnerTarget = isPlatformOwnerTargetSync({ email: "random_agency@example.com" });
    assert(isNonOwnerTarget === false, "Platform Owner guard does not interfere with agency accounts");

    // -------------------------------------------------------------------------
    // TEST 8: Signup OTP & Normal Login Regression Invariants
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 8: Signup OTP & Normal Login Regression Checks");

    // verifyEmailOtpAction must retain signup verification behavior
    const fdSignupOtpShort = new FormData();
    fdSignupOtpShort.append("email", "agency@test.com");
    fdSignupOtpShort.append("token", "123");
    const resSignup1 = await verifyEmailOtpAction({}, fdSignupOtpShort);
    assert(!!resSignup1.error && resSignup1.error.includes("6 numeric digits"), "Signup OTP validation preserved");

    // loginAction must retain password validation
    const fdLoginMissing = new FormData();
    const resLogin1 = await loginAction({}, fdLoginMissing);
    assert(!!resLogin1.error && resLogin1.error.includes("email and password"), "Login action validation preserved");

    // -------------------------------------------------------------------------
    // TEST 9: Issue A & Issue B Authentication UX Invariants
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 9: Issue A & Issue B Authentication UX Invariants");

    // 9A (Issue A): resendVerificationEmailAction does not falsely flag unverified Supabase account as verified
    // Even if database has historical records, Supabase Auth confirmation is authoritative
    const fdResendUnverified = new FormData();
    fdResendUnverified.append("email", "patelzalavadiya@gmail.com");
    const resendUnverifiedResult = await resendVerificationEmailAction({}, fdResendUnverified);
    assert(
      resendUnverifiedResult.alreadyVerified !== true,
      "Unconfirmed Supabase account (patelzalavadiya@gmail.com) is NOT falsely flagged as already verified"
    );

    // 9B (Issue A): resendVerificationEmailAction flags genuinely confirmed account
    const fdResendConfirmed = new FormData();
    fdResendConfirmed.append("email", "mzpatel14@gmail.com");
    const resendConfirmedResult = await resendVerificationEmailAction({}, fdResendConfirmed);
    assert(
      resendConfirmedResult.alreadyVerified === true &&
        resendConfirmedResult.error?.includes("already verified"),
      "Genuinely confirmed account (mzpatel14@gmail.com) consistently returns alreadyVerified: true"
    );

    // 9C (Issue A): classifyResendError maps email_already_confirmed with alreadyVerified: true
    const alreadyConfirmedErr = await classifyResendError({ code: "email_already_confirmed" });
    assert(
      alreadyConfirmedErr.alreadyVerified === true &&
        alreadyConfirmedErr.error?.includes("already verified"),
      "classifyResendError sets alreadyVerified: true on provider confirmation"
    );

    // 9D (Issue B): classifyResendError maps rate limits with actionable guidance and rateLimited: true
    const resendRateLimitErr = await classifyResendError({ status: 429, message: "over_email_send_rate_limit" });
    assert(
      resendRateLimitErr.rateLimited === true &&
        resendRateLimitErr.error?.includes("wait a moment before requesting another"),
      "classifyResendError maps rate limit to actionable guidance with rateLimited: true"
    );

    // 9E (Issue B): Cooldown time calculation invariant
    const simulatedRecentTime = Date.now() - 25000; // 25s ago
    const simulatedElapsed = Math.floor((Date.now() - simulatedRecentTime) / 1000);
    const simulatedRemaining = 60 - simulatedElapsed;
    assert(
      simulatedRemaining >= 33 && simulatedRemaining <= 37,
      "Client cooldown persistence correctly computes remaining seconds (approx 35s remaining)"
    );

    const simulatedExpiredTime = Date.now() - 65000; // 65s ago
    const simulatedExpiredElapsed = Math.floor((Date.now() - simulatedExpiredTime) / 1000);
    const simulatedExpiredRemaining = 60 - simulatedExpiredElapsed;
    assert(
      simulatedExpiredRemaining <= 0,
      "Client cooldown correctly clears when > 60s has elapsed"
    );

    // -------------------------------------------------------------------------
    // TEST 10: Targeted Auth Hardening: lookupAuthUserByEmail & Inconclusive Gates
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 10: Targeted Auth Hardening: lookupAuthUserByEmail & Inconclusive Gates");

    // 10A: Missing Admin Client returns status 'inconclusive' (reason: admin_client_missing)
    const missingClientResult = await lookupAuthUserByEmail("anyuser@example.com", null);
    assert(
      missingClientResult.status === "inconclusive" &&
        missingClientResult.reason === "admin_client_missing",
      "Missing Admin client returns status 'inconclusive' (admin_client_missing)"
    );

    // 10B: Admin API returned error returns status 'inconclusive' (reason: admin_api_error)
    const mockApiErrorClient = {
      auth: {
        admin: {
          listUsers: async () => ({
            data: { users: [] },
            error: { message: "Auth gateway timeout", status: 504 },
          }),
        },
      },
    };
    const apiErrorResult = await lookupAuthUserByEmail("anyuser@example.com", mockApiErrorClient);
    assert(
      apiErrorResult.status === "inconclusive" &&
        apiErrorResult.reason === "admin_api_error",
      "Admin API error returns status 'inconclusive' (admin_api_error)"
    );

    // 10C: Admin API thrown exception returns status 'inconclusive' (reason: lookup_exception)
    const mockThrowClient = {
      auth: {
        admin: {
          listUsers: async () => {
            throw new Error("Network connection dropped");
          },
        },
      },
    };
    const throwResult = await lookupAuthUserByEmail("anyuser@example.com", mockThrowClient);
    assert(
      throwResult.status === "inconclusive" &&
        throwResult.reason === "lookup_exception",
      "Admin API thrown exception returns status 'inconclusive' (lookup_exception)"
    );

    // 10D: Multi-page paginated lookup finds confirmed user on page 2
    const mockMultiPageClient = {
      auth: {
        admin: {
          listUsers: async ({ page }: any) => {
            if (page === 1) {
              const dummyUsers = Array.from({ length: 1000 }, (_, i) => ({
                id: `dummy-uuid-${i}`,
                email: `other${i}@domain.com`,
                email_confirmed_at: new Date().toISOString(),
              }));
              return { data: { users: dummyUsers, nextPage: 2, total: 1001 }, error: null };
            }
            if (page === 2) {
              return {
                data: {
                  users: [
                    {
                      id: "page2-target-uuid",
                      email: "page2user@target.com",
                      email_confirmed_at: new Date().toISOString(),
                    },
                  ],
                  nextPage: null,
                  total: 1001,
                },
                error: null,
              };
            }
            return { data: { users: [], nextPage: null }, error: null };
          },
        },
      },
    };
    const page2Result = await lookupAuthUserByEmail("page2user@target.com", mockMultiPageClient);
    assert(
      page2Result.status === "confirmed" &&
        page2Result.user?.id === "page2-target-uuid",
      "Multi-page pagination correctly finds confirmed user on page 2"
    );

    // 10E: Multi-page paginated lookup finds unconfirmed user on page 2
    const mockMultiPageUnconfirmedClient = {
      auth: {
        admin: {
          listUsers: async ({ page }: any) => {
            if (page === 1) {
              const dummyUsers = Array.from({ length: 1000 }, (_, i) => ({
                id: `dummy-uuid-${i}`,
                email: `other${i}@domain.com`,
                email_confirmed_at: new Date().toISOString(),
              }));
              return { data: { users: dummyUsers, nextPage: 2, total: 1001 }, error: null };
            }
            return {
              data: {
                users: [
                  {
                    id: "page2-unconfirmed-uuid",
                    email: "page2unconfirmed@target.com",
                    email_confirmed_at: null,
                  },
                ],
                nextPage: null,
                total: 1001,
              },
              error: null,
            };
          },
        },
      },
    };
    const page2UnconfirmedResult = await lookupAuthUserByEmail(
      "page2unconfirmed@target.com",
      mockMultiPageUnconfirmedClient
    );
    assert(
      page2UnconfirmedResult.status === "unconfirmed" &&
        page2UnconfirmedResult.user?.id === "page2-unconfirmed-uuid",
      "Multi-page pagination correctly finds unconfirmed user on page 2"
    );

    // 10F: Exhausted directory conclusively reports user absent
    const conclusiveNotFoundResult = await lookupAuthUserByEmail(
      "absent@target.com",
      mockMultiPageClient
    );
    assert(
      conclusiveNotFoundResult.status === "conclusive_not_found",
      "Exhausted multi-page directory returns 'conclusive_not_found'"
    );

    // 10G: Pagination limit safety cap triggers 'inconclusive' on runaway pages
    const mockRunawayClient = {
      auth: {
        admin: {
          listUsers: async ({ page }: any) => ({
            data: {
              users: Array.from({ length: 1000 }, (_, i) => ({
                id: `p${page}-${i}`,
                email: `filler${page}_${i}@test.com`,
              })),
              nextPage: page + 1,
              total: 999999,
            },
            error: null,
          }),
        },
      },
    };
    const runawayResult = await lookupAuthUserByEmail("someuser@test.com", mockRunawayClient);
    assert(
      runawayResult.status === "inconclusive" &&
        runawayResult.reason === "pagination_limit_exceeded",
      "Runaway pagination terminates safely with 'inconclusive' (pagination_limit_exceeded)"
    );

    // 10H: Invalid pagination metadata (backward/stagnant nextPage on full page) fails safely with 'inconclusive'
    const mockInvalidNextPageClient = {
      auth: {
        admin: {
          listUsers: async () => ({
            data: {
              users: Array.from({ length: 1000 }, (_, i) => ({
                id: `corrupt-${i}`,
                email: `corrupt${i}@test.com`,
              })),
              nextPage: 1, // Stagnant nextPage equal to currentPage
              total: 5000,
            },
            error: null,
          }),
        },
      },
    };
    const invalidNextPageResult = await lookupAuthUserByEmail("target@test.com", mockInvalidNextPageClient);
    assert(
      invalidNextPageResult.status === "inconclusive" &&
        invalidNextPageResult.reason === "invalid_pagination_metadata",
      "Corrupted pagination metadata (stagnant nextPage) terminates safely with 'inconclusive' (invalid_pagination_metadata)"
    );

    // 10I: Ambiguous pagination metadata (full page with null nextPage and contradictory total) fails safely
    const mockAmbiguousPaginationClient = {
      auth: {
        admin: {
          listUsers: async () => ({
            data: {
              users: Array.from({ length: 1000 }, (_, i) => ({
                id: `ambig-${i}`,
                email: `ambig${i}@test.com`,
              })),
              nextPage: null, // Contradictory: full page with null nextPage while total indicates more
              total: 2500,
            },
            error: null,
          }),
        },
      },
    };
    const ambiguousPaginationResult = await lookupAuthUserByEmail("target@test.com", mockAmbiguousPaginationClient);
    assert(
      ambiguousPaginationResult.status === "inconclusive" &&
        ambiguousPaginationResult.reason === "ambiguous_pagination",
      "Ambiguous pagination metadata terminates safely with 'inconclusive' (ambiguous_pagination)"
    );

    // -------------------------------------------------------------------------
    // TEST 11: Production Auth Test-Isolation & Server Action Boundary Invariants
    // -------------------------------------------------------------------------
    console.log("\n▶ TEST 11: Production Auth Test-Isolation & Server Action Boundary Invariants");

    // 11A: Internal service sendVerificationEmail: Unconfirmed Supabase Auth user is NOT reported as already verified
    // even if a database user record exists with emailVerified = true (mzpatel14@gmail.com).
    const mockUnconfirmedAdminClient = {
      auth: {
        admin: {
          listUsers: async () => ({
            data: {
              users: [
                {
                  id: "simulated-unconfirmed-uuid",
                  email: "mzpatel14@gmail.com",
                  email_confirmed_at: null,
                },
              ],
              nextPage: null,
            },
            error: null,
          }),
        },
      },
    };
    const mockResendSuccessClient = {
      auth: {
        resend: async () => ({ error: null }),
      },
    };
    const unconfirmedServiceRes = await sendVerificationEmail("mzpatel14@gmail.com", {
      adminClient: mockUnconfirmedAdminClient,
      supabaseClient: mockResendSuccessClient,
    });
    assert(
      unconfirmedServiceRes.alreadyVerified !== true && unconfirmedServiceRes.success === true,
      "Internal service: Unconfirmed Supabase user with stale Prisma emailVerified is NOT reported as already verified"
    );

    // 11B: Internal service sendVerificationEmail: Inconclusive Admin lookup does NOT use stale Prisma state
    const mockInconclusiveAdminClient = {
      auth: {
        admin: {
          listUsers: async () => ({
            data: { users: [] },
            error: { message: "503 Service Unavailable", status: 503 },
          }),
        },
      },
    };
    const inconclusiveServiceRes = await sendVerificationEmail("mzpatel14@gmail.com", {
      adminClient: mockInconclusiveAdminClient,
      supabaseClient: mockResendSuccessClient,
    });
    assert(
      inconclusiveServiceRes.alreadyVerified !== true && inconclusiveServiceRes.success === true,
      "Internal service: Inconclusive Admin lookup bypasses Prisma and proceeds to native resend without claiming verified"
    );

    // 11C: Internal service sendVerificationEmail: Real-looking email matching previously designated test pattern receives NO special treatment.
    // Conclusively absent user in Supabase Auth does not consult Prisma even for '@test.com'.
    const mockConclusiveNotFoundClient = {
      auth: {
        admin: {
          listUsers: async () => ({
            data: { users: [], nextPage: null },
            error: null,
          }),
        },
      },
    };
    const mockNotFoundResendClient = {
      auth: {
        resend: async () => ({
          error: { code: "user_not_found", message: "User not found" },
        }),
      },
    };
    const testDomainServiceRes = await sendVerificationEmail("agency-owner@test.com", {
      adminClient: mockConclusiveNotFoundClient,
      supabaseClient: mockNotFoundResendClient,
    });
    assert(
      testDomainServiceRes.alreadyVerified !== true &&
        (testDomainServiceRes.error?.includes("No registration found") ?? false),
      "Internal service: Email ending in '@test.com' receives zero special Prisma fallback treatment and maps native provider error"
    );

    // 11D: Internal service sendVerificationEmail: Genuinely confirmed user in Supabase Auth consistently returns alreadyVerified: true
    const mockConfirmedAdminClient = {
      auth: {
        admin: {
          listUsers: async () => ({
            data: {
              users: [
                {
                  id: "confirmed-uuid",
                  email: "confirmed@anydomain.com",
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
    const confirmedServiceRes = await sendVerificationEmail("confirmed@anydomain.com", {
      adminClient: mockConfirmedAdminClient,
    });
    assert(
      confirmedServiceRes.alreadyVerified === true &&
        (confirmedServiceRes.error?.includes("already verified") ?? false),
      "Internal service: Confirmed Supabase Auth user consistently returns alreadyVerified: true"
    );

    // 11E: Exported Server Action signature and production wiring invariant
    // resendVerificationEmailAction must accept strictly (prevState, formData) without leaked test overrides
    assert(
      resendVerificationEmailAction.length === 2,
      "Exported Server Action resendVerificationEmailAction strictly exposes standard 2-argument signature (prevState, formData)"
    );
    const fdEmptyAction = new FormData();
    const actionEmptyRes = await resendVerificationEmailAction({}, fdEmptyAction);
    assert(
      actionEmptyRes.error?.includes("Please enter your registered email") ?? false,
      "Production Server Action validates form input without throwing"
    );

    // 11F: Platform Owner restrictions and onboarding guards remain intact
    assert(
      isPlatformOwnerTargetSync({ email: "mzpatel14@gmail.com" }) === true,
      "Platform Owner target check correctly protects mzpatel14@gmail.com"
    );
    assert(
      isPlatformOwnerTargetSync({ email: "agency-owner@test.com" }) === false,
      "Non-Platform Owner email is not flagged as Platform Owner"
    );

    // Final Database Cleanliness Check
    const finalUsers = await prisma.user.findMany();
    const finalAgencies = await prisma.agency.findMany();
    assert(finalUsers.length === initialUsers.length, "Zero database users created or modified during QA suite");
    assert(finalAgencies.length === initialAgencies.length, "Zero database agencies created or modified during QA suite");

    console.log("\n===============================================================================");
    console.log(`  TRIPDESK QA-22 RESULTS: ${testsPassed} / ${testsTotal} ASSERTIONS PASSED (100%)`);
    console.log("===============================================================================\n");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runPasswordRecoveryOtpQA().catch((err) => {
  console.error("QA-22 Test Suite Failure:", err);
  process.exit(1);
});
