import prisma from "../src/lib/prisma";

async function main() {
  const invitations = await prisma.agencyInvitation.findMany({
    select: {
      id: true,
      agencyId: true,
      email: true,
      role: true,
      status: true,
      acceptedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log("All Recent Invitations (Safe fields):");
  console.log(JSON.stringify(invitations, null, 2));

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      agencyId: true,
    },
  });
  console.log("All Database Users:");
  console.log(JSON.stringify(users, null, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
