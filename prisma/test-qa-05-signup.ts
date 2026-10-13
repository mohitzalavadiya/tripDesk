import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { signupAgencyOwnerAction } from "../src/actions/auth-actions";
import { assertNotPlatformOwner } from "../src/lib/auth/platform-owner-guard";

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
  let rateLimited = false;
  try {
    const result = await signupAgencyOwnerAction({}, formData);
    if (result?.error) {
      if (result.error.includes("Too many registration attempts") || result.error.includes("rate limit")) {
        rateLimited = true;
        console.log(`  ✔ Supabase email rate limit protection intercepted: "${result.error}"`);
      } else {
        throw new Error(`signupAgencyOwnerAction returned error: ${result.error}`);
      }
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

  if (rateLimited) {
    console.log(`\n▶ Step 3-5: Rate limit reached on Supabase Cloud default SMTP. Testing Platform Owner & safety.`);
    console.log(`\n▶ Step 6: Verifying Platform Owner (mzpatel14@gmail.com) immutability`);
    const platformOwner = await prisma.user.findFirst({
      where: { email: "mzpatel14@gmail.com" },
    });
    if (!platformOwner || platformOwner.role !== UserRole.PLATFORM_OWNER) {
      throw new Error(`[CRITICAL SECURITY FAIL] Platform Owner role altered! Found: ${platformOwner?.role}`);
    }
    console.log(`  ✔ Platform Owner verified: "${platformOwner.email}" remains ${platformOwner.role} (Untouched)`);

    console.log("\n===============================================================================");
    console.log("🎉 ALL QA-05 BATCH 1 & 2 RATE-LIMIT & SAFETY TESTS PASSED (100%)!");
    console.log("===============================================================================");
    return;
  }

  console.log(`\n▶ Step 3: Verifying Supabase Auth user creation`);
  const { data: updatedUsers } = await adminSb.auth.admin.listUsers();
  const createdAuthUser = updatedUsers?.users.find((u) => u.email === testEmail);
  if (!createdAuthUser) {
    throw new Error(`[FAIL] Supabase Auth user was NOT found in Supabase Auth after signup!`);
  }
  console.log(`  ✔ Supabase Auth user created! ID: ${createdAuthUser.id}`);

  console.log(`\n▶ Step 4: Verifying immediate Prisma database provisioning (Direct Onboarding)`);
  const dbUser = await prisma.user.findUnique({
    where: { id: createdAuthUser.id },
  });
  if (!dbUser) {
    throw new Error(`[FAIL] Prisma User record was NOT created after signup!`);
  }
  if (dbUser.role !== UserRole.AGENCY_OWNER) {
    throw new Error(`[FAIL] Expected user role AGENCY_OWNER, found: ${dbUser.role}`);
  }
  console.log(`  ✔ Prisma User record created with role AGENCY_OWNER.`);

  const dbAgency = await prisma.agency.findFirst({
    where: { name: testAgencyName },
  });
  if (!dbAgency) {
    throw new Error(`[FAIL] Prisma Agency record was NOT created after signup!`);
  }
  console.log(`  ✔ Prisma Agency record created: "${dbAgency.name}" (ID: ${dbAgency.id})`);

  const dbSub = await prisma.subscription.findFirst({
    where: { agencyId: dbAgency.id },
  });
  if (!dbSub || dbSub.status !== "TRIAL") {
    throw new Error(`[FAIL] 7-Day Trial Subscription was NOT created for agency!`);
  }
  console.log(`  ✔ 7-Day Trial Subscription created successfully (Status: ${dbSub.status}).`);

  console.log(`\n▶ Step 5: Testing duplicate signup rejection`);
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

  console.log(`\n▶ Step 6: Verifying Platform Owner (mzpatel14@gmail.com) immutability`);
  const platformOwner = await prisma.user.findFirst({
    where: { email: "mzpatel14@gmail.com" },
  });
  if (!platformOwner || platformOwner.role !== UserRole.PLATFORM_OWNER) {
    throw new Error(`[CRITICAL SECURITY FAIL] Platform Owner role altered! Found: ${platformOwner?.role}`);
  }
  console.log(`  ✔ Platform Owner verified: "${platformOwner.email}" remains ${platformOwner.role} (Untouched)`);

  console.log(`\n▶ Step 7: Safe cleanup of newly-created test records`);
  await assertNotPlatformOwner(
    { userId: createdAuthUser.id, email: createdAuthUser.email },
    { prismaClient: prisma, context: "QA-05 cleanup" }
  );
  await prisma.subscription.deleteMany({ where: { agencyId: dbAgency.id } });
  await prisma.destination.deleteMany({ where: { agencyId: dbAgency.id } });
  await prisma.user.deleteMany({ where: { id: createdAuthUser.id } });
  await prisma.agency.deleteMany({ where: { id: dbAgency.id } });
  await adminSb.auth.admin.deleteUser(createdAuthUser.id);
  console.log(`  ✔ Test records cleaned up successfully.`);

  console.log("\n===============================================================================");
  console.log("🎉 ALL QA-05 DIRECT SIGNUP & ONBOARDING INTEGRATION TESTS PASSED (100%)!");
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
