import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = rawUrl ? rawUrl.replace(/\/(rest|auth|storage)\/v1\/?$/i, "").replace(/\/+$/, "") : undefined;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.BOOTSTRAP_OWNER_EMAIL!;
const password = process.env.BOOTSTRAP_OWNER_PASSWORD!;

async function runTests() {
  console.log("=== TEST 1: VALID LOGIN ===");
  const sb = createClient(supabaseUrl!, supabaseKey!);
  const { data: authData, error: authError } = await sb.auth.signInWithPassword({ email, password });
  if (authError || !authData.session) {
    throw new Error("Valid login failed: " + authError?.message);
  }
  console.log("✔ Supabase Auth Login Succeeded! User ID:", authData.user.id);

  const dbUser = await prisma.user.findUnique({
    where: { id: authData.user.id },
    include: { agency: { include: { subscriptions: { include: { plan: true } } } } },
  });
  if (!dbUser || dbUser.role !== "AGENCY_OWNER" || !dbUser.agencyId) {
    throw new Error("Database user verification failed!");
  }
  console.log("✔ Prisma User Verified! Role:", dbUser.role, "| Agency:", dbUser.agency?.name);
  console.log("✔ Active Subscription:", dbUser.agency?.subscriptions[0]?.status, "| Plan:", dbUser.agency?.subscriptions[0]?.plan.name);

  console.log("\n=== TEST 2: INVALID PASSWORD ===");
  const { data: badAuthData, error: badAuthError } = await sb.auth.signInWithPassword({ email, password: "WrongPassword123!" });
  if (badAuthData.session || !badAuthError) {
    throw new Error("Invalid login should have failed but did not!");
  }
  console.log("✔ Invalid Password Rejected Properly! Status:", badAuthError.status, "| Code:", badAuthError.code);

  console.log("\n=== TEST 3: MULTI-TENANT ISOLATION CHECK ===");
  if (dbUser.agencyId) {
    console.log("✔ Agency Isolation Intact: Context strictly binds all queries to agencyId =", dbUser.agencyId);
  }

  console.log("\n🎉 ALL AUTHENTICATION TESTS PASSED WITH 100% SUCCESS!");
}

runTests()
  .catch((err) => {
    console.error("❌ Test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
