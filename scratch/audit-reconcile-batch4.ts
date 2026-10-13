import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { Prisma } from '@prisma/client';

async function runDeepAudit() {
  console.log('=== TRIPDESK BATCH 4 PRE-IMPLEMENTATION RECONCILIATION AUDIT ===\n');

  // 1. Safe Environment Info
  const dbUrl = process.env.DATABASE_URL || '';
  let dbHost = 'unknown';
  let dbPort = 'unknown';
  let dbName = 'unknown';
  let isSupabase = false;
  let isLocal = false;

  try {
    const parsed = new URL(dbUrl);
    dbHost = parsed.hostname;
    dbPort = parsed.port;
    dbName = parsed.pathname.replace(/^\//, '');
    isSupabase = dbHost.includes('supabase') || dbHost.includes('pooler.supabase');
    isLocal = dbHost === 'localhost' || dbHost === '127.0.0.1';
  } catch {
    // fallback parsing
  }

  console.log('1. Database Environment Inspection:');
  console.log(`   Host: ${dbHost}`);
  console.log(`   Port: ${dbPort}`);
  console.log(`   Database Name: ${dbName}`);
  console.log(`   Is Localhost: ${isLocal}`);
  console.log(`   Is Supabase: ${isSupabase}`);
  console.log(`   Provider: PostgreSQL (Prisma adapter-pg)`);
  console.log('');

  // 2. Invoice Totals & Integrity
  const totalInvoices = await prisma.invoice.count();
  const nullBookingIdInvoices = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count FROM "invoices" WHERE "bookingId" IS NULL
  `;
  const nullBookingCount = Number(nullBookingIdInvoices[0]?.count || 0);
  const withInvoiceNumber = await prisma.invoice.count({ where: { invoiceNumber: { not: null } } });
  const withoutInvoiceNumber = await prisma.invoice.count({ where: { invoiceNumber: null } });

  const duplicateGroups = await prisma.$queryRaw<any[]>`
    SELECT "agencyId", "bookingId", COUNT(*) as count
    FROM "invoices"
    WHERE "bookingId" IS NOT NULL
    GROUP BY "agencyId", "bookingId"
    HAVING COUNT(*) > 1
  `;

  const agencyDuplicates = await prisma.$queryRaw<any[]>`
    SELECT "agencyId", "invoiceNumber", COUNT(*) as count
    FROM "invoices"
    WHERE "invoiceNumber" IS NOT NULL
    GROUP BY "agencyId", "invoiceNumber"
    HAVING COUNT(*) > 1
  `;

  const globalDuplicates = await prisma.$queryRaw<any[]>`
    SELECT "invoiceNumber", COUNT(*) as count
    FROM "invoices"
    WHERE "invoiceNumber" IS NOT NULL
    GROUP BY "invoiceNumber"
    HAVING COUNT(*) > 1
  `;

  const crossAgencyMismatches = await prisma.$queryRaw<any[]>`
    SELECT i.id as "invoiceId", i."agencyId" as "invoiceAgencyId", b.id as "bookingId", b."agencyId" as "bookingAgencyId"
    FROM "invoices" i
    JOIN "bookings" b ON i."bookingId" = b.id
    WHERE i."agencyId" != b."agencyId"
  `;

  const orphanedBookings = await prisma.$queryRaw<any[]>`
    SELECT i.id as "invoiceId", i."bookingId"
    FROM "invoices" i
    LEFT JOIN "bookings" b ON i."bookingId" = b.id
    WHERE b.id IS NULL
  `;

  console.log('2. Current Invoice Counts:');
  console.log(`   Total Invoice rows: ${totalInvoices}`);
  console.log(`   With bookingId: ${totalInvoices - nullBookingCount}`);
  console.log(`   NULL bookingId: ${nullBookingCount}`);
  console.log(`   With invoiceNumber: ${withInvoiceNumber}`);
  console.log(`   Without invoiceNumber: ${withoutInvoiceNumber}`);
  console.log(`   Duplicate (agencyId, bookingId) groups: ${duplicateGroups.length}`);
  console.log(`   Duplicate (agencyId, invoiceNumber): ${agencyDuplicates.length}`);
  console.log(`   Global duplicate invoice numbers: ${globalDuplicates.length}`);
  console.log(`   Cross-agency mismatches: ${crossAgencyMismatches.length}`);
  console.log(`   Orphaned bookings: ${orphanedBookings.length}`);
  console.log('');

  // 3. Duplicate Group Deep Inspection
  const duplicateBookingId = 'cmtwwp3x4000utgtq9ublezgj';
  const duplicateInvoices = await prisma.invoice.findMany({
    where: { bookingId: duplicateBookingId },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      payments: { where: { archivedAt: null }, orderBy: { paymentDate: 'desc' } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('3. Duplicate Group Deep Inspection:');
  for (const inv of duplicateInvoices) {
    console.log(`--- Invoice ${inv.invoiceNumber} (${inv.id}) ---`);
    console.log(`   Status: ${inv.status}`);
    console.log(`   Invoice Date: ${inv.invoiceDate?.toISOString()}`);
    console.log(`   Due Date: ${inv.dueDate?.toISOString()}`);
    console.log(`   Currency: ${inv.currency}`);
    console.log(`   Subtotal: ₹${inv.subtotal}`);
    console.log(`   Discount: ${inv.discountType || 'NONE'} (Amount: ₹${inv.discountAmount})`);
    console.log(`   Total: ₹${inv.totalAmount}`);
    console.log(`   Paid: ₹${inv.paidAmount}`);
    console.log(`   Balance: ₹${inv.balanceAmount}`);
    console.log(`   Notes: ${inv.notes || 'NULL'}`);
    console.log(`   Payment Instructions: ${inv.paymentInstructions || 'NULL'}`);
    console.log(`   Internal Notes: ${inv.internalNotes || 'NULL'}`);
    console.log(`   Cancelled At: ${inv.cancelledAt ? inv.cancelledAt.toISOString() : 'NULL'}`);
    console.log(`   Cancelled Reason: ${inv.cancellationReason || 'NULL'}`);
    console.log(`   Replaced By: ${inv.replacedByInvoiceId || 'NULL'}`);
    console.log(`   Archived At: ${inv.archivedAt ? inv.archivedAt.toISOString() : 'NULL'}`);
    console.log(`   Created At: ${inv.createdAt.toISOString()}`);
    console.log(`   Updated At: ${inv.updatedAt.toISOString()}`);
    console.log(`   Items Count: ${inv.items.length}`);
    inv.items.forEach((it, idx) => {
      console.log(`     Item ${idx + 1}: "${it.description}", Qty: ${it.quantity}, Rate: ₹${it.rate}, Amount: ₹${it.amount}`);
    });
    console.log(`   Linked Payments Count: ${inv.payments.length}`);
    inv.payments.forEach((p, idx) => {
      console.log(`     Payment ${idx + 1}: ${p.paymentNumber || p.id}, Amount: ₹${p.amount}, Method: ${p.paymentMethod}, Status: ${p.status}`);
    });
    console.log('');
  }

  // 4. Booking Deep Inspection
  const booking = await prisma.booking.findUnique({
    where: { id: duplicateBookingId },
    include: {
      customer: true,
      trip: true,
      payments: true,
      quotation: {
        include: { items: true },
      },
    },
  });

  console.log('4. Associated Booking Deep Inspection:');
  if (booking) {
    console.log(`   Booking Number: #${booking.bookingNumber}`);
    console.log(`   Status: ${booking.status}`);
    console.log(`   Payment Status: ${booking.paymentStatus}`);
    console.log(`   Total Amount: ₹${booking.totalAmount}`);
    console.log(`   Paid Amount: ₹${booking.paidAmount}`);
    console.log(`   Balance Amount: ₹${booking.balanceAmount}`);
    console.log(`   Booking Date: ${booking.bookingDate?.toISOString()}`);
    console.log(`   Created At: ${booking.createdAt.toISOString()}`);
    console.log(`   Updated At: ${booking.updatedAt.toISOString()}`);
    console.log(`   Customer: ${booking.customer?.name} (${booking.customer?.phone})`);
    console.log(`   Trip: "${booking.trip?.title}"`);
    console.log(`   Total Payments Linked to Booking: ${booking.payments.length}`);
    booking.payments.forEach((p, idx) => {
      console.log(`     Booking Payment ${idx + 1}: ID: ${p.id}, Num: ${p.paymentNumber || 'N/A'}, InvoiceId: ${p.invoiceId || 'NULL'}, Amount: ₹${p.amount}, Status: ${p.status}`);
    });
  } else {
    console.log('   Booking not found!');
  }
  console.log('');

  // 5. Agency Info for context
  if (booking) {
    const agency = await prisma.agency.findUnique({
      where: { id: booking.agencyId },
      include: {
        invoiceSequences: true,
      },
    });
    console.log('5. Associated Agency & Invoice Sequence:');
    console.log(`   Agency ID: ${agency?.id}`);
    console.log(`   Agency Name: ${agency?.name}`);
    console.log(`   Invoice Sequence lastNumber: ${agency?.invoiceSequences[0]?.lastNumber ?? 'NONE'}`);
    console.log('');
  }

  await prisma.$disconnect();
}

runDeepAudit().catch((e) => {
  console.error('Audit Error:', e);
  process.exit(1);
});
