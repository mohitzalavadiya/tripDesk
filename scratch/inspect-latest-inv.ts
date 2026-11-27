import prisma from "../src/lib/prisma";

async function main() {
  const invitations = await prisma.agencyInvitation.findMany({
    take: 3,
    orderBy: { createdAt: "desc" },
    include: {
      agency: true,
    },
  });
  console.log("Top 3 Invitations:", JSON.stringify(invitations, null, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
