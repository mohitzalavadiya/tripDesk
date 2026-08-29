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
