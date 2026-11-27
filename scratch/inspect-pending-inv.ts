import prisma from "../src/lib/prisma";

async function main() {
  const inv = await prisma.agencyInvitation.findUnique({
    where: { id: "cmvroymf30000hctqvss014wx" },
  });
  console.log("Invitation cmvroymf30000hctqvss014wx:", inv);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
