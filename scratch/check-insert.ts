import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO payments (id, "agencyId", "bookingId", "paymentNumber", amount, status, "verifiedById") VALUES ('test-1', 'ag-1', 'bk-1', 'PAY-TEST', 100, 'COMPLETED', NULL)`
    );
  } catch (e: any) {
    console.log("Postgres error when writing to verifiedById:", e.message);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

