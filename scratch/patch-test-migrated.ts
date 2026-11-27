import * as fs from 'fs';
import * as path from 'path';

const file = path.join(__dirname, '../prisma/test-staff-failures-phase1.ts');
let content = fs.readFileSync(file, 'utf-8');

const targetImport = `import { staffPermissionService } from "../src/lib/services/staff-permission-service";`;
const replaceImport = `import { staffPermissionService, checkHasStaffPermissionProfileTable } from "../src/lib/services/staff-permission-service";`;

const targetTest = `  await test("Actual Connected Database: staffPermissionService.getStaffPermissions fails closed ({}) on pre-migration database", async () => {
    const staff = await prisma.user.findFirst({
      where: { role: "AGENCY_STAFF" },
      select: { id: true, agencyId: true },
    });
    if (!staff || !staff.agencyId) {
      console.log("    (Skipping DB check: zero agency staff users in local database)");
      return;
    }

    const permissions = await staffPermissionService.getStaffPermissions(
      staff.agencyId,
      staff.id,
      prisma
    );

    // CRITICAL: Against the connected pre-migration PostgreSQL database, permissions MUST fail closed
    assert.deepStrictEqual(
      permissions,
      {},
      "Connected unmigrated database must fail closed with {} until migration 20261027150000_phase_f_staff_permissions is applied"
    );
    const canView = evaluateStaffPermission("AGENCY_STAFF", permissions, "ENQUIRIES", "VIEW");
    assert.strictEqual(canView, false, "Unmigrated database evaluates staff permissions as false");
  });`;

const replaceTest = `  await test("Actual Connected Database: staffPermissionService.getStaffPermissions resolves correctly post-migration (or fails closed if unmigrated)", async () => {
    const staff = await prisma.user.findFirst({
      where: { role: "AGENCY_STAFF" },
      select: { id: true, agencyId: true },
    });
    if (!staff || !staff.agencyId) {
      console.log("    (Skipping DB check: zero agency staff users in local database)");
      return;
    }

    const hasTable = await checkHasStaffPermissionProfileTable(prisma);
    const permissions = await staffPermissionService.getStaffPermissions(
      staff.agencyId,
      staff.id,
      prisma
    );

    if (hasTable) {
      assert(permissions && typeof permissions === "object" && Object.keys(permissions).length > 0, "Migrated database must resolve staff permissions");
      const canView = evaluateStaffPermission("AGENCY_STAFF", permissions, "ENQUIRIES", "VIEW");
      assert.strictEqual(canView, true, "Migrated database allows staff ENQUIRIES.VIEW");
    } else {
      assert.deepStrictEqual(
        permissions,
        {},
        "Connected unmigrated database must fail closed with {} until migration 20261027150000_phase_f_staff_permissions is applied"
      );
      const canView = evaluateStaffPermission("AGENCY_STAFF", permissions, "ENQUIRIES", "VIEW");
      assert.strictEqual(canView, false, "Unmigrated database evaluates staff permissions as false");
    }
  });`;

const normalized = content.replace(/\r\n/g, '\n');
if (!normalized.includes(targetImport)) {
  console.error('Target import not found!');
  process.exit(1);
}
if (!normalized.includes(targetTest)) {
  console.error('Target test not found!');
  process.exit(1);
}

const updated = normalized.replace(targetImport, replaceImport).replace(targetTest, replaceTest);
const finalContent = content.includes('\r\n') ? updated.replace(/\n/g, '\r\n') : updated;
fs.writeFileSync(file, finalContent, 'utf-8');
console.log('Successfully updated test-staff-failures-phase1.ts!');

