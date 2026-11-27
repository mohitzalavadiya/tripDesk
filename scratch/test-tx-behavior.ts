import prisma from "../src/lib/prisma";

async function main() {
  console.log("Testing transaction behavior when staffPermissionProfile.create fails inside try-catch...");

  try {
    await prisma.$transaction(async (tx) => {
      // Dummy query
      await tx.agency.findFirst();
      console.log("Agency queried successfully inside tx.");

      if (tx.staffPermissionProfile?.create) {
        console.log("tx.staffPermissionProfile.create exists!");
        try {
          await tx.staffPermissionProfile.create({
            data: {
              agencyId: "dummy",
              userId: "dummy",
              permissions: {},
            },
          });
        } catch (e: any) {
          console.log("Caught error inside tx:", e.message);
        }
      }

      // Try another query after caught error
      console.log("Attempting query after caught error...");
      const test = await tx.agency.findFirst();
      console.log("Successfully ran query after caught error:", test?.id);
    });
    console.log("Transaction committed!");
  } catch (err: any) {
    console.error("TRANSACTION FAILED & ROLLED BACK:", err.message);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
