const fs = require('fs');

// 1. Update prisma/test-staff-failures-phase1.ts
let p1 = fs.readFileSync('prisma/test-staff-failures-phase1.ts', 'utf8');

// Lines 918-927
p1 = p1.replace(
  /\/\/ Owner-only modules are strictly undefined in staff defaults[\s\S]*?const ownerOnlyModules = \[\"FINANCE\", \"SETTINGS\", \"SUBSCRIPTION\"\];[\s\S]*?assert\.strictEqual\(DEFAULT_STAFF_PERMISSIONS\[mod\], undefined, `\$\{mod\} must be undefined in staff defaults`\);[\s\S]*?\}/,
  `// Owner-only modules (SUBSCRIPTION) are strictly undefined in staff defaults; delegable modules (FINANCE, SETTINGS) default to disabled
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.SUBSCRIPTION, undefined, "SUBSCRIPTION must be undefined in staff defaults");
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.FINANCE?.view, false, "FINANCE must default to view: false");
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.SETTINGS?.view, false, "SETTINGS must default to view: false");`
);

// Lines 961-975
p1 = p1.replace(
  /await test\(\"normalizeStaffPermissions permanently locks owner-only modules regardless of input\", \(\) => \{[\s\S]*?const ownerOnlyAttempt = \{[\s\S]*?FINANCE: \{ view: true, create: true, update: true, delete: true \},[\s\S]*?SETTINGS: \{ view: true, update: true \},[\s\S]*?TEAM: \{ view: true, create: true \},[\s\S]*?SUBSCRIPTION: \{ view: true, manage: true \},[\s\S]*?\};[\s\S]*?const normalized = normalizeStaffPermissions\(ownerOnlyAttempt\);[\s\S]*?for \(const mod of Object\.keys\(ownerOnlyAttempt\)\) \{[\s\S]*?\}[\s\S]*?\}\);/,
  `await test("normalizeStaffPermissions permanently locks owner-only modules regardless of input", () => {
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
  });`
);

// Lines 1083-1113
p1 = p1.replace(
  /\/\/ 3\. AGENCY_STAFF role ceiling prevents owner-only domains[\s\S]*?assert\.strictEqual\(\s*evaluateStaffPermission\(\"AGENCY_STAFF\", \{ FINANCE: \{ view: true \} \}, \"FINANCE\", \"VIEW\"\),\s*false,\s*\"FINANCE is owner-only\"\s*\);[\s\S]*?assert\.strictEqual\(\s*evaluateStaffPermission\(\"AGENCY_STAFF\", \{ SETTINGS: \{ view: true \} \}, \"SETTINGS\", \"VIEW\"\),\s*false,\s*\"SETTINGS is owner-only\"\s*\);/,
  `// 3. AGENCY_STAFF role ceiling prevents owner-only domains and evaluates delegable modules
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { FINANCE: { view: true } }, "FINANCE", "VIEW"),
      true,
      "FINANCE is delegable by Owner"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { FINANCE: { view: true, delete: true } }, "FINANCE", "DELETE"),
      false,
      "FINANCE delete is strictly non-delegable to staff"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { INVOICES: { view: true } }, "INVOICES", "VIEW"),
      true,
      "INVOICES is delegable by Owner"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { RATE_SHEETS: { view: true } }, "RATE_SHEETS", "VIEW"),
      true,
      "RATE_SHEETS is delegable by Owner"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { SUPPLIERS: { view: true } }, "SUPPLIERS", "VIEW"),
      true,
      "SUPPLIERS is delegable by Owner"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { REPORTS: { view: true, export: true } }, "REPORTS", "EXPORT"),
      true,
      "REPORTS is delegable by Owner"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { SETTINGS: { view: true } }, "SETTINGS", "VIEW"),
      true,
      "SETTINGS is delegable by Owner"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { SETTINGS: { view: true, delete: true } }, "SETTINGS", "DELETE"),
      false,
      "SETTINGS delete is strictly non-delegable to staff"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { SUBSCRIPTION: { view: true } }, "SUBSCRIPTION", "VIEW"),
      false,
      "SUBSCRIPTION is strictly owner-only"
    );`
);

fs.writeFileSync('prisma/test-staff-failures-phase1.ts', p1);
console.log('Successfully updated prisma/test-staff-failures-phase1.ts');

// 2. Update prisma/test-crm-correctness.ts
let crm = fs.readFileSync('prisma/test-crm-correctness.ts', 'utf8');

// Category 38.2
crm = crm.replace(
  /\/\/ 38\.2: Role Ceiling Enforcement for Staff[\s\S]*?assert\(\s*canSettings === false &&\s*canFinance === false &&\s*canSubscription === false &&\s*canTeam === false,\s*\"\[Phase F Role Ceiling\] Hard ceiling prevents staff from accessing SETTINGS, FINANCE, SUBSCRIPTION, or TEAM regardless of profile grants\"\s*\);/,
  `// 38.2: Role Ceiling Enforcement for Staff
  {
    const maliciousStaffGrants: any = {
      ...DEFAULT_STAFF_PERMISSIONS,
      SETTINGS: { view: true, update: true },
      FINANCE: { view: true, manage: true },
      SUBSCRIPTION: { view: true, manage: true },
      TEAM: { view: true, invite: true },
    };

    const canSettings = evaluateStaffPermission("AGENCY_STAFF", maliciousStaffGrants, "SETTINGS", "view");
    const canFinance = evaluateStaffPermission("AGENCY_STAFF", maliciousStaffGrants, "FINANCE", "view");
    const canSubscription = evaluateStaffPermission("AGENCY_STAFF", maliciousStaffGrants, "SUBSCRIPTION", "view");
    const canTeam = evaluateStaffPermission("AGENCY_STAFF", maliciousStaffGrants, "TEAM", "view");
    const canFinanceDelete = evaluateStaffPermission("AGENCY_STAFF", { FINANCE: { view: true, delete: true } }, "FINANCE", "delete");
    const canSettingsDelete = evaluateStaffPermission("AGENCY_STAFF", { SETTINGS: { view: true, delete: true } }, "SETTINGS", "delete");

    assert(
      canSettings === true &&
      canFinance === true &&
      canFinanceDelete === false &&
      canSettingsDelete === false &&
      canSubscription === false &&
      canTeam === false,
      "[Phase F Role Ceiling] Hard ceiling prevents staff from deleting FINANCE/SETTINGS and accessing SUBSCRIPTION or TEAM regardless of profile grants"
    );`
);

// Category 38.17
crm = crm.replace(
  /profile\.SETTINGS === undefined &&\s*profile\.FINANCE === undefined,/,
  `profile.SETTINGS.view === false &&\n      profile.FINANCE.view === false &&\n      profile.SUBSCRIPTION === undefined,`
);

fs.writeFileSync('prisma/test-crm-correctness.ts', crm);
console.log('Successfully updated prisma/test-crm-correctness.ts');
