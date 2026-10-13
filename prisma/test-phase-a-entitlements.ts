import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🔍 Running Phase A Entitlements QA Verification...");

  // 1. Fetch Starter plan with entitlements
  const starter = await prisma.subscriptionPlan.findUnique({
    where: { name: "Starter" },
    include: {
      featureEntitlements: true,
      usageLimits: true,
    },
  });

  if (!starter) {
    throw new Error("❌ Starter plan missing in database!");
  }

  console.log(`\n📋 Starter Plan Entitlements:`);
  starter.featureEntitlements.forEach((f) => {
    console.log(`   - Feature ${f.featureKey}: ${f.enabled ? "ENABLED" : "DISABLED"}`);
  });
  starter.usageLimits.forEach((u) => {
    console.log(`   - Quota ${u.resourceKey}: ${u.limit === null ? "UNLIMITED" : u.limit}`);
  });

  // Assertions for Starter
  if (starter.featureEntitlements.length !== 4) {
    throw new Error(`Expected 4 feature entitlements for Starter, got ${starter.featureEntitlements.length}`);
  }
  if (starter.usageLimits.length !== 3) {
    throw new Error(`Expected 3 usage limits for Starter, got ${starter.usageLimits.length}`);
  }
  const starterLogo = starter.featureEntitlements.find((f) => f.featureKey === "CUSTOM_AGENCY_LOGO");
  if (starterLogo?.enabled !== false) {
    throw new Error("Expected CUSTOM_AGENCY_LOGO to be false for Starter");
  }
  const starterTrips = starter.usageLimits.find((u) => u.resourceKey === "TRIPS");
  if (starterTrips?.limit !== 20) {
    throw new Error(`Expected Starter TRIPS limit = 20, got ${starterTrips?.limit}`);
  }

  // 2. Fetch Professional plan with entitlements
  const pro = await prisma.subscriptionPlan.findUnique({
    where: { name: "Professional" },
    include: {
      featureEntitlements: true,
      usageLimits: true,
    },
  });

  if (!pro) {
    throw new Error("❌ Professional plan missing in database!");
  }

  console.log(`\n📋 Professional Plan Entitlements:`);
  pro.featureEntitlements.forEach((f) => {
    console.log(`   - Feature ${f.featureKey}: ${f.enabled ? "ENABLED" : "DISABLED"}`);
  });
  pro.usageLimits.forEach((u) => {
    console.log(`   - Quota ${u.resourceKey}: ${u.limit === null ? "UNLIMITED" : u.limit}`);
  });

  // Assertions for Professional
  if (pro.featureEntitlements.length !== 4) {
    throw new Error(`Expected 4 feature entitlements for Professional, got ${pro.featureEntitlements.length}`);
  }
  if (pro.usageLimits.length !== 3) {
    throw new Error(`Expected 3 usage limits for Professional, got ${pro.usageLimits.length}`);
  }
  const proLogo = pro.featureEntitlements.find((f) => f.featureKey === "CUSTOM_AGENCY_LOGO");
  if (proLogo?.enabled !== true) {
    throw new Error("Expected CUSTOM_AGENCY_LOGO to be true for Professional");
  }
  const proTrips = pro.usageLimits.find((u) => u.resourceKey === "TRIPS");
  if (proTrips?.limit !== null) {
    throw new Error(`Expected Professional TRIPS limit = null (unlimited), got ${proTrips?.limit}`);
  }

  // 3. Verify Data Safety (Preservation of existing entities)
  const agencyCount = await prisma.agency.count();
  const subCount = await prisma.subscription.count();
  const paymentCount = await prisma.subscriptionPayment.count();
  const tripCount = await prisma.trip.count();
  const quoteCount = await prisma.quotation.count();
  const bookingCount = await prisma.booking.count();

  console.log(`\n📊 Data Safety Audit:`);
  console.log(`   - Agencies: ${agencyCount}`);
  console.log(`   - Subscriptions: ${subCount}`);
  console.log(`   - Subscription Payments: ${paymentCount}`);
  console.log(`   - Trips: ${tripCount}`);
  console.log(`   - Quotations: ${quoteCount}`);
  console.log(`   - Bookings: ${bookingCount}`);

  console.log("\n✅ PHASE A QA VERIFICATION PASSED SUCCESSFULLY.");
}

main()
  .catch((e) => {
    console.error("❌ QA Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
