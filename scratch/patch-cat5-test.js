const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'prisma/test-staff-failures-phase1.ts');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

const oldBlock = `  await test("Successful update: persists permissions, enforces delete=false and view prerequisite", async () => {
    let upsertPayload: any = null;
    let auditEventLogged: any = null;

    const mockPrismaMigrated: any = {
      __mockHasStaffPermissionProfileTable: true,
      __mockHasAgencyAuditLogsTable: true,
      user: {
        findFirst: async () => ({ id: "usr_staff_01", agencyId: "agency_alpha", role: "AGENCY_STAFF" }),
      },
      staffPermissionProfile: {
        findUnique: async () => ({
          userId: "usr_staff_01",
          permissions: { CUSTOMERS: { view: true, create: false, update: false, delete: false } },
        }),
        upsert: async (args: any) => {
          upsertPayload = args;
          return { userId: "usr_staff_01", permissions: args.create.permissions };
        },
      },
      agencyAuditLog: {
        create: async (args: any) => {
          auditEventLogged = args.data;
          return { id: "log_1", ...args.data };
        },
      },
    };

    const inputPermissions: any = {
      CUSTOMERS: { view: true, create: true, update: true, delete: true },
      BOOKINGS: { view: false, create: true, update: true },
    };

    const result = await staffPermissionService.updateStaffPermissions(
      "agency_alpha",
      "usr_staff_01",
      "usr_owner_01",
      inputPermissions,
      mockPrismaMigrated
    );

    assert.strictEqual(result.CUSTOMERS.delete, false, "delete must remain false even if requested");
    assert.strictEqual(result.CUSTOMERS.create, true);
    assert.strictEqual(result.CUSTOMERS.update, true);

    assert.strictEqual(result.BOOKINGS.view, false);
    assert.strictEqual(result.BOOKINGS.create, false, "create must be false when view is false");
    assert.strictEqual(result.BOOKINGS.update, false, "update must be false when view is false");

    assert(upsertPayload !== null, "staffPermissionProfile.upsert was called");
    assert.strictEqual(upsertPayload.create.permissions.CUSTOMERS.delete, false);

    assert(auditEventLogged !== null, "Audit log event was created");
    assert.strictEqual(auditEventLogged.action, "STAFF_PERMISSIONS_UPDATED");
  });`;

const newBlock = `  await test("Successful update: persists permissions, allows delegable delete, and enforces view prerequisite", async () => {
    let upsertPayload: any = null;
    let auditEventLogged: any = null;

    const mockPrismaMigrated: any = {
      __mockHasStaffPermissionProfileTable: true,
      __mockHasAgencyAuditLogsTable: true,
      user: {
        findFirst: async () => ({ id: "usr_staff_01", agencyId: "agency_alpha", role: "AGENCY_STAFF" }),
      },
      staffPermissionProfile: {
        findUnique: async () => ({
          userId: "usr_staff_01",
          permissions: { CUSTOMERS: { view: true, create: false, update: false, delete: false } },
        }),
        upsert: async (args: any) => {
          upsertPayload = args;
          return { userId: "usr_staff_01", permissions: args.create.permissions };
        },
      },
      agencyAuditLog: {
        create: async (args: any) => {
          auditEventLogged = args.data;
          return { id: "log_1", ...args.data };
        },
      },
    };

    const inputPermissions: any = {
      CUSTOMERS: { view: true, create: true, update: true, delete: true },
      PAYMENTS: { view: true, delete: true },
      BOOKINGS: { view: false, create: true, update: true, delete: true },
    };

    const result = await staffPermissionService.updateStaffPermissions(
      "agency_alpha",
      "usr_staff_01",
      "usr_owner_01",
      inputPermissions,
      mockPrismaMigrated
    );

    assert.strictEqual(result.CUSTOMERS.delete, true, "delegable delete persists as true when granted by owner");
    assert.strictEqual(result.CUSTOMERS.create, true);
    assert.strictEqual(result.CUSTOMERS.update, true);

    assert.strictEqual(result.PAYMENTS.delete, false, "non-delegable module delete is strictly forced to false");

    assert.strictEqual(result.BOOKINGS.view, false);
    assert.strictEqual(result.BOOKINGS.create, false, "create must be false when view is false");
    assert.strictEqual(result.BOOKINGS.update, false, "update must be false when view is false");
    assert.strictEqual(result.BOOKINGS.delete, false, "delete must be false when view is false");

    assert(upsertPayload !== null, "staffPermissionProfile.upsert was called");
    assert.strictEqual(upsertPayload.create.permissions.CUSTOMERS.delete, true);

    assert(auditEventLogged !== null, "Audit log event was created");
    assert.strictEqual(auditEventLogged.action, "STAFF_PERMISSIONS_UPDATED");
  });`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully updated Category 5 test in test-staff-failures-phase1.ts');
} else {
  console.error('oldBlock not found');
}

