const fs = require("fs");
let code = fs.readFileSync("prisma/test-staff-failures-phase1.ts", "utf8");

// 1. Add TRIP_COSTING and TEAM to expectedPages
code = code.replace(
  '"REFERRALS", "SETTINGS", "SUBSCRIPTION", "SUPPORT_CHAT"',
  '"REFERRALS", "SETTINGS", "SUBSCRIPTION", "SUPPORT_CHAT", "TRIP_COSTING", "TEAM"'
);

// 2. Update default permissions assertions
code = code.replace(
  `    // Owner-only modules (SUBSCRIPTION) are strictly undefined in staff defaults; delegable modules (FINANCE, SETTINGS) default to disabled
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.SUBSCRIPTION, undefined, "SUBSCRIPTION must be undefined in staff defaults");
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.FINANCE?.view, false, "FINANCE must default to view: false");
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.SETTINGS?.view, false, "SETTINGS must default to view: false");`,
  `    // Configurable page permissions default to least-privilege view: false
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.SUBSCRIPTION?.view, false, "SUBSCRIPTION must default to view: false");
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.TEAM?.view, false, "TEAM must default to view: false");
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.TRIP_COSTING?.view, false, "TRIP_COSTING must default to view: false");
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.FINANCE?.view, false, "FINANCE must default to view: false");
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.SETTINGS?.view, false, "SETTINGS must default to view: false");`
);

// 3. Update normalizeStaffPermissions test
code = code.replace(
  `  await test("normalizeStaffPermissions permanently locks owner-only modules regardless of input", () => {
    const ownerOnlyAttempt = {
      FINANCE: { view: true, create: true, update: true, delete: true },
      SETTINGS: { view: true, update: true, delete: true },
      TEAM: { view: true, create: true },
      SUBSCRIPTION: { view: true, manage: true },
    };

    const normalized = normalizeStaffPermissions(ownerOnlyAttempt);
    // Truly immutable modules (TEAM, SUBSCRIPTION) are strictly omitted
    assert.strictEqual(normalized.TEAM, undefined, "TEAM must be strictly omitted from staff profiles");
    assert.strictEqual(normalized.SUBSCRIPTION, undefined, "SUBSCRIPTION must be strictly omitted from staff profiles");

    // Delegable modules (FINANCE, SETTINGS) are normalized with destructive delete forced to false
    assert.strictEqual(normalized.FINANCE?.view, true, "FINANCE view allowed when granted");
    assert.strictEqual(normalized.FINANCE?.delete, false, "FINANCE delete forced to false");
    assert.strictEqual(normalized.SETTINGS?.view, true, "SETTINGS view allowed when granted");
    assert.strictEqual(normalized.SETTINGS?.delete, false, "SETTINGS delete forced to false");
  });`,
  `  await test("normalizeStaffPermissions normalizes delegable pages and protects non-delegable deletions", () => {
    const ownerOnlyAttempt = {
      FINANCE: { view: true, create: true, update: true, delete: true },
      SETTINGS: { view: true, update: true, delete: true },
      TEAM: { view: true, create: true, delete: true },
      SUBSCRIPTION: { view: true, manage: true, delete: true },
    };

    const normalized = normalizeStaffPermissions(ownerOnlyAttempt);
    // Delegable pages allow view when granted, but non-delegable deletions are strictly forced to false
    assert.strictEqual(normalized.TEAM?.view, true, "TEAM view allowed when granted");
    assert.strictEqual(normalized.TEAM?.delete, false, "TEAM delete forced to false");
    assert.strictEqual(normalized.SUBSCRIPTION?.view, true, "SUBSCRIPTION view allowed when granted");
    assert.strictEqual(normalized.SUBSCRIPTION?.delete, false, "SUBSCRIPTION delete forced to false");

    // Delegable modules (FINANCE, SETTINGS) are normalized with destructive delete forced to false
    assert.strictEqual(normalized.FINANCE?.view, true, "FINANCE view allowed when granted");
    assert.strictEqual(normalized.FINANCE?.delete, false, "FINANCE delete forced to false");
    assert.strictEqual(normalized.SETTINGS?.view, true, "SETTINGS view allowed when granted");
    assert.strictEqual(normalized.SETTINGS?.delete, false, "SETTINGS delete forced to false");
  });`
);

// 4. Update evaluateStaffPermission test
code = code.replace(
  `    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { SUBSCRIPTION: { view: true } }, "SUBSCRIPTION", "VIEW"),
      false,
      "SUBSCRIPTION is strictly owner-only"
    );`,
  `    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { SUBSCRIPTION: { view: true } }, "SUBSCRIPTION", "VIEW"),
      true,
      "SUBSCRIPTION view is delegable by Owner"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { SUBSCRIPTION: { view: true, delete: true } }, "SUBSCRIPTION", "DELETE"),
      false,
      "SUBSCRIPTION delete is strictly non-delegable to staff"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { TRIP_COSTING: { view: true } }, "TRIP_COSTING", "VIEW"),
      true,
      "TRIP_COSTING view is delegable by Owner"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { TEAM: { view: true } }, "TEAM", "VIEW"),
      true,
      "TEAM view is delegable by Owner"
    );`
);

fs.writeFileSync("prisma/test-staff-failures-phase1.ts", code, "utf8");
console.log("prisma/test-staff-failures-phase1.ts updated successfully!");

