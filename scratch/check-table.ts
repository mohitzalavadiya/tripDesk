import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const result: any = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND (table_name LIKE '%audit%' OR table_name LIKE '%notif%')
  `;
  console.log("Table check result:", result);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
