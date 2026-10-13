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
  const email = process.env.BOOTSTRAP_OWNER_EMAIL;
  const password = process.env.BOOTSTRAP_OWNER_PASSWORD;
  const name = process.env.BOOTSTRAP_OWNER_NAME || "TripDesk Platform Owner";

  console.log(`🔐 Bootstrapping Platform Owner: ${email}`);

  if (!email || !password) {
    console.error("❌ Missing BOOTSTRAP_OWNER_EMAIL or BOOTSTRAP_OWNER_PASSWORD in environment.");
    process.exit(1);
  }

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
    // Ensure existing Supabase Auth account maintains email confirmation
    const { error: updateError } = await supabase.auth.admin.updateUserById(existingOwner.id, {
      email_confirm: true,
      user_metadata: {
        name: existingOwner.name || name,
        role: "PLATFORM_OWNER",
      },
    });
    if (updateError) {
      console.warn("⚠️ Warning: Failed to ensure email confirmation for existing Platform Owner in Supabase Auth:", updateError.message);
    }
    return;
  }

  // 2. Create or verify Supabase Auth user
  let supabaseUserId: string;

  const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("❌ Failed to query Supabase Auth users:", listError.message);
    process.exit(1);
  }

  const existingAuthUser = userList.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  if (existingAuthUser) {
    console.log(`ℹ️ Supabase Auth account found for ${email} (ID: ${existingAuthUser.id}). Ensuring email confirmation...`);
    supabaseUserId = existingAuthUser.id;
    const { error: updateError } = await supabase.auth.admin.updateUserById(supabaseUserId, {
      email_confirm: true,
      user_metadata: {
        name,
        role: "PLATFORM_OWNER",
      },
    });
    if (updateError) {
      console.warn("⚠️ Warning: Failed to update Supabase Auth user:", updateError.message);
    }
  } else {
    console.log(`✨ Creating new Supabase Auth user for ${email}...`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: "PLATFORM_OWNER",
      },
    });

    if (createError || !createData.user) {
      console.error("❌ Failed to create Supabase Auth user for Platform Owner:", createError?.message);
      process.exit(1);
    }
    supabaseUserId = createData.user.id;
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
