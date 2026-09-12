import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function verifyConstraint() {
  console.log('=== STEP 7: VERIFY PHYSICAL DATABASE CONSTRAINT ===\n');

  // Query pg_indexes / pg_constraint
  const indexes: any[] = await prisma.$queryRaw`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'invoices' AND indexname = 'invoices_agencyId_bookingId_key'
  `;

  console.log(`Indexes found matching 'invoices_agencyId_bookingId_key': ${indexes.length}`);
  if (indexes.length > 0) {
    console.log(`Index definition: ${indexes[0].indexdef}`);
  } else {
    throw new Error('Physical index invoices_agencyId_bookingId_key was NOT found in pg_indexes!');
  }

  console.log('\n✅ PHYSICAL DATABASE CONSTRAINT VERIFIED IN POSTGRESQL.');
  await prisma.$disconnect();
}

verifyConstraint().catch((err) => {
  console.error('Verification Error:', err);
  process.exit(1);
});
