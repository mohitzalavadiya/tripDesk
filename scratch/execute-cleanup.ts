import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function executeTargetedCleanup() {
  console.log('=== STEP 2: EXECUTING TARGETED TEST CLEANUP ===\n');

  const id0004 = 'cmtwwp6iv0017tgtqo2xkti0d';
  const id0005 = 'cmtwwp7i20019tgtquw01l058';

  const initialCount = await prisma.invoice.count();
  console.log(`Initial total invoices in DB: ${initialCount}`);

  // Delete invoice items first (or rely on Cascade, but delete explicitly for safety)
  await prisma.invoiceItem.deleteMany({
    where: { invoiceId: { in: [id0004, id0005] } },
  });

  // Delete the 2 duplicate test invoices
  const deleteResult = await prisma.invoice.deleteMany({
    where: { id: { in: [id0004, id0005] } },
  });

  console.log(`Deleted duplicate invoice rows: ${deleteResult.count}`);

  // Post-cleanup verification
  const newCount = await prisma.invoice.count();
  console.log(`New total invoices in DB: ${newCount} (Expected: ${initialCount - 2})`);

  if (newCount !== initialCount - 2) {
    throw new Error(`Count mismatch! Expected ${initialCount - 2}, got ${newCount}`);
  }

  const remainingDuplicates = await prisma.$queryRaw<any[]>`
    SELECT "agencyId", "bookingId", COUNT(*) as count
    FROM "invoices"
    WHERE "bookingId" IS NOT NULL
    GROUP BY "agencyId", "bookingId"
    HAVING COUNT(*) > 1
  `;

  console.log(`Remaining duplicate (agencyId, bookingId) groups: ${remainingDuplicates.length}`);
  if (remainingDuplicates.length !== 0) {
    throw new Error('Duplicates still exist in database!');
  }

  const inv0003 = await prisma.invoice.findUnique({
    where: { id: 'cmtwwp5jf0014tgtqp0a6uiup' },
  });
  console.log(`INV-0003 retained successfully: ${!!inv0003}`);
  if (!inv0003) throw new Error('INV-0003 was accidentally lost!');

  console.log('\n✅ TARGETED CLEANUP COMPLETED & VERIFIED CLEAN.');
  await prisma.$disconnect();
}

executeTargetedCleanup().catch((err) => {
  console.error('Cleanup Execution Error:', err);
  process.exit(1);
});
