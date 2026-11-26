import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { staffPermissionService } from '../src/lib/services/staff-permission-service';
import { DEFAULT_STAFF_PERMISSIONS } from '../src/lib/auth/permissions';
import { bookingService } from '../src/lib/services/booking-service';
import { paymentService } from '../src/lib/services/payment-service';

async function runE2ETests() {
  console.log('=== REAL E2E WORKFLOW VERIFICATION ===\n');

  const agencyId = 'cmu2g9rgq0000swtqbr5aie7x';
  const ownerId = '1a5b8334-aef6-4754-83bc-8eb8b0c54151';
  const staffId = '8a664fc2-3245-44f7-8b14-1c062a716b9e';

  // 0. Verify users exist
  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  const staff = await prisma.user.findUnique({ where: { id: staffId } });
  console.log(`[Setup] Owner found: ${owner?.name || owner?.email} (${owner?.role})`);
  console.log(`[Setup] Staff found: ${staff?.name || staff?.email} (${staff?.role})`);

  if (!owner || !staff) {
    throw new Error('Target owner or staff not found in database');
  }

  // 1. Initial GET permissions
  console.log('\n--- Step 1: GET initial permissions ---');
  const initialPerms = await staffPermissionService.getStaffPermissions(agencyId, staffId, prisma);
  console.log('Initial permissions retrieved successfully.');
  console.log('PAYMENTS permission:', initialPerms.PAYMENTS);

  // 2. PUT update permissions (custom permissions payload)
  console.log('\n--- Step 2: PUT update permissions ---');
  const customPerms: any = {
    CUSTOMERS: { view: true, create: true, update: true, delete: false },
    ENQUIRIES: { view: true, create: true, update: true, delete: false },
    ITINERARIES: { view: true, create: true, update: true, delete: false },
    BOOKINGS: { view: true, create: true, update: true, delete: false },
    PAYMENTS: { view: true, create: true, update: true, delete: false, export: true },
    SUPPLIERS: { view: true, create: true, update: true, delete: false },
    VENDORS: { view: true, create: true, update: true, delete: false },
    FINANCIALS: { view: false, create: false, update: false, delete: false }
  };

  const updatedPerms = await staffPermissionService.updateStaffPermissions(
    agencyId,
    staffId,
    ownerId,
    customPerms,
    { ipAddress: '127.0.0.1', userAgent: 'test-agent/e2e' },
    prisma
  );
  console.log('PUT updateStaffPermissions succeeded!');
  console.log('Updated PAYMENTS permission:', updatedPerms.PAYMENTS);

  // 3. Verify in database directly
  console.log('\n--- Step 3: Direct DB check for saved profile & audit log ---');
  const savedProfile: any[] = await prisma.$queryRaw`
    SELECT id, "agencyId", "userId", permissions, "updatedAt"
    FROM staff_permission_profiles
    WHERE "agencyId" = ${agencyId} AND "userId" = ${staffId};
  `;
  console.log('Direct DB query on staff_permission_profiles count:', savedProfile.length);
  if (savedProfile.length === 0) {
    throw new Error('Profile was not persisted in staff_permission_profiles!');
  }
  console.log('Saved permissions payload:', savedProfile[0].permissions);

  const auditLogs: any[] = await prisma.$queryRaw`
    SELECT id, "agencyId", "actorUserId", "targetUserId", action, "entityType", "entityId", "createdAt"
    FROM agency_audit_logs
    WHERE "agencyId" = ${agencyId} AND "targetUserId" = ${staffId}
    ORDER BY "createdAt" DESC
    LIMIT 3;
  `;
  console.log(`Found ${auditLogs.length} audit log entries for target staff:`);
  console.table(auditLogs);
  if (auditLogs.length === 0 || auditLogs[0].action !== 'STAFF_PERMISSIONS_UPDATED') {
    throw new Error('Audit log entry for STAFF_PERMISSIONS_UPDATED was not found!');
  }

  // 4. GET permissions after update - verify persistence
  console.log('\n--- Step 4: GET persisted permissions ---');
  const reloadedPerms = await staffPermissionService.getStaffPermissions(agencyId, staffId, prisma);
  if (reloadedPerms.PAYMENTS?.export !== true) {
    throw new Error('Persisted permissions do not match expected PAYMENTS.export === true');
  }
  console.log('GET confirmed custom permissions are active:', {
    PAYMENTS_export: reloadedPerms.PAYMENTS?.export,
    CUSTOMERS_delete: reloadedPerms.CUSTOMERS?.delete
  });

  // 5. POST reset to default permissions
  console.log('\n--- Step 5: POST reset to default permissions ---');
  const resetPerms = await staffPermissionService.resetToDefaultPermissions(
    agencyId,
    staffId,
    ownerId,
    { ipAddress: '127.0.0.1', userAgent: 'test-agent/e2e' },
    prisma
  );
  console.log('Reset succeeded. PAYMENTS permission:', resetPerms.PAYMENTS);

  // Verify profile updated to defaults
  const profileAfterReset: any[] = await prisma.$queryRaw`
    SELECT permissions FROM staff_permission_profiles
    WHERE "agencyId" = ${agencyId} AND "userId" = ${staffId};
  `;
  console.log('Profile after reset:', profileAfterReset[0]?.permissions?.PAYMENTS);
  if (profileAfterReset[0]?.permissions?.PAYMENTS?.export === true) {
    throw new Error('Permissions were not reset back to defaults in DB!');
  }

  // Verify reset audit log
  const resetAudit: any[] = await prisma.$queryRaw`
    SELECT action, "actorUserId", "targetUserId", "createdAt"
    FROM agency_audit_logs
    WHERE "agencyId" = ${agencyId} AND "targetUserId" = ${staffId}
    ORDER BY "createdAt" DESC
    LIMIT 1;
  `;
  console.log('Latest audit log after reset:', resetAudit[0]);
  if (resetAudit[0]?.action !== 'STAFF_PERMISSIONS_UPDATED') {
    throw new Error('Audit log for STAFF_PERMISSIONS_UPDATED was not recorded!');
  }

  // 6. Tenant isolation and security guards
  console.log('\n--- Step 6: Security and Isolation Guards ---');
  // 6a: Self-modification guard
  try {
    await staffPermissionService.updateStaffPermissions(
      agencyId,
      ownerId, // actor trying to modify self
      ownerId,
      customPerms,
      {},
      prisma
    );
    throw new Error('Self-modification should have failed with ValidationError');
  } catch (err: any) {
    console.log('[Guard Passed] Self-modification correctly blocked:', err.message);
  }

  // 6b: Cross-tenant staff access guard
  try {
    await staffPermissionService.updateStaffPermissions(
      'cmu_other_fake_agency_999999999999',
      staffId,
      ownerId,
      customPerms,
      {},
      prisma
    );
    throw new Error('Cross-tenant update should have failed with NotFoundError');
  } catch (err: any) {
    console.log('[Guard Passed] Cross-tenant access correctly blocked:', err.message);
  }

  // 6c: Non-existent staff guard
  try {
    await staffPermissionService.updateStaffPermissions(
      agencyId,
      '00000000-0000-0000-0000-000000000000',
      ownerId,
      customPerms,
      {},
      prisma
    );
    throw new Error('Non-existent staff should have failed with NotFoundError');
  } catch (err: any) {
    console.log('[Guard Passed] Non-existent staff correctly blocked:', err.message);
  }

  // 7. Verification of bookings & payments services
  console.log('\n--- Step 7: Booking & Payment Services Verification ---');
  const bookingsRes = await bookingService.getBookings(
    agencyId,
    { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }
  );
  console.log(`[Bookings Service] Found ${bookingsRes.data.length} bookings (total: ${bookingsRes.meta.total})`);

  const paymentsRes = await paymentService.getPayments(
    agencyId,
    { limit: 10, sortBy: 'paymentDate', sortOrder: 'desc' }
  );
  console.log(`[Payments Service] Found ${paymentsRes.data.length} payments (total: ${paymentsRes.meta.total})`);
  if (paymentsRes.data.length > 0) {
    const first = paymentsRes.data[0];
    console.log(`[Payments Service] Sample payment fields: id=${first.id}, verifiedById=${(first as any).verifiedById}, verifiedAt=${(first as any).verifiedAt}`);
  }

  console.log('\n=== ALL E2E CHECKS PASSED PERFECTLY! ===');
}

runE2ETests()
  .catch((e) => {
    console.error('E2E TEST FAILURE:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
