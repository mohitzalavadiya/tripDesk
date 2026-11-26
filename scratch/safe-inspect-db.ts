// Safe, strictly read-only script to inspect recent invitations and users
import prisma from "../src/lib/prisma";

async function main() {
  console.log("=== SAFE READ-ONLY DATABASE STATE INSPECTION ===");

  // 1. Inspect agencies
  const agencies = await prisma.agency.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  console.log("\nRecent Agencies:", agencies);

  // 2. Inspect invitations
  const invitations = await prisma.agencyInvitation.findMany({
    select: {
      id: true,
      agencyId: true,
      email: true,
      role: true,
      status: true,
      invitedBy: true,
      acceptedAt: true,
      expiresAt: true,
      createdAt: true,
      agency: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  console.log("\nRecent Invitations:", JSON.stringify(invitations, null, 2));

  // 3. Inspect recent users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      agencyId: true,
      createdAt: true,
      agency: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  console.log("\nRecent Users:", JSON.stringify(users, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Full Error:", err);
    process.exit(1);
  });
