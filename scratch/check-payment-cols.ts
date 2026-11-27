import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const cols: any = await prisma.$queryRawUnsafe(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'payments' ORDER BY ordinal_position"
  );
  console.log("Columns on 'payments' in database:", cols.map((c: any) => c.column_name));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

