import "dotenv/config";
import assert from "assert";
import { prisma } from "../src/lib/prisma";
import { DEFAULT_STAFF_PERMISSIONS, evaluateStaffPermission } from "../src/lib/auth/permissions";

// Simulation of the improved getStaffPermissions logic
let _hasStaffPermissionProfileTableCache: boolean | null = null;

async function checkHasStaffPermissionProfileTable(client: any = prisma): Promise<boolean> {
  if (_hasStaffPermissionProfileTableCache !== null) {
    return _hasStaffPermissionProfileTableCache;
  }
  if (client && typeof client.__mockHasStaffPermissionProfileTable === "boolean") {
    return client.__mockHasStaffPermissionProfileTable;
  }
  if (client && client !== prisma && client.staffPermissionProfile && !client.$queryRaw && !client.$transaction) {
    return true;
  }
  try {
    const rawQuery = client?.$queryRaw || prisma.$queryRaw;
    if (typeof rawQuery === "function") {
      const res: any = await rawQuery`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'staff_permission_profiles'
        LIMIT 1
      `;
      _hasStaffPermissionProfileTableCache = Array.isArray(res) && res.length > 0;
      return _hasStaffPermissionProfileTableCache;
    }
  } catch {}
  return false;
}

async function getStaffPermissions(agencyId: string, userId: string, client: any = prisma) {
  const user = client.user?.findFirst ? await client.user.findFirst({
    where: { id: userId, agencyId, role: "AGENCY_STAFF" },
    select: { id: true },
  }) : { id: userId };

  if (!user) {
    throw new Error("Staff member not found in this agency.");
  }

  // 1. Verify table presence
  const hasTable = await checkHasStaffPermissionProfileTable(client);
  if (!hasTable) {
    console.log("  [Check 1] Table absent; failing closed.");
    return {};
  }

  if (!client.staffPermissionProfile?.findUnique) {
    console.log("  [Check 2] Delegate absent; failing closed.");
    return {};
  }

  try {
    const profile = await client.staffPermissionProfile.findUnique({
      where: { userId },
    });

    if (profile === null || profile === undefined) {
      console.log("  [Check 3] Table exists, query succeeded, no row found -> DEFAULT_STAFF_PERMISSIONS.");
      return DEFAULT_STAFF_PERMISSIONS;
    }

    if (profile?.permissions && typeof profile.permissions === "object" && !Array.isArray(profile.permissions)) {
      console.log("  [Check 4] Table exists, query succeeded, custom profile found.");
      return profile.permissions;
    }

    console.log("  [Check 5] Corrupt payload; failing closed.");
    return {};
  } catch (err: any) {
    console.log("  [Check 6] Query or DB error; failing closed.", err.code || err.message);
    return {};
  }
}

async function main() {
  console.log("=== Testing Scenarios ===");

  // Scenario 1: Table exists, query succeeds, no row found (New staff in migrated schema)
  const mockTableExistsNoRow: any = {
    staffPermissionProfile: { findUnique: async () => null },
  };
  const res1 = await getStaffPermissions("ag-1", "usr-1", mockTableExistsNoRow);
  assert.strictEqual(res1.ENQUIRIES.view, true, "Scenario 1 should return default permissions");
  console.log("Scenario 1 Passed!");

  // Scenario 2: Table exists, query succeeds, custom profile found
  const mockTableExistsCustom: any = {
    staffPermissionProfile: { findUnique: async () => ({ permissions: { ENQUIRIES: { view: false } } }) },
  };
  const res2 = await getStaffPermissions("ag-1", "usr-1", mockTableExistsCustom);
  assert.strictEqual(res2.ENQUIRIES.view, false, "Scenario 2 should return custom permissions");
  console.log("Scenario 2 Passed!");

  // Scenario 3: Table exists, query succeeds, corrupt profile found
  const mockTableExistsCorrupt: any = {
    staffPermissionProfile: { findUnique: async () => ({ permissions: "CORRUPT_STRING" }) },
  };
  const res3 = await getStaffPermissions("ag-1", "usr-1", mockTableExistsCorrupt);
  assert.deepStrictEqual(res3, {}, "Scenario 3 should fail closed with {}");
  console.log("Scenario 3 Passed!");

  // Scenario 4: Table missing in mock (__mockHasStaffPermissionProfileTable: false)
  const mockTableMissing: any = {
    __mockHasStaffPermissionProfileTable: false,
    staffPermissionProfile: { findUnique: async () => null },
  };
  const res4 = await getStaffPermissions("ag-1", "usr-1", mockTableMissing);
  assert.deepStrictEqual(res4, {}, "Scenario 4 should fail closed with {}");
  console.log("Scenario 4 Passed!");

  // Scenario 5: Database outage / query failure inside try-catch
  const mockDbOutage: any = {
    staffPermissionProfile: { findUnique: async () => { throw new Error("ECONNREFUSED"); } },
  };
  const res5 = await getStaffPermissions("ag-1", "usr-1", mockDbOutage);
  assert.deepStrictEqual(res5, {}, "Scenario 5 should fail closed with {}");
  console.log("Scenario 5 Passed!");

  // Scenario 6: Real connected database (unmigrated)
  _hasStaffPermissionProfileTableCache = null; // reset cache to hit DB
  const staff = await prisma.user.findFirst({ where: { role: "AGENCY_STAFF" }, select: { id: true, agencyId: true } });
  if (staff && staff.agencyId) {
    const res6 = await getStaffPermissions(staff.agencyId, staff.id, prisma);
    assert.deepStrictEqual(res6, {}, "Scenario 6 (Real DB) should fail closed with {}");
    console.log("Scenario 6 (Real DB) Passed!");
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

