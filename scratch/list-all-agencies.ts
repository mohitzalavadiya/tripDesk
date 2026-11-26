import prisma from "../src/lib/prisma";

async function main() {
  const agencies = await prisma.agency.findMany({
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("All agencies in DB:", agencies);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
