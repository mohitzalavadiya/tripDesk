import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function inspectDuplicateGroup() {
  const duplicateInvoices = await prisma.invoice.findMany({
    where: {
      bookingId: 'cmtwwp3x4000utgtq9ublezgj',
    },
    select: {
      id: true,
      agencyId: true,
      bookingId: true,
      invoiceNumber: true,
      status: true,
      totalAmount: true,
      paidAmount: true,
      balanceAmount: true,
      cancellationReason: true,
      replacedByInvoiceId: true,
      cancelledAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('=== DUPLICATE GROUP INVOICES DETAILS ===');
  console.dir(duplicateInvoices, { depth: null });
  await prisma.$disconnect();
}

inspectDuplicateGroup();
