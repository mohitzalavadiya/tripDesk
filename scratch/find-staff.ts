import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const staff = await prisma.user.findFirst({
    where: { role: "AGENCY_STAFF" },
    select: { id: true, agencyId: true, email: true },
  });
  console.log("Found staff user:", staff);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

