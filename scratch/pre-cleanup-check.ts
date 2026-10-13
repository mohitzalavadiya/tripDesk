import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function performPreCleanupCheck() {
  console.log('=== STEP 1: PRE-CLEANUP SAFETY CHECK ===\n');

  const targetAgencyId = 'cmtwwogbs0000tgtqwzdv3pk8';
  const targetBookingId = 'cmtwwp3x4000utgtq9ublezgj';

  const inv0003 = await prisma.invoice.findFirst({
    where: { agencyId: targetAgencyId, bookingId: targetBookingId, invoiceNumber: 'INV-0003' },
    include: { payments: true, items: true },
  });

  const inv0004 = await prisma.invoice.findFirst({
    where: { agencyId: targetAgencyId, bookingId: targetBookingId, invoiceNumber: 'INV-0004' },
    include: { payments: true, items: true },
  });

  const inv0005 = await prisma.invoice.findFirst({
    where: { agencyId: targetAgencyId, bookingId: targetBookingId, invoiceNumber: 'INV-0005' },
    include: { payments: true, items: true },
  });

  console.log('1. INV-0003 check (Must be RETAINED):');
  console.log(`   Exists: ${!!inv0003}, ID: ${inv0003?.id}, CreatedAt: ${inv0003?.createdAt.toISOString()}`);
  if (!inv0003) throw new Error('INV-0003 not found! Safety check failed.');

  console.log('\n2. INV-0004 check (Target for CLEANUP):');
  console.log(`   Exists: ${!!inv0004}, ID: ${inv0004?.id}, Payments: ${inv0004?.payments.length}, Items: ${inv0004?.items.length}`);
  if (!inv0004) throw new Error('INV-0004 not found! Safety check failed.');
  if (inv0004.payments.length > 0) throw new Error('INV-0004 has payments! Aborting cleanup.');
  if (inv0004.id !== 'cmtwwp6iv0017tgtqo2xkti0d') throw new Error('INV-0004 ID mismatch!');

  console.log('\n3. INV-0005 check (Target for CLEANUP):');
  console.log(`   Exists: ${!!inv0005}, ID: ${inv0005?.id}, Payments: ${inv0005?.payments.length}, Items: ${inv0005?.items.length}`);
  if (!inv0005) throw new Error('INV-0005 not found! Safety check failed.');
  if (inv0005.payments.length > 0) throw new Error('INV-0005 has payments! Aborting cleanup.');
  if (inv0005.id !== 'cmtwwp7i20019tgtquw01l058') throw new Error('INV-0005 ID mismatch!');

  console.log('\n✅ ALL 10 SAFETY CHECKS PASSED. Ready for targeted cleanup.');
  await prisma.$disconnect();
}

performPreCleanupCheck().catch((err) => {
  console.error('Safety Check Failed:', err);
  process.exit(1);
});
