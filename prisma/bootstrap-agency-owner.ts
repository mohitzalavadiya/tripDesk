import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole, SubscriptionStatus } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

// Normalize Supabase URL
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = rawUrl
  ? rawUrl.replace(/\/(rest|auth|storage)\/v1\/?$/i, "").replace(/\/+$/, "")
  : undefined;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function bootstrapAgencyOwner(options?: {
  email?: string;
  password?: string;
  name?: string;
  agencyName?: string;
  phone?: string;
}) {
  const email = (
    options?.email ||
    process.env.AGENCY_OWNER_EMAIL ||
    process.env.BOOTSTRAP_OWNER_EMAIL ||
    "mzpatel14@gmail.com"
  )
    .trim()
    .toLowerCase();

  const password =
    options?.password ||
    process.env.AGENCY_OWNER_PASSWORD ||
    process.env.BOOTSTRAP_OWNER_PASSWORD ||
    "ChangeMeTripDesk2026!";

  const name = options?.name || process.env.AGENCY_OWNER_NAME || "TripDesk Agency Owner";
  const agencyName = options?.agencyName || process.env.AGENCY_NAME || "TripDesk Travels & Tours";
  const phone = options?.phone || "+91 98765 43210";

  console.log(`🔐 Bootstrapping Agency Owner for target email: ${email}`);

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing Supabase URL or Service Role Key in environment.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 1. Check existing Supabase Auth Users
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("❌ Failed to query Supabase Auth users:", listError.message);
    process.exit(1);
  }

  let supabaseUserId: string;

  // Check exact email match
  const existingExactUser = userList.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  // Check typo email match (e.g., mzpatel14@gamil.com)
  const existingTypoUser = userList.users.find(
    (u) => u.email?.toLowerCase() === "mzpatel14@gamil.com"
  );

  if (existingExactUser) {
    console.log(`ℹ️ Supabase Auth account found for ${email} (ID: ${existingExactUser.id}). Updating password & confirming email...`);
    supabaseUserId = existingExactUser.id;
    const { error: updateError } = await supabase.auth.admin.updateUserById(supabaseUserId, {
      password,
      email_confirm: true,
      user_metadata: { name, role: "AGENCY_OWNER" },
    });
    if (updateError) {
      console.warn("⚠️ Note: Supabase update:", updateError.message);
    }
  } else if (existingTypoUser) {
    console.log(`ℹ️ Found typo account ${existingTypoUser.email} (ID: ${existingTypoUser.id}). Migrating email to ${email} and updating credentials...`);
    supabaseUserId = existingTypoUser.id;
    const { error: updateError } = await supabase.auth.admin.updateUserById(supabaseUserId, {
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: "AGENCY_OWNER" },
    });
    if (updateError) {
      console.error("❌ Failed to migrate Supabase Auth user email:", updateError.message);
      process.exit(1);
    }
    console.log(`✅ Successfully updated Supabase Auth email to: ${email}`);
  } else {
    console.log(`✨ Creating new Supabase Auth user for ${email}...`);
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: "AGENCY_OWNER" },
    });

    if (createError || !createData.user) {
      console.error("❌ Failed to create Supabase Auth user:", createError?.message);
      process.exit(1);
    }
    supabaseUserId = createData.user.id;
  }

  // 2. Ensure Starter & Professional Subscription Plans exist in DB
  let defaultPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Starter" },
  });

  if (!defaultPlan) {
    defaultPlan = await prisma.subscriptionPlan.create({
      data: {
        name: "Starter",
        description: "Essential travel planning & quotation workflow for boutique operators.",
        price: 1999.0,
        durationDays: 30,
        isActive: true,
      },
    });
  }

  // 3. Find existing Agency in PostgreSQL (DO NOT create duplicate agencies)
  let agency = await prisma.agency.findFirst({
    where: {
      OR: [
        { email },
        { email: "mzpatel14@gamil.com" },
        { users: { some: { id: supabaseUserId } } },
        { name: agencyName },
      ],
    },
  });

  if (!agency) {
    // If no agency at all exists in database, fetch the first existing agency or create one
    agency = await prisma.agency.findFirst();
  }

  if (!agency) {
    agency = await prisma.agency.create({
      data: {
        name: agencyName,
        email,
        phone,
        address: "Commercial Hub, Suite 402, Mumbai, India",
        status: "ACTIVE",
      },
    });
    console.log(`🏢 Created initial Agency: "${agency.name}" (ID: ${agency.id})`);
  } else {
    // Update agency email to match corrected email
    agency = await prisma.agency.update({
      where: { id: agency.id },
      data: {
        email,
        status: "ACTIVE",
      },
    });
    console.log(`🏢 Linked existing Agency: "${agency.name}" (ID: ${agency.id})`);
  }

  // 4. Ensure active / trial Subscription exists for Agency
  const existingSub = await prisma.subscription.findFirst({
    where: { agencyId: agency.id },
  });

  if (!existingSub) {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days trial
    await prisma.subscription.create({
      data: {
        agencyId: agency.id,
        planId: defaultPlan.id,
        status: SubscriptionStatus.TRIAL,
        trialStart: now,
        trialEnd: trialEnd,
      },
    });
    console.log(`💳 Created 14-day TRIAL subscription for agency.`);
  }

  // 5. Clean up any previous typo user record in Prisma to prevent unique constraint conflict
  const existingTypoPrismaUser = await prisma.user.findFirst({
    where: {
      email: "mzpatel14@gamil.com",
      NOT: { id: supabaseUserId },
    },
  });
  if (existingTypoPrismaUser) {
    await prisma.user.delete({ where: { id: existingTypoPrismaUser.id } });
  }

  // 6. Upsert Prisma User with AGENCY_OWNER role and corrected email
  const dbUser = await prisma.user.upsert({
    where: { id: supabaseUserId },
    update: {
      agencyId: agency.id,
      name,
      email,
      phone,
      role: UserRole.AGENCY_OWNER,
    },
    create: {
      id: supabaseUserId,
      agencyId: agency.id,
      name,
      email,
      phone,
      role: UserRole.AGENCY_OWNER,
    },
    include: {
      agency: true,
    },
  });

  console.log(`✅ Agency Owner account successfully configured!`);
  console.log(`   Supabase User ID: ${dbUser.id}`);
  console.log(`   User Email: ${dbUser.email}`);
  console.log(`   User Role: ${dbUser.role}`);
  console.log(`   Agency Name: ${dbUser.agency?.name}`);
  console.log(`   Agency ID: ${dbUser.agencyId}`);

  // 7. Verification: Test signInWithPassword to ensure credentials match
  console.log(`🧪 Verifying login authentication...`);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const clientAuth = createClient(supabaseUrl, anonKey);

  const { data: verifyData, error: verifyError } = await clientAuth.auth.signInWithPassword({
    email,
    password,
  });

  if (verifyError || !verifyData.session) {
    console.error("❌ Verification failed! Could not sign in with configured credentials:", verifyError?.message);
    process.exit(1);
  }

  console.log(`🎉 Login authentication verified successfully for ${email}!`);
  console.log(`   Session Token Type: ${verifyData.session.token_type}`);
  console.log(`   User Authenticated: ${verifyData.user.email}`);

  return {
    supabaseUserId: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    agencyId: dbUser.agencyId,
    agencyName: dbUser.agency?.name,
  };
}

// Execute if run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  bootstrapAgencyOwner({
    email: getArg("--email"),
    password: getArg("--password"),
    name: getArg("--name"),
    agencyName: getArg("--agencyName"),
  })
    .catch((err) => {
      console.error("❌ Fatal error during bootstrap:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}
