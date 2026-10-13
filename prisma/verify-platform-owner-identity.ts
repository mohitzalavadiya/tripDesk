import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { createClient } from "@supabase/supabase-js";

async function verifyStep1() {
  console.log("🔍 STEP 1: Verifying Current Identity in PostgreSQL and Supabase Auth...\n");

  // 1. PostgreSQL User
  const pgUser = await prisma.user.findUnique({
    where: { id: "de5c1377-0e7c-4747-b3ed-aaee8b7e32a9" },
  });

  console.log("PostgreSQL User Query Result:");
  console.log({
    id: pgUser?.id,
    email: pgUser?.email,
    role: pgUser?.role,
    agencyId: pgUser?.agencyId,
  });

  if (!pgUser || pgUser.email !== "mzpatel14@gmail.com" || pgUser.role !== "PLATFORM_OWNER" || pgUser.agencyId !== null) {
    console.error("❌ PostgreSQL verification failed!");
    process.exit(1);
  }
  console.log("✔ PostgreSQL User verified successfully.\n");

  // 2. Supabase Auth User
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById("de5c1377-0e7c-4747-b3ed-aaee8b7e32a9");

  if (authError || !authUser?.user) {
    console.error("❌ Supabase Auth getUserById failed:", authError?.message);
    process.exit(1);
  }

  console.log("Supabase Auth User Query Result:");
  console.log({
    id: authUser.user.id,
    email: authUser.user.email,
    created_at: authUser.user.created_at,
    email_confirmed_at: authUser.user.email_confirmed_at,
    user_metadata: authUser.user.user_metadata,
    app_metadata: authUser.user.app_metadata,
  });

  if (authUser.user.id !== pgUser.id || authUser.user.email !== pgUser.email) {
    console.error("❌ Mismatch between PostgreSQL and Supabase Auth!");
    process.exit(1);
  }

  console.log("\n✔ 1:1 Identity Match Confirmed:");
  console.log(`  Supabase Auth User ID (${authUser.user.id}) == PostgreSQL User.id (${pgUser.id})`);
  console.log(`  Email: ${pgUser.email}`);
  console.log(`  Role: ${pgUser.role}`);
  console.log(`  agencyId: ${pgUser.agencyId}`);

  await prisma.$disconnect();
}

verifyStep1().catch(async (e) => {
  console.error("Error:", e);
  await prisma.$disconnect();
  process.exit(1);
});
