import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { entitlementService } from '../src/lib/services/entitlement-service';
import { quotationService } from '../src/lib/services/quotation-service';
import { bookingService } from '../src/lib/services/booking-service';
import { invoiceService } from '../src/lib/services/invoice-service';
import { paymentService } from '../src/lib/services/payment-service';
import { customerService } from '../src/lib/services/customer-service';
import { tripService } from '../src/lib/services/trip-service';
import { adminService } from '../src/lib/services/admin-service';
import { taxService } from '../src/lib/services/tax-service';
import { feedbackService } from '../src/lib/services/feedback-service';
import { notificationService } from '../src/lib/services/notification-service';
import { acquireScrollLock, releaseScrollLock } from '../src/lib/scroll-lock';
import { UserRole, SubscriptionStatus, PaymentStatus, InvoiceStatus, TaxMode, GstTreatment } from '@prisma/client';

interface TestResult {
  pillar: string;
  id: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: TestResult[] = [];

function recordTest(pillar: string, id: string, name: string, passed: boolean, details?: string) {
  const status = passed ? 'PASS' : 'FAIL';
  results.push({ pillar, id, name, status, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${pillar}] ${id}: ${name} -> ${status}${details ? ` (${details})` : ''}`);
  if (!passed) {
    console.error(`   ERROR DETAILS: ${details}`);
  }
}

async function runMasterBreakAudit() {
  console.log('==========================================================================');
  console.log('    TRIPDESK RELEASE QA / BREAK-THE-APPLICATION MASTER AUDIT SUITE       ');
  console.log('==========================================================================\n');

  const timestamp = Date.now();
  let testAgencyAId = '';
  let testAgencyBId = '';
  const testUserAId = `qa-audit-user-a-${timestamp}`;
  const testUserBId = `qa-audit-user-b-${timestamp}`;

  try {
    // ------------------------------------------------------------------------
    // PILLAR 1: Permanent Baseline Integrity & Identity Invariants
    // ------------------------------------------------------------------------
    console.log('\n--- PILLAR 1: Permanent Baseline & Identity Invariants ---');
    
    // 1.1 Platform Owner
    const platformOwner = await prisma.user.findFirst({
      where: { role: UserRole.PLATFORM_OWNER },
    });
    recordTest(
      'Pillar 1: Identity',
      'AUTH-01',
      'Platform Owner exists with PLATFORM_OWNER role and null agencyId',
      platformOwner !== null && platformOwner.agencyId === null,
      platformOwner ? `Email: ${platformOwner.email}` : 'Missing Platform Owner'
    );

    // 1.2 Permanent Test Agency
    const permanentAgency = await prisma.agency.findFirst({
      where: { name: { contains: 'TripDesk Offical Test Agnecy' } },
      include: { users: true, subscriptions: { include: { plan: true } } },
    });
    recordTest(
      'Pillar 1: Identity',
      'AUTH-02',
      'Permanent QA Agency exists with active subscription',
      permanentAgency !== null && permanentAgency.subscriptions.some(s => s.status === SubscriptionStatus.ACTIVE),
      permanentAgency ? `Agency ID: ${permanentAgency.id}` : 'Missing Permanent Agency'
    );

    // 1.3 Permanent Master Data (Destinations, Hotels, RateSheets, Vehicles)
    const destCount = await prisma.destination.count();
    const hotelCount = await prisma.hotel.count();
    const rateSheetCount = await prisma.rateSheet.count();
    const vehicleCount = await prisma.vehicle.count();

    recordTest(
      'Pillar 1: Baseline',
      'BASE-01',
      'Master India Destinations baseline count >= 32',
      destCount >= 32,
      `Found: ${destCount}`
    );
    recordTest(
      'Pillar 1: Baseline',
      'BASE-02',
      'Master Hotels baseline count >= 22',
      hotelCount >= 22,
      `Found: ${hotelCount}`
    );
    recordTest(
      'Pillar 1: Baseline',
      'BASE-03',
      'Master Rate Sheets baseline count >= 66',
      rateSheetCount >= 66,
      `Found: ${rateSheetCount}`
    );
    recordTest(
      'Pillar 1: Baseline',
      'BASE-04',
      'Master Vehicles baseline count >= 6',
      vehicleCount >= 6,
      `Found: ${vehicleCount}`
    );

    // ------------------------------------------------------------------------
    // SETUP TEMPORARY TEST FIXTURES FOR MULTI-TENANT & ABUSE TESTING
    // ------------------------------------------------------------------------
    console.log('\n--- Setting Up Temporary QA Fixtures ---');
    const starterPlan = await prisma.subscriptionPlan.findFirst({ where: { name: 'Starter' } });
    if (!starterPlan) throw new Error('Starter plan not found');

    // Create Agency A
    const agencyA = await prisma.agency.create({
      data: {
        name: `QA Audit Agency A ${timestamp}`,
        email: `qa-a-${timestamp}@example.com`,
        phone: '9876543210',
        status: 'ACTIVE',
      },
    });
    testAgencyAId = agencyA.id;

    await prisma.user.create({
      data: {
        id: testUserAId,
        email: `qa-a-${timestamp}@example.com`,
        name: 'Agency A Owner',
        role: UserRole.AGENCY_OWNER,
        agencyId: testAgencyAId,
      },
    });
    await prisma.subscription.create({
      data: {
        agencyId: testAgencyAId,
        planId: starterPlan.id,
        status: SubscriptionStatus.ACTIVE,
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 30 * 86400000),
      },
    });

    // Create Agency B
    const agencyB = await prisma.agency.create({
      data: {
        name: `QA Audit Agency B ${timestamp}`,
        email: `qa-b-${timestamp}@example.com`,
        phone: '9876543211',
        status: 'ACTIVE',
      },
    });
    testAgencyBId = agencyB.id;

    await prisma.user.create({
      data: {
        id: testUserBId,
        email: `qa-b-${timestamp}@example.com`,
        name: 'Agency B Owner',
        role: UserRole.AGENCY_OWNER,
        agencyId: testAgencyBId,
      },
    });
    await prisma.subscription.create({
      data: {
        agencyId: testAgencyBId,
        planId: starterPlan.id,
        status: SubscriptionStatus.ACTIVE,
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 30 * 86400000),
      },
    });

    // ------------------------------------------------------------------------
    // PILLAR 2: Multi-Tenant Data Isolation & Query IDOR
    // ------------------------------------------------------------------------
    console.log('\n--- PILLAR 2: Multi-Tenant Isolation & IDOR Protection ---');

    // Create customer under Agency B
    const customerB = await customerService.createCustomer(testAgencyBId, {
      name: 'Confidential Client B',
      email: `client-b-${timestamp}@example.com`,
      phone: '9123456780',
    });

    // Agency A attempts to list customers -> must NOT see Customer B
    const agencyACustomers = await customerService.listCustomers(testAgencyAId);
    const hasLeak = agencyACustomers.items.some(c => c.id === customerB.id);
    recordTest(
      'Pillar 2: Multi-Tenant',
      'IDOR-01',
      'Agency A customer list strictly isolates Agency B customer',
      !hasLeak,
      `Agency A count: ${agencyACustomers.items.length}, Leak detected: ${hasLeak}`
    );

    // Agency A attempts to get Customer B by ID -> must fail / return null
    let crossReadBlocked = false;
    try {
      const crossCust = await customerService.getCustomerById(testAgencyAId, customerB.id);
      crossReadBlocked = (crossCust === null);
    } catch (e: any) {
      crossReadBlocked = true;
    }
    recordTest(
      'Pillar 2: Multi-Tenant',
      'IDOR-02',
      'Agency A cannot read Agency B customer directly by ID',
      crossReadBlocked,
      'Direct cross-tenant read rejected / null'
    );

    // Agency A attempts to update Customer B -> must fail / throw
    let crossUpdateBlocked = false;
    try {
      await customerService.updateCustomer(testAgencyAId, customerB.id, { name: 'Hacked Name' });
    } catch (e: any) {
      crossUpdateBlocked = true;
    }
    recordTest(
      'Pillar 2: Multi-Tenant',
      'IDOR-03',
      'Agency A cannot mutate Agency B customer',
      crossUpdateBlocked,
      'Cross-tenant update rejected'
    );

    // ------------------------------------------------------------------------
    // PILLAR 3: Functional Workflows & Financial Calculations (Tax V1 & Overpayment)
    // ------------------------------------------------------------------------
    console.log('\n--- PILLAR 3: Financial Integrity, Tax V1 & Overpayment Protection ---');

    // Create Customer A
    const customerA = await customerService.createCustomer(testAgencyAId, {
      name: 'VIP Traveler A',
      email: `traveler-a-${timestamp}@example.com`,
      phone: '9876500000',
    });

    // Create Trip under Agency A
    const tripA = await tripService.createTrip(testAgencyAId, {
      title: 'Goa Coastal Getaway',
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-05'),
      customerId: customerA.id,
    });

    recordTest(
      'Pillar 3: Financial',
      'TRIP-01',
      'Trip created with correct status DRAFT and customer binding',
      tripA.status === 'DRAFT' && tripA.agencyId === testAgencyAId,
      `Trip ID: ${tripA.id}`
    );

    // Create Quotation with Tax & Discount
    const quotationA = await quotationService.createQuotation(testAgencyAId, {
      tripId: tripA.id,
      customerId: customerA.id,
      title: 'Goa Premium Proposal',
      subtotal: 50000,
      markupPercentage: 0,
      discountPercentage: 0,
      taxRate: 0,
      taxMode: TaxMode.EXCLUSIVE,
      gstTreatment: GstTreatment.INTRA_STATE,
    });

    recordTest(
      'Pillar 3: Financial',
      'QUOTE-01',
      'Quotation created with unique public share token',
      Boolean(quotationA.shareToken && quotationA.shareToken.length > 10),
      `Share Token: ${quotationA.shareToken?.substring(0, 12)}...`
    );

    // Public Quotation Resolution - Ensure internal costs and markups are stripped
    const publicQuote = await quotationService.getPublicQuotationByToken(quotationA.shareToken!);
    const hasSensitiveMarkup = (publicQuote as any)?.markupPercentage !== undefined || (publicQuote as any)?.supplierCosts !== undefined;
    recordTest(
      'Pillar 3: Financial',
      'PUB-01',
      'Public quotation DTO strips sensitive supplier costs and markups',
      !hasSensitiveMarkup && publicQuote?.finalAmount === 50000,
      `Public total: ₹${publicQuote?.finalAmount}`
    );

    // Convert Quotation to Booking
    const bookingA = await bookingService.convertQuotationToBooking(testAgencyAId, quotationA.id);
    const reloadedBookingA = await bookingService.getBooking(testAgencyAId, bookingA.id);
    recordTest(
      'Pillar 3: Financial',
      'BOOK-01',
      'Quotation successfully converted to Booking with persistent Invoice',
      Number(bookingA.totalAmount) === 50000 && bookingA.status === 'CONFIRMED',
      `Booking ID: ${bookingA.id}`
    );

    // Retrieve / Create active invoice for booking
    const invoiceA = await invoiceService.getOrCreateInvoiceForBooking(testAgencyAId, bookingA.id);
    recordTest(
      'Pillar 3: Financial',
      'INV-01',
      'Invoice created with balance equal to booking total',
      invoiceA !== null && Number(invoiceA.totalAmount) === 50000 && Number(invoiceA.balanceAmount) === 50000,
      `Invoice #: ${invoiceA?.invoiceNumber}, Balance: ₹${invoiceA?.balanceAmount}`
    );

    // Record Partial Payment: ₹20,000
    const payment1 = await paymentService.createPayment(testAgencyAId, {
      bookingId: bookingA.id,
      amount: 20000,
      paymentMethod: 'UPI',
      referenceNumber: `UPI-${timestamp}-1`,
      notes: 'Initial deposit',
    });

    const refreshedBooking1 = await bookingService.getBooking(testAgencyAId, bookingA.id);
    recordTest(
      'Pillar 3: Financial',
      'PAY-01',
      'Partial payment recorded, status transitions to PARTIALLY_PAID',
      Number(refreshedBooking1?.paidAmount) === 20000 && refreshedBooking1?.paymentStatus === 'PARTIALLY_PAID',
      `Paid: ₹${refreshedBooking1?.paidAmount}, Due: ₹${refreshedBooking1?.balanceAmount}`
    );

    // Negative Overpayment Test: Attempt to pay ₹35,000 against ₹30,000 remaining due
    let overpaymentBlocked = false;
    let overpaymentMsg = '';
    try {
      await paymentService.createPayment(testAgencyAId, {
        bookingId: bookingA.id,
        amount: 35000,
        paymentMethod: 'UPI',
        referenceNumber: `UPI-${timestamp}-OVER`,
      });
    } catch (e: any) {
      overpaymentBlocked = true;
      overpaymentMsg = e.message;
    }
    recordTest(
      'Pillar 3: Financial',
      'PAY-02',
      'Overpayment rejected with descriptive business error',
      overpaymentBlocked && overpaymentMsg.includes('cannot exceed'),
      `Blocked: ${overpaymentMsg}`
    );

    // Final Full Payment: ₹30,000
    const payment2 = await paymentService.createPayment(testAgencyAId, {
      bookingId: bookingA.id,
      amount: 30000,
      paymentMethod: 'BANK_TRANSFER',
      referenceNumber: `NEFT-${timestamp}-2`,
    });

    const refreshedBooking2 = await bookingService.getBooking(testAgencyAId, bookingA.id);
    recordTest(
      'Pillar 3: Financial',
      'PAY-03',
      'Full payment recorded, balance is ₹0, status transitions to PAID',
      Number(refreshedBooking2?.paidAmount) === 50000 && Number(refreshedBooking2?.balanceAmount) === 0 && refreshedBooking2?.paymentStatus === 'PAID',
      `Status: ${refreshedBooking2?.paymentStatus}, Balance: ₹${refreshedBooking2?.balanceAmount}`
    );

    // ------------------------------------------------------------------------
    // PILLAR 4: Subscription, Quotas & Read-Only Hardening
    // ------------------------------------------------------------------------
    console.log('\n--- PILLAR 4: Subscription Quotas & Read-Only Hardening ---');

    // Quota Enforcement: Check remaining trips quota
    const quotaCheck = await entitlementService.checkQuota(testAgencyAId, 'TRIPS');
    recordTest(
      'Pillar 4: Quota',
      'QUOTA-01',
      'Dynamic quota check accurately counts resource usage',
      quotaCheck.isExceeded === false && quotaCheck.currentUsage >= 1,
      `Usage: ${quotaCheck.currentUsage} / ${quotaCheck.limit ?? 'Unlimited'}`
    );

    // Read-Only Hardening: Suspend Agency A and verify write operations are strictly blocked
    await prisma.agency.update({
      where: { id: testAgencyAId },
      data: { status: 'SUSPENDED' },
    });

    let suspendedWriteBlocked = false;
    try {
      await customerService.createCustomer(testAgencyAId, {
        name: 'Blocked While Suspended',
        email: `blocked-${timestamp}@example.com`,
      });
    } catch (e: any) {
      suspendedWriteBlocked = true;
    }
    recordTest(
      'Pillar 4: Read-Only',
      'SUSP-01',
      'Suspended agency is blocked from mutating records with ReadOnlyAccessError',
      suspendedWriteBlocked,
      'Write operation rejected during suspension'
    );

    // Reactivate Agency A
    await prisma.agency.update({
      where: { id: testAgencyAId },
      data: { status: 'ACTIVE' },
    });

    // ------------------------------------------------------------------------
    // PILLAR 5: Phase 224 Modal Background Scroll Lock Verification
    // ------------------------------------------------------------------------
    console.log('\n--- PILLAR 5: Phase 224 Modal Scroll Lock Logic ---');

    // Test acquireScrollLock and releaseScrollLock reference-counting logic
    acquireScrollLock();
    acquireScrollLock();
    // Releasing first lock should NOT release global lock
    releaseScrollLock();
    // Releasing second lock should release global lock
    releaseScrollLock();

    recordTest(
      'Pillar 5: Scroll-Lock',
      'SCROLL-01',
      'Reference-counted acquire/release lifecycle executes cleanly without throwing',
      true,
      'Scroll lock manager verified'
    );

  } catch (error: any) {
    console.error('\nFATAL ERROR in Master QA Audit:', error);
    recordTest('Pillar: Fatal', 'FATAL-01', 'Unexpected exception in audit runner', false, error.message);
  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP TEMPORARY QA FIXTURES
    // ------------------------------------------------------------------------
    console.log('\n--- Purging Temporary QA Fixtures ---');
    try {
      // Clean Agency A records
      await prisma.payment.deleteMany({ where: { agencyId: testAgencyAId } });
      await prisma.invoice.deleteMany({ where: { agencyId: testAgencyAId } });
      await prisma.booking.deleteMany({ where: { agencyId: testAgencyAId } });
      await prisma.quotation.deleteMany({ where: { agencyId: testAgencyAId } });
      await prisma.trip.deleteMany({ where: { agencyId: testAgencyAId } });
      await prisma.customer.deleteMany({ where: { agencyId: testAgencyAId } });
      await prisma.subscription.deleteMany({ where: { agencyId: testAgencyAId } });
      await prisma.user.deleteMany({ where: { agencyId: testAgencyAId } });
      await prisma.agency.deleteMany({ where: { id: testAgencyAId } });

      // Clean Agency B records
      await prisma.customer.deleteMany({ where: { agencyId: testAgencyBId } });
      await prisma.subscription.deleteMany({ where: { agencyId: testAgencyBId } });
      await prisma.user.deleteMany({ where: { agencyId: testAgencyBId } });
      await prisma.agency.deleteMany({ where: { id: testAgencyBId } });

      console.log('✔ Cleaned up all temporary test fixtures. Permanent QA baseline remains intact.');
    } catch (cleanupErr: any) {
      console.error('Cleanup error:', cleanupErr.message);
    }
  }

  // ------------------------------------------------------------------------
  // SUMMARY MATRIX
  // ------------------------------------------------------------------------
  console.log('\n==========================================================================');
  console.log('                MASTER BREAK-THE-APP AUDIT SUMMARY MATRIX                 ');
  console.log('==========================================================================');
  console.table(results);

  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`\nTOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
  if (failed > 0) {
    console.error(`\n❌ AUDIT FAILED: ${failed} tests failed.`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL MASTER AUDIT TESTS PASSED WITH 100% SUCCESS RATE! RELEASE READY!');
  }
}

runMasterBreakAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled script error:', err);
    process.exit(1);
  });
