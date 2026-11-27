import prisma from "../src/lib/prisma";

async function main() {
  const result: any = await prisma.$queryRaw`
    SELECT enumlabel 
    FROM pg_enum 
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
    WHERE pg_type.typname = 'UserRole'
  `;
  console.log("UserRole enum labels in DB:", result);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
