const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'prisma/test-staff-failures-phase1.ts');
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// Also import PAGE_PERMISSIONS_REGISTRY in test-staff-failures-phase1.ts
if (!content.includes('PAGE_PERMISSIONS_REGISTRY,')) {
  content = content.replace(
    'DEFAULT_STAFF_PERMISSIONS,',
    'DEFAULT_STAFF_PERMISSIONS,\n  PAGE_PERMISSIONS_REGISTRY,'
  );
}

const oldBlock = `  await test("PAGE_PERMISSIONS_REGISTRY and DEFAULT_STAFF_PERMISSIONS define all 26 application pages with least-privilege defaults", () => {
    const expectedModules = [
      "DASHBOARD",
      "ENQUIRIES",
      "FOLLOW_UPS",
      "CUSTOMERS",
      "CUSTOMER_INSIGHTS",
      "TRIPS",
      "ITINERARIES",
      "QUOTATIONS",
      "BOOKINGS",
      "DOCUMENTS",
      "OPERATIONS",
      "DESTINATIONS",
      "HOTELS",
      "VEHICLES",
      "ACTIVITIES",
      "RATE_SHEETS",
      "SUPPLIERS",
      "INVOICES",
      "PAYMENTS",
      "FINANCE",
      "FEEDBACK",
      "REPORTS",
      "COMMUNICATIONS",
      "REFERRALS",
      "SETTINGS",
      "SUBSCRIPTION",
      "SUPPORT_CHAT",
    ];

    const definedModules = Object.keys(DEFAULT_STAFF_PERMISSIONS);
    for (const mod of expectedModules) {
      assert(definedModules.includes(mod), \`Expected module \${mod} to be defined in DEFAULT_STAFF_PERMISSIONS\`);
      const perms = DEFAULT_STAFF_PERMISSIONS[mod];
      assert.strictEqual(perms.delete, false, \`Module \${mod} must default to delete: false for staff\`);
    }

    // PAYMENTS receipt recording is false by default
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.PAYMENTS.recordReceipt, false);
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.PAYMENTS.view, true);
  });`;

const newBlock = `  await test("PAGE_PERMISSIONS_REGISTRY covers all 26 application pages and DEFAULT_STAFF_PERMISSIONS defines least-privilege defaults", () => {
    // 1. Verify PAGE_PERMISSIONS_REGISTRY covers all 26 pages + sub-sections
    const registryKeys = PAGE_PERMISSIONS_REGISTRY.map((p) => p.moduleKey);
    const expectedPages = [
      "DASHBOARD", "ENQUIRIES", "FOLLOW_UPS", "CUSTOMERS", "CUSTOMER_INSIGHTS",
      "TRIPS", "ITINERARIES", "QUOTATIONS", "BOOKINGS", "DOCUMENTS", "OPERATIONS",
      "DESTINATIONS", "HOTELS", "VEHICLES", "ACTIVITIES", "RATE_SHEETS", "SUPPLIERS",
      "INVOICES", "PAYMENTS", "FINANCE", "FEEDBACK", "REPORTS", "COMMUNICATIONS",
      "REFERRALS", "SETTINGS", "SUBSCRIPTION", "SUPPORT_CHAT"
    ];
    for (const pageKey of expectedPages) {
      assert(registryKeys.includes(pageKey), \`PAGE_PERMISSIONS_REGISTRY must register \${pageKey}\`);
    }

    // 2. Verify DEFAULT_STAFF_PERMISSIONS has operational defaults and excludes owner-only modules
    const operationalModules = [
      "DASHBOARD", "ENQUIRIES", "FOLLOW_UPS", "CUSTOMERS", "CUSTOMER_INSIGHTS",
      "TRIPS", "ITINERARIES", "QUOTATIONS", "BOOKINGS", "DOCUMENTS", "OPERATIONS",
      "DESTINATIONS", "HOTELS", "VEHICLES", "ACTIVITIES", "PAYMENTS", "FEEDBACK",
      "COMMUNICATIONS", "REFERRALS", "SUPPORT_CHAT"
    ];
    for (const mod of operationalModules) {
      assert(DEFAULT_STAFF_PERMISSIONS[mod] !== undefined, \`DEFAULT_STAFF_PERMISSIONS must define \${mod}\`);
      assert.strictEqual(DEFAULT_STAFF_PERMISSIONS[mod].delete, false, \`\${mod} must default to delete: false\`);
    }

    // Owner-only modules are strictly undefined in staff defaults
    const ownerOnlyModules = ["FINANCE", "INVOICES", "RATE_SHEETS", "SUPPLIERS", "REPORTS", "SETTINGS", "SUBSCRIPTION"];
    for (const mod of ownerOnlyModules) {
      assert.strictEqual(DEFAULT_STAFF_PERMISSIONS[mod], undefined, \`\${mod} must be undefined in staff defaults\`);
    }

    // PAYMENTS receipt recording is false by default
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.PAYMENTS.recordReceipt, false);
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.PAYMENTS.view, true);
  });`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(filePath, content.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully updated Cat 6 test in test-staff-failures-phase1.ts');
} else {
  console.error('oldBlock not found in test-staff-failures-phase1.ts');
}

