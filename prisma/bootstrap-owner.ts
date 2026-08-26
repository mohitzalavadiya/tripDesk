import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function bootstrapPlatformOwner() {
  const email = process.env.BOOTSTRAP_OWNER_EMAIL || "owner@tripdesk.io";
  const password = process.env.BOOTSTRAP_OWNER_PASSWORD || "ChangeMeTripDesk2026!";
  const name = process.env.BOOTSTRAP_OWNER_NAME || "TripDesk Platform Owner";

  console.log(`🔐 Bootstrapping Platform Owner: ${email}`);

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase URL or Supabase Key in environment.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 1. Check if Platform Owner already exists in Prisma
  const existingOwner = await prisma.user.findFirst({
    where: { role: "PLATFORM_OWNER" },
  });

  if (existingOwner) {
    console.log(`ℹ️ Platform Owner already exists in database: ${existingOwner.email} (ID: ${existingOwner.id})`);
    return;
  }

  // 2. Create or verify Supabase Auth user
  let supabaseUserId: string;

  // Try signing in first if account exists in Supabase Auth
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInData?.user) {
    supabaseUserId = signInData.user.id;
  } else {
    // Attempt signup
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: "PLATFORM_OWNER",
        },
      },
    });

    if (signUpError || !signUpData.user) {
      console.error("❌ Failed to create Supabase Auth user for Platform Owner:", signUpError?.message);
      process.exit(1);
    }
    supabaseUserId = signUpData.user.id;
  }

  // 3. Upsert Platform Owner in TripDesk database with agencyId = null and role = PLATFORM_OWNER
  const owner = await prisma.user.upsert({
    where: { id: supabaseUserId },
    update: {
      role: "PLATFORM_OWNER",
      agencyId: null,
      name,
      email,
    },
    create: {
      id: supabaseUserId,
      agencyId: null,
      name,
      email,
      role: "PLATFORM_OWNER",
    },
  });

  console.log(`✅ Successfully bootstrapped Platform Owner in TripDesk database!`);
  console.log(`   User ID: ${owner.id}`);
  console.log(`   Role: ${owner.role}`);
  console.log(`   Agency ID: ${owner.agencyId ?? "null (Platform Level)"}`);
}

bootstrapPlatformOwner()
  .catch((e) => {
    console.error("❌ Bootstrap error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
