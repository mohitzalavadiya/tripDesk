import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { invoiceService } from '../src/lib/services/invoice-service';
import { bookingService } from '../src/lib/services/booking-service';
import { paymentService } from '../src/lib/services/payment-service';
import {
  BookingStatus,
  BookingPaymentStatus,
  PaymentMethod,
  PaymentStatus,
  InvoiceStatus,
  Prisma,
} from '@prisma/client';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function recordPass(id: string, name: string, details?: string) {
  results.push({ id, name, passed: true, details });
  console.log(`✅ PASS [${id}]: ${name}${details ? ` (${details})` : ''}`);
}

function recordFail(id: string, name: string, error: any) {
  const errMsg = error instanceof Error ? error.message : String(error);
  results.push({ id, name, passed: false, error: errMsg });
  console.error(`❌ FAIL [${id}]: ${name} -> Error: ${errMsg}`);
}

async function runBatch4Matrix() {
  console.log('===================================================================');
  console.log('TRIPDESK BATCH 4: INVOICE DATABASE INTEGRITY & CONCURRENCY MATRIX');
  console.log('===================================================================\n');

  const timestamp = Date.now();
  let agencyA: any;
  let agencyB: any;
  let customerA: any;
  let tripA: any;
  let bookingA1: any;
  let bookingA2: any;
  let bookingB1: any;

  try {
    // ─── SETUP: Test Agencies, Customers, Trips, Bookings ───
    agencyA = await prisma.agency.create({
      data: {
        name: `Batch 4 Test Agency A - ${timestamp}`,
        email: `agency_a_${timestamp}@test.com`,
        phone: '+919999000001',
      },
    });

    agencyB = await prisma.agency.create({
      data: {
        name: `Batch 4 Test Agency B - ${timestamp}`,
        email: `agency_b_${timestamp}@test.com`,
        phone: '+919999000002',
      },
    });

    customerA = await prisma.customer.create({
      data: {
        agencyId: agencyA.id,
        name: 'Rohit Sharma',
        phone: '+919800000045',
        email: 'rohit@test.com',
        city: 'Mumbai',
        country: 'India',
      },
    });

    tripA = await prisma.trip.create({
      data: {
        agencyId: agencyA.id,
        customerId: customerA.id,
        tripNumber: `TRIP-B4-${timestamp}`,
        title: 'Dubai Luxury Getaway',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2026-10-07'),
      },
    });

    bookingA1 = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA.id,
        customerId: customerA.id,
        bookingNumber: `BK-B4-1-${timestamp}`,
        status: BookingStatus.CONFIRMED,
        paymentStatus: BookingPaymentStatus.UNPAID,
        totalAmount: new Prisma.Decimal(85000),
        paidAmount: new Prisma.Decimal(0),
        balanceAmount: new Prisma.Decimal(85000),
      },
    });

    bookingA2 = await prisma.booking.create({
      data: {
        agencyId: agencyA.id,
        tripId: tripA.id,
        customerId: customerA.id,
        bookingNumber: `BK-B4-2-${timestamp}`,
        status: BookingStatus.CONFIRMED,
        paymentStatus: BookingPaymentStatus.UNPAID,
        totalAmount: new Prisma.Decimal(120000),
        paidAmount: new Prisma.Decimal(0),
        balanceAmount: new Prisma.Decimal(120000),
      },
    });

    // Booking in Agency B
    const customerB = await prisma.customer.create({
      data: {
        agencyId: agencyB.id,
        name: 'KL Rahul',
        phone: '+919800000046',
        email: 'kl@test.com',
      },
    });

    const tripB = await prisma.trip.create({
      data: {
        agencyId: agencyB.id,
        customerId: customerB.id,
        tripNumber: `TRIP-B4B-${timestamp}`,
        title: 'London Tour',
        startDate: new Date('2026-11-01'),
        endDate: new Date('2026-11-08'),
      },
    });

    bookingB1 = await prisma.booking.create({
      data: {
        agencyId: agencyB.id,
        tripId: tripB.id,
        customerId: customerB.id,
        bookingNumber: `BK-B4B-1-${timestamp}`,
        status: BookingStatus.CONFIRMED,
        paymentStatus: BookingPaymentStatus.UNPAID,
        totalAmount: new Prisma.Decimal(95000),
        paidAmount: new Prisma.Decimal(0),
        balanceAmount: new Prisma.Decimal(95000),
      },
    });

    // ─── SECTION 1: Database Physical Unique Constraint Verification ───
    console.log('--- SECTION 1: Database Physical Unique Constraint Verification ---');

    // T01: Unique constraint index exists in pg_indexes
    try {
      const idx: any[] = await prisma.$queryRaw`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'invoices' AND indexname = 'invoices_agencyId_bookingId_key'
      `;
      if (idx.length === 1 && idx[0].indexdef.includes('agencyId') && idx[0].indexdef.includes('bookingId')) {
        recordPass('T01', 'Physical PostgreSQL unique constraint invoices_agencyId_bookingId_key exists');
      } else {
        throw new Error('Index not found or definition missing composite columns');
      }
    } catch (err) {
      recordFail('T01', 'Physical PostgreSQL unique constraint invoices_agencyId_bookingId_key exists', err);
    }

    // T02: First invoice creation succeeds
    let firstInvoice: any;
    try {
      firstInvoice = await invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingA1.id);
      if (firstInvoice && firstInvoice.invoiceNumber === 'INV-0001' && firstInvoice.bookingId === bookingA1.id) {
        recordPass('T02', 'First invoice created successfully with INV-0001', `ID: ${firstInvoice.id}`);
      } else {
        throw new Error(`Unexpected invoice: ${JSON.stringify(firstInvoice)}`);
      }
    } catch (err) {
      recordFail('T02', 'First invoice created successfully with INV-0001', err);
    }

    // T03: Direct duplicate insertion at DB level throws Prisma P2002
    try {
      let threwP2002 = false;
      try {
        await prisma.invoice.create({
          data: {
            agencyId: agencyA.id,
            bookingId: bookingA1.id, // SAME booking!
            invoiceNumber: 'INV-9999',
            status: InvoiceStatus.ISSUED,
            dueDate: new Date(),
            subtotal: new Prisma.Decimal(85000),
            totalAmount: new Prisma.Decimal(85000),
            balanceAmount: new Prisma.Decimal(85000),
          },
        });
      } catch (err: any) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          threwP2002 = true;
        } else {
          throw err;
        }
      }

      if (threwP2002) {
        recordPass('T03', 'Direct duplicate Invoice insertion rejected with Prisma P2002 Unique Constraint Violation');
      } else {
        throw new Error('Duplicate insertion did not throw P2002 error!');
      }
    } catch (err) {
      recordFail('T03', 'Direct duplicate Invoice insertion rejected with Prisma P2002 Unique Constraint Violation', err);
    }

    // T04: Confirm database did not create a second invoice for bookingA1
    try {
      const invoiceCount = await prisma.invoice.count({
        where: { agencyId: agencyA.id, bookingId: bookingA1.id },
      });
      if (invoiceCount === 1) {
        recordPass('T04', 'Database enforces exactly 1 invoice row for bookingA1', `Count = ${invoiceCount}`);
      } else {
        throw new Error(`Expected exactly 1 invoice row, found ${invoiceCount}`);
      }
    } catch (err) {
      recordFail('T04', 'Database enforces exactly 1 invoice row for bookingA1', err);
    }

    // ─── SECTION 2: Multi-Tenant Composite Isolation ───
    console.log('\n--- SECTION 2: Multi-Tenant Composite Isolation ---');

    // T05: Agency B can create an invoice without conflicting with Agency A
    try {
      const invoiceB = await invoiceService.getOrCreateInvoiceForBooking(agencyB.id, bookingB1.id);
      if (invoiceB && invoiceB.invoiceNumber === 'INV-0001' && invoiceB.agencyId === agencyB.id) {
        recordPass('T05', 'Different agencies maintain isolated invoices and sequence numbers', `Agency B INV-0001 created`);
      } else {
        throw new Error('Agency B invoice creation failed or collided');
      }
    } catch (err) {
      recordFail('T05', 'Different agencies maintain isolated invoices and sequence numbers', err);
    }

    // T06: findUnique composite selector (agencyId_bookingId) works accurately
    try {
      const foundUnique = await prisma.invoice.findUnique({
        where: {
          agencyId_bookingId: {
            agencyId: agencyA.id,
            bookingId: bookingA1.id,
          },
        },
      });

      if (foundUnique && foundUnique.id === firstInvoice.id) {
        recordPass('T06', 'findUnique with composite selector agencyId_bookingId resolves correctly');
      } else {
        throw new Error('findUnique did not resolve matching invoice');
      }
    } catch (err) {
      recordFail('T06', 'findUnique with composite selector agencyId_bookingId resolves correctly', err);
    }

    // ─── SECTION 3: 10-Way High Concurrency Race Condition Test ───
    console.log('\n--- SECTION 3: 10-Way High Concurrency Race Condition Test ---');

    // T07–T10: 10 concurrent getOrCreateInvoiceForBooking calls on bookingA2
    try {
      const concurrentCalls = Array.from({ length: 10 }, () =>
        invoiceService.getOrCreateInvoiceForBooking(agencyA.id, bookingA2.id)
      );

      const concurrentResults = await Promise.all(concurrentCalls);

      // Verify all 10 resolved
      const allResolved = concurrentResults.every((res) => res && res.id);
      if (!allResolved) throw new Error('Some concurrent requests failed to resolve');

      // Verify all 10 resolved to the EXACT same Invoice ID
      const firstId = concurrentResults[0].id;
      const allSameId = concurrentResults.every((res) => res.id === firstId);

      // Verify all 10 resolved to the EXACT same Invoice Number (INV-0002)
      const firstNum = concurrentResults[0].invoiceNumber;
      const allSameNum = concurrentResults.every((res) => res.invoiceNumber === firstNum);

      // Verify database has exactly 1 row for bookingA2
      const actualDbCount = await prisma.invoice.count({
        where: { agencyId: agencyA.id, bookingId: bookingA2.id },
      });

      // Verify Agency A invoice sequence lastNumber is exactly 2 (INV-0001 and INV-0002)
      const seq = await prisma.invoiceSequence.findUnique({
        where: { agencyId: agencyA.id },
      });

      if (allSameId) {
        recordPass('T07', '10 parallel requests resolve to the identical Invoice ID', `ID: ${firstId}`);
      } else {
        throw new Error('Concurrent requests returned different Invoice IDs!');
      }

      if (allSameNum && firstNum === 'INV-0002') {
        recordPass('T08', '10 parallel requests return identical Invoice Number INV-0002');
      } else {
        throw new Error(`Expected INV-0002, got ${firstNum}`);
      }

      if (actualDbCount === 1) {
        recordPass('T09', 'Physical database contains exactly 1 invoice row after 10 concurrent requests');
      } else {
        throw new Error(`Expected 1 database row, found ${actualDbCount}`);
      }

      if (seq && seq.lastNumber === 2) {
        recordPass('T10', 'InvoiceSequence consumed exactly once during 10-way race (lastNumber = 2)');
      } else {
        throw new Error(`Expected sequence lastNumber = 2, found ${seq?.lastNumber}`);
      }
    } catch (err) {
      recordFail('T07', '10 parallel requests race condition handling', err);
    }

    // ─── SECTION 4: Live Booking Synchronization & Immutability ───
    console.log('\n--- SECTION 4: Live Booking Synchronization & Immutability ---');

    // T11: Updating booking total synchronizes persistent invoice
    try {
      await bookingService.updateBooking(agencyA.id, bookingA1.id, {
        totalAmount: 90000,
      });

      const syncedInvoice = await invoiceService.getInvoice(agencyA.id, firstInvoice.id);
      if (
        syncedInvoice &&
        Number(syncedInvoice.totalAmount) === 90000 &&
        Number(syncedInvoice.balanceAmount) === 90000 &&
        syncedInvoice.invoiceNumber === 'INV-0001'
      ) {
        recordPass('T11', 'Booking total update (₹85k -> ₹90k) synchronizes persistent invoice while preserving INV-0001');
      } else {
        throw new Error(`Financial mismatch after update: Total ₹${syncedInvoice?.totalAmount}`);
      }
    } catch (err) {
      recordFail('T11', 'Booking total update synchronizes persistent invoice', err);
    }

    // T12: Recording payment links to persistent invoice and updates balance
    try {
      const payment = await paymentService.createPayment(agencyA.id, {
        bookingId: bookingA1.id,
        amount: 30000,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: new Date(),
        referenceNumber: 'UPI-B4-001',
      });

      const updatedInvoice = await invoiceService.getInvoice(agencyA.id, firstInvoice.id);
      if (
        updatedInvoice &&
        Number(updatedInvoice.paidAmount) === 30000 &&
        Number(updatedInvoice.balanceAmount) === 60000 &&
        updatedInvoice.status === InvoiceStatus.PARTIALLY_PAID &&
        updatedInvoice.payments.some((p) => p.id === payment.id)
      ) {
        recordPass('T12', 'Payment recording updates persistent invoice paid/balance and links to ledger');
      } else {
        throw new Error(`Payment sync failed: Paid ₹${updatedInvoice?.paidAmount}, Balance ₹${updatedInvoice?.balanceAmount}`);
      }
    } catch (err) {
      recordFail('T12', 'Payment recording updates persistent invoice', err);
    }

    // ─── SECTION 5: Legacy Replacement & Cancellation Guards ───
    console.log('\n--- SECTION 5: Legacy Replacement & Cancellation Guards ---');

    // T13: createReplacementInvoice is safely guarded under Decision #18
    try {
      let threwGuard = false;
      try {
        await invoiceService.createReplacementInvoice(agencyA.id, firstInvoice.id);
      } catch (err: any) {
        if (err.message.includes('discontinued under Decision #18') || err.message.includes('One Booking retains one persistent invoice')) {
          threwGuard = true;
        } else {
          throw err;
        }
      }

      if (threwGuard) {
        recordPass('T13', 'createReplacementInvoice is safely guarded under Decision #18');
      } else {
        throw new Error('createReplacementInvoice did not throw expected guard error');
      }
    } catch (err) {
      recordFail('T13', 'createReplacementInvoice is safely guarded under Decision #18', err);
    }

    // T14: Booking cancellation transitions persistent invoice without creating new rows
    try {
      await bookingService.cancelBooking(agencyA.id, bookingA1.id, 'Customer requested cancellation');

      const cancelledInvoice = await invoiceService.getInvoice(agencyA.id, firstInvoice.id);
      const invoiceCount = await prisma.invoice.count({
        where: { agencyId: agencyA.id, bookingId: bookingA1.id },
      });

      if (cancelledInvoice?.status === InvoiceStatus.CANCELLED && invoiceCount === 1) {
        recordPass('T14', 'Booking cancellation transitions persistent invoice to CANCELLED (0 duplicate rows created)');
      } else {
        throw new Error(`Invoice status ${cancelledInvoice?.status}, count ${invoiceCount}`);
      }
    } catch (err) {
      recordFail('T14', 'Booking cancellation transitions persistent invoice', err);
    }

    // ─── SECTION 6: Global Database Integrity Verification ───
    console.log('\n--- SECTION 6: Global Database Integrity Verification ---');

    // T15: Zero duplicate (agencyId, bookingId) groups across whole database
    try {
      const duplicateGroups = await prisma.$queryRaw<any[]>`
        SELECT "agencyId", "bookingId", COUNT(*) as count
        FROM "invoices"
        WHERE "bookingId" IS NOT NULL
        GROUP BY "agencyId", "bookingId"
        HAVING COUNT(*) > 1
      `;

      if (duplicateGroups.length === 0) {
        recordPass('T15', 'Global database integrity: 0 duplicate (agencyId, bookingId) groups across entire database');
      } else {
        throw new Error(`Found ${duplicateGroups.length} duplicate groups in database`);
      }
    } catch (err) {
      recordFail('T15', 'Global database integrity: 0 duplicate groups', err);
    }

    // T16: Zero NULL bookingIds in entire database
    try {
      const nullBookings = await prisma.$queryRaw<any[]>`
        SELECT COUNT(*) as count FROM "invoices" WHERE "bookingId" IS NULL
      `;
      const count = Number(nullBookings[0]?.count || 0);
      if (count === 0) {
        recordPass('T16', 'Global database integrity: 0 NULL bookingId records across entire database');
      } else {
        throw new Error(`Found ${count} NULL bookingId rows`);
      }
    } catch (err) {
      recordFail('T16', 'Global database integrity: 0 NULL bookingId records', err);
    }

    // T17: INV-0003 from previous test retained and fully intact
    try {
      const inv0003 = await prisma.invoice.findUnique({
        where: { id: 'cmtwwp5jf0014tgtqp0a6uiup' },
      });

      if (inv0003 && inv0003.invoiceNumber === 'INV-0003') {
        recordPass('T17', 'Historical INV-0003 record retained and fully accessible in database');
      } else {
        throw new Error('Historical INV-0003 not found!');
      }
    } catch (err) {
      recordFail('T17', 'Historical INV-0003 record retained and accessible', err);
    }

  } catch (globalErr) {
    console.error('Fatal Test Suite Error:', globalErr);
  } finally {
    // Clean up isolated test agencies
    console.log('\n--- Cleaning up Batch 4 test fixtures ---');
    try {
      if (agencyA) {
        await prisma.invoiceItem.deleteMany({ where: { invoice: { agencyId: agencyA.id } } });
        await prisma.payment.deleteMany({ where: { agencyId: agencyA.id } });
        await prisma.invoice.deleteMany({ where: { agencyId: agencyA.id } });
        await prisma.invoiceSequence.deleteMany({ where: { agencyId: agencyA.id } });
        await prisma.booking.deleteMany({ where: { agencyId: agencyA.id } });
        await prisma.trip.deleteMany({ where: { agencyId: agencyA.id } });
        await prisma.customer.deleteMany({ where: { agencyId: agencyA.id } });
        await prisma.agency.delete({ where: { id: agencyA.id } });
      }
      if (agencyB) {
        await prisma.invoiceItem.deleteMany({ where: { invoice: { agencyId: agencyB.id } } });
        await prisma.payment.deleteMany({ where: { agencyId: agencyB.id } });
        await prisma.invoice.deleteMany({ where: { agencyId: agencyB.id } });
        await prisma.invoiceSequence.deleteMany({ where: { agencyId: agencyB.id } });
        await prisma.booking.deleteMany({ where: { agencyId: agencyB.id } });
        await prisma.trip.deleteMany({ where: { agencyId: agencyB.id } });
        await prisma.customer.deleteMany({ where: { agencyId: agencyB.id } });
        await prisma.agency.delete({ where: { id: agencyB.id } });
      }
      console.log('Cleanup completed cleanly.');
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
    await prisma.$disconnect();
  }

  // Summary
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n===================================================================');
  console.log(`TRIPDESK BATCH 4 MATRIX RESULT: ${passed} PASSED / ${failed} FAILED (${total} Total)`);
  console.log('===================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runBatch4Matrix();
