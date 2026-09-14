import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting TripDesk initial database seed...");

  // 1. Seed Subscription Plans (V1 Starter & Professional)
  const starterPlan = await prisma.subscriptionPlan.upsert({
    where: { name: "Starter" },
    update: {
      description: "Essential travel planning & quotation workflow for boutique operators.",
      price: 1999.0,
      durationDays: 30,
      isActive: true,
    },
    create: {
      name: "Starter",
      description: "Essential travel planning & quotation workflow for boutique operators.",
      price: 1999.0,
      durationDays: 30,
      isActive: true,
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { name: "Professional" },
    update: {
      description: "Comprehensive operating suite for established agencies and tour desks.",
      price: 4999.0,
      durationDays: 30,
      isActive: true,
    },
    create: {
      name: "Professional",
      description: "Comprehensive operating suite for established agencies and tour desks.",
      price: 4999.0,
      durationDays: 30,
      isActive: true,
    },
  });

  console.log(`✅ Seeded plans: ${starterPlan.name} (₹${starterPlan.price}) & ${proPlan.name} (₹${proPlan.price})`);

  // 2. Seed Tax Rates Catalog (Tax V1 Presets)
  const taxRates = [
    { name: "0%", rate: 0, displayOrder: 1, isDefault: true },
    { name: "5%", rate: 5, displayOrder: 2, isDefault: false },
    { name: "12%", rate: 12, displayOrder: 3, isDefault: false },
    { name: "18%", rate: 18, displayOrder: 4, isDefault: false },
    { name: "28%", rate: 28, displayOrder: 5, isDefault: false },
  ];

  for (const tr of taxRates) {
    await prisma.taxRate.upsert({
      where: { rate: tr.rate },
      update: {
        name: tr.name,
        displayOrder: tr.displayOrder,
        isDefault: tr.isDefault,
        isActive: true,
      },
      create: {
        name: tr.name,
        rate: tr.rate,
        displayOrder: tr.displayOrder,
        isDefault: tr.isDefault,
        isActive: true,
      },
    });
  }
  console.log(`✅ Seeded Tax Rate catalog: 0%, 5%, 12%, 18%, 28%`);

  console.log("🌱 Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
