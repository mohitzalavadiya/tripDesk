import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function verifyState() {
  console.log("🔍 Verifying current production configuration...");
  const settings = await prisma.platformSetting.findMany({
    orderBy: { key: "asc" },
  });
  console.log("Platform Settings:", settings);

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { price: "asc" },
  });
  console.log("Subscription Plans in Database:", plans.map(p => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    durationDays: p.durationDays,
    isActive: p.isActive,
  })));

  const platformOwner = await prisma.user.findFirst({
    where: { email: "mzpatel14@gmail.com" },
  });
  console.log("Platform Owner:", {
    id: platformOwner?.id,
    email: platformOwner?.email,
    role: platformOwner?.role,
    agencyId: platformOwner?.agencyId,
  });

  await prisma.$disconnect();
}

verifyState().catch(async (err) => {
  console.error("❌ Verification error:", err);
  await prisma.$disconnect();
  process.exit(1);
});
