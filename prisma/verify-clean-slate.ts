import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { createClient } from "@supabase/supabase-js";

async function verifyCleanSlate() {
  console.log("═════════════════════════════════════════════════════════════════════════");
  console.log("   TRIPDESK — POST-RESET CLEAN SLATE & INTEGRITY VERIFICATION");
  console.log("═════════════════════════════════════════════════════════════════════════\n");

  let allChecksPassed = true;

  // 1. PostgreSQL User Verification
  const users = await prisma.user.findMany();
  console.log(`1. Users in Database: ${users.length}`);
  if (users.length !== 1) {
    console.error(`❌ Expected exactly 1 user, found ${users.length}`);
    allChecksPassed = false;
  } else {
    const owner = users[0];
    console.log(`   - ID:       ${owner.id}`);
    console.log(`   - Email:    ${owner.email}`);
    console.log(`   - Role:     ${owner.role}`);
    console.log(`   - agencyId: ${owner.agencyId}`);
    if (
      owner.id === "de5c1377-0e7c-4747-b3ed-aaee8b7e32a9" &&
      owner.email === "mzpatel14@gmail.com" &&
      owner.role === "PLATFORM_OWNER" &&
      owner.agencyId === null
    ) {
      console.log("   ✔ Authoritative Platform Owner preserved with 100% fidelity.");
    } else {
      console.error("   ❌ Platform Owner invariant violated!");
      allChecksPassed = false;
    }
  }

  // 2. Agency Count
  const agencies = await prisma.agency.findMany();
  console.log(`\n2. Agencies in Database: ${agencies.length}`);
  if (agencies.length === 0) {
    console.log("   ✔ Zero agency workspaces (Clean Slate ready for real pilots).");
  } else {
    console.error(`   ❌ Found ${agencies.length} leftover agencies!`);
    allChecksPassed = false;
  }

  // 3. Operational & Tenant Records
  const counts = {
    customers: await prisma.customer.count(),
    trips: await prisma.trip.count(),
    quotations: await prisma.quotation.count(),
    bookings: await prisma.booking.count(),
    payments: await prisma.payment.count(),
    suppliers: await prisma.supplier.count(),
    travelDocuments: await prisma.travelDocument.count(),
    notifications: await prisma.customerNotification.count(),
    subscriptions: await prisma.subscription.count(),
    auditLogs: await prisma.platformAuditLog.count(),
  };

  console.log("\n3. Tenant Records Inventory (Expect all 0):");
  for (const [key, count] of Object.entries(counts)) {
    console.log(`   - ${key.padEnd(20, " ")}: ${count}`);
    if (count !== 0) {
      console.error(`   ❌ ${key} count is not 0 (${count})!`);
      allChecksPassed = false;
    }
  }

  // 4. Canonical Subscription Plans
  const plans = await prisma.subscriptionPlan.findMany();
  console.log(`\n4. Subscription Plans: ${plans.length}`);
  for (const plan of plans) {
    console.log(`   - [${plan.name}] Price: ₹${plan.price}, Active: ${plan.isActive}`);
  }
  if (plans.length === 2 && plans.some((p) => p.name === "Starter") && plans.some((p) => p.name === "Professional")) {
    console.log("   ✔ Canonical plans (Starter, Professional) properly initialized.");
  } else {
    console.error("   ❌ Canonical plans verification failed!");
    allChecksPassed = false;
  }

  // 5. Platform Settings
  const settings = await prisma.platformSetting.findMany();
  console.log(`\n5. Platform Settings: ${settings.length} entries preserved.`);

  // 6. Supabase Auth Users
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
  const authUsers = authData?.users || [];
  console.log(`\n6. Supabase Auth Users: ${authUsers.length}`);
  for (const u of authUsers) {
    console.log(`   - ID: ${u.id} | Email: ${u.email} | Confirmed: ${!!u.email_confirmed_at}`);
  }

  if (authUsers.length === 1 && authUsers[0].id === "de5c1377-0e7c-4747-b3ed-aaee8b7e32a9" && authUsers[0].email === "mzpatel14@gmail.com") {
    console.log("   ✔ Exactly 1 Supabase Auth user matching Platform Owner.");
  } else {
    console.error(`   ❌ Supabase Auth user count or identity mismatch!`);
    allChecksPassed = false;
  }

  console.log("\n═════════════════════════════════════════════════════════════════════════");
  if (allChecksPassed) {
    console.log("   ✔ CLEAN SLATE CERTIFICATION: 100% PASSED");
    console.log("   TripDesk Production Database is completely clean and ready for pilots!");
  } else {
    console.log("   ❌ CLEAN SLATE CERTIFICATION: FAILED");
  }
  console.log("═════════════════════════════════════════════════════════════════════════\n");

  await prisma.$disconnect();
}

verifyCleanSlate().catch(async (e) => {
  console.error("Error in verifyCleanSlate:", e);
  await prisma.$disconnect();
  process.exit(1);
});
