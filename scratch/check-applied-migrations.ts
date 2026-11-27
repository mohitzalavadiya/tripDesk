import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  try {
    const res: any = await prisma.$queryRaw`
      SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at ASC
    `;
    console.log("Applied migrations in database:");
    console.table(res);
  } catch (err: any) {
    console.log("Error querying _prisma_migrations:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();

