import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function auditDatabase() {
  console.log('=== TRIPDESK INVOICE BATCH 4 READ-ONLY DATABASE AUDIT ===\n');

  try {
    // 1. Total invoices count
    const totalInvoices = await prisma.invoice.count();
    console.log(`1. Total Invoice rows: ${totalInvoices}`);

    // 2. Invoices with bookingId vs null (schema is String, but check DB raw in case)
    const rawNullBookingCount: any[] = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "invoices" WHERE "bookingId" IS NULL
    `;
    const nullBookingCount = Number(rawNullBookingCount[0]?.count || 0);
    console.log(`2. Invoices with NULL bookingId: ${nullBookingCount}`);
    console.log(`   Invoices with non-null bookingId: ${totalInvoices - nullBookingCount}`);

    // 3. Group by (agencyId, bookingId) to check for duplicates
    const duplicateGroups: any[] = await prisma.$queryRaw`
      SELECT "agencyId", "bookingId", COUNT(*) as count
      FROM "invoices"
      WHERE "bookingId" IS NOT NULL
      GROUP BY "agencyId", "bookingId"
      HAVING COUNT(*) > 1
    `;
    console.log(`3. Duplicate (agencyId, bookingId) groups: ${duplicateGroups.length}`);
    if (duplicateGroups.length > 0) {
      console.log('   Duplicate Details:', duplicateGroups);
    } else {
      console.log('   ✅ No duplicate (agencyId, bookingId) combinations found.');
    }

    // 4. Duplicate invoice numbers within agency
    const duplicateInvoiceNumbersWithinAgency: any[] = await prisma.$queryRaw`
      SELECT "agencyId", "invoiceNumber", COUNT(*) as count
      FROM "invoices"
      WHERE "invoiceNumber" IS NOT NULL
      GROUP BY "agencyId", "invoiceNumber"
      HAVING COUNT(*) > 1
    `;
    console.log(`4. Duplicate invoice numbers within agency: ${duplicateInvoiceNumbersWithinAgency.length}`);

    // 5. Global duplicate invoice numbers
    const duplicateInvoiceNumbersGlobal: any[] = await prisma.$queryRaw`
      SELECT "invoiceNumber", COUNT(*) as count
      FROM "invoices"
      WHERE "invoiceNumber" IS NOT NULL
      GROUP BY "invoiceNumber"
      HAVING COUNT(*) > 1
    `;
    console.log(`5. Global duplicate invoice numbers: ${duplicateInvoiceNumbersGlobal.length}`);

    // 6. Cross-agency invoice / booking mismatch
    const crossAgencyMismatches: any[] = await prisma.$queryRaw`
      SELECT i.id as "invoiceId", i."agencyId" as "invoiceAgencyId", b.id as "bookingId", b."agencyId" as "bookingAgencyId"
      FROM "invoices" i
      JOIN "bookings" b ON i."bookingId" = b.id
      WHERE i."agencyId" != b."agencyId"
    `;
    console.log(`6. Cross-agency invoice/booking mismatches: ${crossAgencyMismatches.length}`);
    if (crossAgencyMismatches.length > 0) {
      console.log('   Mismatch Details:', crossAgencyMismatches);
    } else {
      console.log('   ✅ All invoices match their linked booking agency.');
    }

    // 7. Orphaned bookings (invoices referencing non-existent bookings)
    const orphanedInvoices: any[] = await prisma.$queryRaw`
      SELECT i.id as "invoiceId", i."bookingId"
      FROM "invoices" i
      LEFT JOIN "bookings" b ON i."bookingId" = b.id
      WHERE b.id IS NULL
    `;
    console.log(`7. Orphaned booking references: ${orphanedInvoices.length}`);

    // 8. Breakdown by status
    const statusBreakdown = await prisma.invoice.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    console.log('8. Invoice Status Breakdown:');
    for (const item of statusBreakdown) {
      console.log(`   - ${item.status}: ${item._count.id}`);
    }

    // 9. Legacy invoices (e.g. replacedByInvoiceId, null invoiceNumber, draft status)
    const nullInvoiceNumberCount = await prisma.invoice.count({
      where: { invoiceNumber: null },
    });
    console.log(`9. Invoices with NULL invoiceNumber: ${nullInvoiceNumberCount}`);

    const replacedInvoicesCount = await prisma.invoice.count({
      where: { replacedByInvoiceId: { not: null } },
    });
    console.log(`   Invoices with replacedByInvoiceId set: ${replacedInvoicesCount}`);

    // 10. List sample records
    const sampleInvoices = await prisma.invoice.findMany({
      take: 5,
      select: {
        id: true,
        agencyId: true,
        bookingId: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log('\n10. Most recent 5 invoice records:');
    console.dir(sampleInvoices, { depth: null });

  } catch (err) {
    console.error('Audit failed with error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

auditDatabase();
