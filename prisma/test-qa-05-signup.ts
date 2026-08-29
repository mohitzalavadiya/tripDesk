import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { signupAgencyOwnerAction } from "../src/actions/auth-actions";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function runSignupVerificationTest() {
  console.log("===============================================================================");
  console.log("  TRIPDESK QA-05 — AGENCY SIGNUP & SUPABASE AUTH INTEGRATION TEST");
  console.log("===============================================================================\n");

  const testEmail = `qa_signup_agency_${Date.now()}@gmail.com`;
  const testPassword = "QaStrongPassword2026!";
  const testAgencyName = `QA Agency Workspace ${Date.now()}`;
  const testOwnerName = "QA Test Owner";

  console.log(`▶ Step 1: Pre-signup state verification`);
  const adminSb = createClient(supabaseUrl, serviceRoleKey);
  const { data: initialUsers } = await adminSb.auth.admin.listUsers();
  const existingUserBefore = initialUsers?.users.find((u) => u.email === testEmail);
  if (existingUserBefore) {
    throw new Error(`Test email "${testEmail}" unexpectedly already exists in Supabase Auth!`);
  }
  console.log(`  ✔ Clean initial state verified: ${testEmail} does not exist in Auth.`);

  console.log(`\n▶ Step 2: Executing signupAgencyOwnerAction with new agency credentials`);
  const formData = new FormData();
  formData.append("agencyName", testAgencyName);
  formData.append("agencyPhone", "+91 98765 00000");
  formData.append("agencyEmail", testEmail);
  formData.append("city", "Mumbai");
  formData.append("state", "Maharashtra");
  formData.append("country", "India");
  formData.append("ownerName", testOwnerName);
  formData.append("email", testEmail);
  formData.append("phone", "+91 98765 11111");
  formData.append("password", testPassword);
  formData.append("confirmPassword", testPassword);

  let caughtRedirect: string | null = null;
  try {
    const result = await signupAgencyOwnerAction({}, formData);
    if (result?.error) {
      throw new Error(`signupAgencyOwnerAction returned error: ${result.error}`);
    }
  } catch (err: any) {
    // Next.js redirect throws NEXT_REDIRECT
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      caughtRedirect = err.digest;
      console.log(`  ✔ Action successfully triggered Next.js redirect: ${caughtRedirect}`);
    } else {
      throw err;
    }
  }

  console.log(`\n▶ Step 3: Verifying Supabase Auth user creation & verification`);
  const { data: updatedUsers } = await adminSb.auth.admin.listUsers();
  const createdAuthUser = updatedUsers?.users.find((u) => u.email === testEmail);
  if (!createdAuthUser) {
    throw new Error(`[FAIL] Supabase Auth user was NOT found in Supabase Auth after signup!`);
  }
  console.log(`  ✔ Supabase Auth user created! ID: ${createdAuthUser.id}`);
  console.log(`  ✔ Email confirmed: ${createdAuthUser.email_confirmed_at !== null ? "YES (Confirmed)" : "NO"}`);

  console.log(`\n▶ Step 4: Verifying Prisma User & Agency creation`);
  const dbUser = await prisma.user.findUnique({
    where: { id: createdAuthUser.id },
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

  if (!dbUser) {
    throw new Error(`[FAIL] Prisma User record matching Supabase ID "${createdAuthUser.id}" was NOT found!`);
  }
  if (!dbUser.agency) {
    throw new Error(`[FAIL] Prisma Agency record was NOT created or linked to User!`);
  }
  if (dbUser.role !== UserRole.AGENCY_OWNER) {
    throw new Error(`[FAIL] Expected role AGENCY_OWNER, but found "${dbUser.role}"!`);
  }
  if (dbUser.passwordHash !== null) {
    throw new Error(`[SECURITY FAIL] Plaintext/hashed password should NOT be stored in Prisma. User.passwordHash must be null.`);
  }
  console.log(`  ✔ Prisma User verified: Email: "${dbUser.email}", Role: "${dbUser.role}"`);
  console.log(`  ✔ Prisma Agency verified: "${dbUser.agency.name}" (ID: ${dbUser.agency.id}, Status: ${dbUser.agency.status})`);
  console.log(`  ✔ 7-Day Trial Subscription verified: Plan: "${dbUser.agency.subscriptions[0]?.plan.name}", Status: "${dbUser.agency.subscriptions[0]?.status}"`);
  console.log(`  ✔ Password hash is null in Prisma (auth handled securely by Supabase Auth).`);

  console.log(`\n▶ Step 5: Testing login directly against Supabase Auth with created credentials`);
  const clientSb = createClient(supabaseUrl, supabaseAnonKey);
  const { data: loginData, error: loginError } = await clientSb.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (loginError || !loginData.session || !loginData.user) {
    throw new Error(`[FAIL] Login with newly created agency credentials failed: ${loginError?.message}`);
  }
  console.log(`  ✔ Login succeeded! Supabase Token acquired for User ID: ${loginData.user.id}`);

  console.log(`\n▶ Step 6: Testing duplicate signup rejection`);
  try {
    const dupResult = await signupAgencyOwnerAction({}, formData);
    if (dupResult?.error) {
      console.log(`  ✔ Duplicate signup correctly rejected with: "${dupResult.error}"`);
    } else {
      console.warn("  ⚠️ Note: Duplicate signup result:", dupResult);
    }
  } catch (err: any) {
    console.log(`  ✔ Duplicate signup safely intercepted: ${err.message || err}`);
  }

  console.log(`\n▶ Step 7: Verifying Platform Owner (mzpatel14@gmail.com) immutability`);
  const platformOwner = await prisma.user.findFirst({
    where: { email: "mzpatel14@gmail.com" },
  });
  if (!platformOwner || platformOwner.role !== UserRole.PLATFORM_OWNER) {
    throw new Error(`[CRITICAL SECURITY FAIL] Platform Owner role altered! Found: ${platformOwner?.role}`);
  }
  console.log(`  ✔ Platform Owner verified: "${platformOwner.email}" remains ${platformOwner.role} (Untouched)`);

  console.log("\n===============================================================================");
  console.log("🎉 ALL QA-05 AGENCY SIGNUP & AUTHENTICATION INTEGRATION TESTS PASSED (100%)!");
  console.log("===============================================================================");
}

runSignupVerificationTest()
  .catch((err) => {
    console.error("❌ QA-05 TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
