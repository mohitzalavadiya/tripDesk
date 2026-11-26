const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

// 1. Patch prisma/test-staff-failures-phase1.ts
const failuresTestPath = path.join(rootDir, 'prisma/test-staff-failures-phase1.ts');
let failuresContent = fs.readFileSync(failuresTestPath, 'utf8').replace(/\r\n/g, '\n');

// Replace Category 6 & 7 in test-staff-failures-phase1.ts
const cat6OldStart = `  // ──────────────────────────────────────────────────────────────────────────\n  // 6. STAFF PERMISSIONS 25-DOMAIN INVARIANTS, REDACTION, & DYNAMIC ENFORCEMENT\n  // ──────────────────────────────────────────────────────────────────────────`;
const cat6NewContent = `  // ──────────────────────────────────────────────────────────────────────────
  // 6. STAFF PERMISSIONS 26-PAGE REGISTRY, REDACTION, & DYNAMIC ENFORCEMENT
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\\n▶ CATEGORY 6: Staff Permissions 26-Page Registry, Redaction, & Dynamic Enforcement");

  await test("PAGE_PERMISSIONS_REGISTRY and DEFAULT_STAFF_PERMISSIONS define all 26 application pages with least-privilege defaults", () => {
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
  });

  await test("normalizeStaffPermissions permits delete: true ONLY for delegable operational modules and forces delete: false for others", () => {
    const delegableInput = {
      CUSTOMERS: { view: true, create: true, update: true, delete: true },
      TRIPS: { view: true, delete: true },
      PAYMENTS: { view: true, delete: true, recordReceipt: true }, // Payments delete is non-delegable
    };

    const normalized = normalizeStaffPermissions(delegableInput);
    assert.strictEqual(normalized.CUSTOMERS.delete, true, "CUSTOMERS delete can be delegated when view is true");
    assert.strictEqual(normalized.TRIPS.delete, true, "TRIPS delete can be delegated when view is true");
    assert.strictEqual(normalized.PAYMENTS.delete, false, "PAYMENTS delete is non-delegable and forced false");
    assert.strictEqual(normalized.PAYMENTS.recordReceipt, true, "PAYMENTS recordReceipt preserved");
  });

  await test("normalizeStaffPermissions enforces view prerequisite (view=false forces child actions to false)", () => {
    const invalidInput = {
      CUSTOMERS: { view: false, create: true, update: true, delete: true },
      PAYMENTS: { view: false, recordReceipt: true },
      TRIPS: { view: false, create: true, delete: true },
    };

    const normalized = normalizeStaffPermissions(invalidInput);
    assert.strictEqual(normalized.CUSTOMERS.view, false);
    assert.strictEqual(normalized.CUSTOMERS.create, false, "create forced to false when view is false");
    assert.strictEqual(normalized.CUSTOMERS.update, false, "update forced to false when view is false");
    assert.strictEqual(normalized.CUSTOMERS.delete, false, "delete forced to false when view is false");
    assert.strictEqual(normalized.PAYMENTS.view, false);
    assert.strictEqual(normalized.PAYMENTS.recordReceipt, undefined, "recordReceipt discarded when view is false");
    assert.strictEqual(normalized.TRIPS.create, false, "TRIPS create forced to false when view is false");
    assert.strictEqual(normalized.TRIPS.delete, false, "TRIPS delete forced to false when view is false");
  });

  await test("normalizeStaffPermissions permanently locks owner-only modules regardless of input", () => {
    const ownerOnlyAttempt = {
      FINANCE: { view: true, create: true, update: true, delete: true },
      INVOICES: { view: true, create: true, delete: true },
      RATE_SHEETS: { view: true, create: true, delete: true },
      SUPPLIERS: { view: true, create: true, delete: true },
      REPORTS: { view: true, export: true },
      SETTINGS: { view: true, update: true },
      TEAM: { view: true, create: true },
      SUBSCRIPTION: { view: true, manage: true },
    };

    const normalized = normalizeStaffPermissions(ownerOnlyAttempt);
    for (const mod of Object.keys(ownerOnlyAttempt)) {
      assert.strictEqual(normalized[mod], undefined, \`\${mod} must be strictly omitted from staff profiles\`);
      assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", normalized, mod, "VIEW"), false);
      assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", normalized, mod, "DELETE"), false);
    }
  });

  await test("redactStaffFinancials completely strips confidential commercial fields for AGENCY_STAFF", () => {
    const sensitivePayload = {
      id: "rs_hotel_01",
      name: "Deluxe Resort Rates",
      currency: "USD",
      customerPrice: 250,
      netRate: 180,
      supplierCost: 175,
      markupPercent: 25,
      markupAmount: 70,
      grossProfit: 75,
      grossMargin: 75,
      supplierPayables: 175,
      supplierPaid: 100,
      internalNotes: "Special negotiated contract for 2026",
      items: [
        {
          id: "item_01",
          name: "Standard Suite",
          sellingPrice: 250,
          costPrice: 175,
          netCost: 170,
        },
      ],
    };

    const staffView = redactStaffFinancials(sensitivePayload, "AGENCY_STAFF");
    assert.strictEqual(staffView.id, "rs_hotel_01");
    assert.strictEqual(staffView.name, "Deluxe Resort Rates");
    assert.strictEqual(staffView.customerPrice, 250);
    assert.strictEqual((staffView as any).netRate, undefined, "netRate must be redacted for staff");
    assert.strictEqual((staffView as any).supplierCost, undefined, "supplierCost must be redacted for staff");
    assert.strictEqual((staffView as any).markupPercent, undefined, "markupPercent must be redacted for staff");
    assert.strictEqual((staffView as any).markupAmount, undefined, "markupAmount must be redacted for staff");
    assert.strictEqual((staffView as any).grossProfit, undefined, "grossProfit must be redacted for staff");
    assert.strictEqual((staffView as any).grossMargin, undefined, "grossMargin must be redacted for staff");
    assert.strictEqual((staffView as any).supplierPayables, undefined, "supplierPayables must be redacted for staff");
    assert.strictEqual((staffView as any).supplierPaid, undefined, "supplierPaid must be redacted for staff");
    assert.strictEqual((staffView as any).internalNotes, undefined, "internalNotes must be redacted for staff");
    assert.strictEqual((staffView.items[0] as any).costPrice, undefined, "nested costPrice must be redacted for staff");
    assert.strictEqual((staffView.items[0] as any).netCost, undefined, "nested netCost must be redacted for staff");
    assert.strictEqual(staffView.items[0].sellingPrice, 250, "sellingPrice preserved for staff");

    const ownerView = redactStaffFinancials(sensitivePayload, "AGENCY_OWNER");
    assert.strictEqual((ownerView as any).netRate, 180, "netRate preserved for owner");
    assert.strictEqual((ownerView as any).supplierCost, 175, "supplierCost preserved for owner");
    assert.strictEqual((ownerView as any).markupPercent, 25, "markupPercent preserved for owner");
    assert.strictEqual((ownerView.items[0] as any).costPrice, 175, "costPrice preserved for owner");
  });

  await test("toStaffSafeQuotationDTO strips internal markup and item supplier costs for staff", () => {
    const quotation = {
      id: "quot_001",
      title: "Maldives Luxury Escape",
      totalPrice: 5000,
      markupPercentage: 15,
      markupAmount: 650,
      internalNotes: "VVIP customer, VIP complimentary transfer added",
      items: [
        {
          id: "qi_01",
          name: "Overwater Villa 3 Nights",
          sellingPrice: 3500,
          costPrice: 2800,
          supplierCost: 2800,
          netRate: 2800,
          markupPercent: 20,
        },
      ],
    };

    const safeQuotation = toStaffSafeQuotationDTO(quotation);
    assert.strictEqual(safeQuotation.id, "quot_001");
    assert.strictEqual(safeQuotation.totalPrice, 5000);
    assert.strictEqual((safeQuotation as any).markupPercentage, undefined);
    assert.strictEqual((safeQuotation as any).markupAmount, undefined);
    assert.strictEqual((safeQuotation as any).internalNotes, undefined);
    assert.strictEqual((safeQuotation.items[0] as any).costPrice, undefined);
    assert.strictEqual((safeQuotation.items[0] as any).supplierCost, undefined);
    assert.strictEqual((safeQuotation.items[0] as any).netRate, undefined);
    assert.strictEqual(safeQuotation.items[0].sellingPrice, 3500);
  });

  await test("evaluateStaffPermission honors role ceiling, configurable delete, and module permissions", () => {
    // 1. AGENCY_OWNER always returns true for agency domains
    assert.strictEqual(evaluateStaffPermission("AGENCY_OWNER", {}, "FINANCE", "VIEW"), true);
    assert.strictEqual(evaluateStaffPermission("AGENCY_OWNER", {}, "CUSTOMERS", "DELETE"), true);
    assert.strictEqual(evaluateStaffPermission("AGENCY_OWNER", {}, "RATE_SHEETS", "UPDATE"), true);

    // 2. AGENCY_STAFF delete is allowed ONLY when explicitly granted on delegable module
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { CUSTOMERS: { view: true, delete: true } }, "CUSTOMERS", "DELETE"),
      true,
      "Staff delete must evaluate to true when granted on delegable module"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { CUSTOMERS: { view: true, delete: false } }, "CUSTOMERS", "DELETE"),
      false,
      "Staff delete must evaluate to false when not granted"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { PAYMENTS: { view: true, delete: true } }, "PAYMENTS", "DELETE"),
      false,
      "Non-delegable PAYMENTS delete must always evaluate to false"
    );

    // 3. AGENCY_STAFF role ceiling prevents owner-only domains
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { FINANCE: { view: true } }, "FINANCE", "VIEW"),
      false,
      "FINANCE is owner-only"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { INVOICES: { view: true } }, "INVOICES", "VIEW"),
      false,
      "INVOICES is owner-only"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { RATE_SHEETS: { view: true } }, "RATE_SHEETS", "VIEW"),
      false,
      "RATE_SHEETS is owner-only"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { SUPPLIERS: { view: true } }, "SUPPLIERS", "VIEW"),
      false,
      "SUPPLIERS is owner-only"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { SETTINGS: { view: true } }, "SETTINGS", "VIEW"),
      false,
      "SETTINGS is owner-only"
    );

    // 4. AGENCY_STAFF view prerequisite
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { CUSTOMERS: { view: false, create: true, delete: true } }, "CUSTOMERS", "CREATE"),
      false,
      "create without view must evaluate to false"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { CUSTOMERS: { view: false, create: true, delete: true } }, "CUSTOMERS", "DELETE"),
      false,
      "delete without view must evaluate to false"
    );

    // 5. AGENCY_STAFF valid permission grant
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { CUSTOMERS: { view: true, create: true } }, "CUSTOMERS", "CREATE"),
      true,
      "create with view must evaluate to true"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", { CUSTOMERS: { view: true, create: false } }, "CUSTOMERS", "CREATE"),
      false,
      "un-granted create must evaluate to false"
    );
  });

  await test("enforceStaffPermission throws ForbiddenError for unauthorized staff actions and succeeds for authorized staff / owners", async () => {
    const mockPrismaClient: any = {
      __mockHasStaffPermissionProfileTable: true,
      user: {
        findFirst: async () => ({ id: "staff_test_01", agencyId: "agency_alpha", role: "AGENCY_STAFF" }),
      },
      staffPermissionProfile: {
        findUnique: async () => ({
          userId: "staff_test_01",
          permissions: {
            CUSTOMERS: { view: true, create: false, update: false, delete: false },
            DESTINATIONS: { view: true, create: false, update: false, delete: true },
            HOTELS: { view: true, create: false, update: false, delete: false },
            PAYMENTS: { view: true, recordReceipt: false, delete: false },
          },
        }),
      },
    };

    // 1. Authorized action: CUSTOMERS VIEW
    await enforceStaffPermission("AGENCY_STAFF", "agency_alpha", "staff_test_01", "CUSTOMERS", "VIEW", mockPrismaClient);

    // 2. Unauthorized action: CUSTOMERS CREATE
    let errorCaught: any = null;
    try {
      await enforceStaffPermission("AGENCY_STAFF", "agency_alpha", "staff_test_01", "CUSTOMERS", "CREATE", mockPrismaClient);
    } catch (err: any) {
      errorCaught = err;
    }
    assert(errorCaught instanceof ForbiddenError, "Expected ForbiddenError for unauthorized CUSTOMERS.CREATE");
    assert.strictEqual(errorCaught.statusCode, 403);

    // 3. Authorized delegable delete: DESTINATIONS DELETE
    await enforceStaffPermission("AGENCY_STAFF", "agency_alpha", "staff_test_01", "DESTINATIONS", "DELETE", mockPrismaClient);

    // 4. Unauthorized delegable delete: CUSTOMERS DELETE (delete=false)
    errorCaught = null;
    try {
      await enforceStaffPermission("AGENCY_STAFF", "agency_alpha", "staff_test_01", "CUSTOMERS", "DELETE", mockPrismaClient);
    } catch (err: any) {
      errorCaught = err;
    }
    assert(errorCaught instanceof ForbiddenError, "Expected ForbiddenError for CUSTOMERS.DELETE when delete=false");

    // 5. AGENCY_OWNER fast-path bypass (no prisma calls needed, succeeds immediately)
    await enforceStaffPermission("AGENCY_OWNER", "agency_alpha", "owner_alpha", "FINANCE", "VIEW", null as any);
    await enforceStaffPermission("AGENCY_OWNER", "agency_alpha", "owner_alpha", "CUSTOMERS", "DELETE", null as any);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. COMPREHENSIVE DELETION SEPARATION & NAVIGATION VISIBILITY
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\\n▶ CATEGORY 7: Configurable Deletions, Owner-Only Boundaries & Navigation Visibility");

  await test("Configurable Deletion: When Owner grants delete: true for delegable modules, staff can delete; when denied (default), staff is rejected", async () => {
    const delegableModules = [
      "CUSTOMERS",
      "ENQUIRIES",
      "FOLLOW_UPS",
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
      "FEEDBACK",
      "REFERRALS",
    ];

    for (const mod of delegableModules) {
      // Default: delete is false
      assert.strictEqual(
        evaluateStaffPermission("AGENCY_STAFF", { [mod]: { view: true, delete: false } }, mod, "DELETE"),
        false,
        \`\${mod} must be rejected when delete: false\`
      );

      // Granted: delete is true
      assert.strictEqual(
        evaluateStaffPermission("AGENCY_STAFF", { [mod]: { view: true, delete: true } }, mod, "DELETE"),
        true,
        \`\${mod} must be permitted when delete: true\`
      );
    }
  });

  await test("Permanent Owner-Only Boundary: Truly immutable modules remain strictly protected and cannot be deleted or accessed by staff", () => {
    const immutableModules = [
      "FINANCE",
      "INVOICES",
      "RATE_SHEETS",
      "SUPPLIERS",
      "REPORTS",
      "SETTINGS",
      "SUBSCRIPTION",
      "TEAM",
      "PAYMENTS",
    ];

    for (const mod of immutableModules) {
      assert.strictEqual(
        evaluateStaffPermission("AGENCY_STAFF", { [mod]: { view: true, delete: true as any } }, mod, "DELETE"),
        false,
        \`Immutable module \${mod} cannot be deleted by staff\`
      );
    }
  });

  await test("Sidebar & Navigation Visibility: All 26 application pages remain visible in navigation for staff", () => {
    const expectedRoutes = [
      "/dashboard",
      "/enquiries",
      "/follow-ups",
      "/customers",
      "/customer-insights",
      "/trips",
      "/quotations",
      "/bookings",
      "/documents",
      "/operations",
      "/destinations",
      "/hotels",
      "/vehicles",
      "/activities",
      "/rate-sheets",
      "/suppliers",
      "/finance",
      "/invoices",
      "/payments",
      "/feedback",
      "/reports",
      "/communications",
      "/referrals",
      "/settings",
      "/subscription",
      "/support",
    ];

    const allNavItems = agencyNavigationConfig.flatMap((s) => s.items.map((i) => i.href));
    assert.strictEqual(allNavItems.length, 26, "Expected exactly 26 items in agency navigation");

    for (const route of expectedRoutes) {
      assert(allNavItems.includes(route), \`Navigation must include route \${route}\`);
    }
  });

  await test("Sub-Item Mutation Protection: Staff lacking UPDATE capability cannot modify or delete sub-items", async () => {
    const mockStaffReadOnly: any = {
      __mockHasStaffPermissionProfileTable: true,
      user: {
        findFirst: async () => ({ id: "staff_ro", agencyId: "agency_alpha", role: "AGENCY_STAFF" }),
      },
      staffPermissionProfile: {
        findUnique: async () => ({
          userId: "staff_ro",
          permissions: {
            TRIPS: { view: true, create: false, update: false, delete: false },
            QUOTATIONS: { view: true, create: false, update: false, delete: false },
            ITINERARIES: { view: true, create: false, update: false, delete: false },
          },
        }),
      },
    };

    let errTripSub: any = null;
    try {
      await enforceStaffPermission("AGENCY_STAFF", "agency_alpha", "staff_ro", "TRIPS", "UPDATE", mockStaffReadOnly);
    } catch (e: any) {
      errTripSub = e;
    }
    assert(errTripSub instanceof ForbiddenError, "Trip sub-item edit must require TRIPS.UPDATE");

    let errQuotSub: any = null;
    try {
      await enforceStaffPermission("AGENCY_STAFF", "agency_alpha", "staff_ro", "QUOTATIONS", "UPDATE", mockStaffReadOnly);
    } catch (e: any) {
      errQuotSub = e;
    }
    assert(errQuotSub instanceof ForbiddenError, "Quotation sub-item edit must require QUOTATIONS.UPDATE");

    let errItinSub: any = null;
    try {
      await enforceStaffPermission("AGENCY_STAFF", "agency_alpha", "staff_ro", "ITINERARIES", "UPDATE", mockStaffReadOnly);
    } catch (e: any) {
      errItinSub = e;
    }
    assert(errItinSub instanceof ForbiddenError, "Itinerary sub-item edit must require ITINERARIES.UPDATE");
  });

  await test("Detail Endpoint Protection: Staff lacking VIEW capability cannot access single quotation or trip detail", async () => {
    const mockStaffNoView: any = {
      __mockHasStaffPermissionProfileTable: true,
      user: {
        findFirst: async () => ({ id: "staff_noview", agencyId: "agency_alpha", role: "AGENCY_STAFF" }),
      },
      staffPermissionProfile: {
        findUnique: async () => ({
          userId: "staff_noview",
          permissions: {
            TRIPS: { view: false, create: false, update: false, delete: false },
            QUOTATIONS: { view: false, create: false, update: false, delete: false },
          },
        }),
      },
    };

    let errQuotView: any = null;
    try {
      await enforceStaffPermission("AGENCY_STAFF", "agency_alpha", "staff_noview", "QUOTATIONS", "VIEW", mockStaffNoView);
    } catch (e: any) {
      errQuotView = e;
    }
    assert(errQuotView instanceof ForbiddenError, "GET /api/quotations/[id] must reject staff with QUOTATIONS.view=false");

    let errTripView: any = null;
    try {
      await enforceStaffPermission("AGENCY_STAFF", "agency_alpha", "staff_noview", "TRIPS", "VIEW", mockStaffNoView);
    } catch (e: any) {
      errTripView = e;
    }
    assert(errTripView instanceof ForbiddenError, "GET /api/trips/[id] must reject staff with TRIPS.view=false");
  });
`;

const cat6Idx = failuresContent.indexOf(cat6OldStart);
if (cat6Idx !== -1) {
  const runnerStart = failuresContent.indexOf('\n  console.log("\\n================================================================================");\n  console.log(`  PHASE 1 VERIFICATION RESULT: ${passed}/${total} TESTS PASSED (100%)`);');
  if (runnerStart !== -1) {
    failuresContent = failuresContent.substring(0, cat6Idx) + cat6NewContent + failuresContent.substring(runnerStart);
    fs.writeFileSync(failuresTestPath, failuresContent.replace(/\n/g, '\r\n'), 'utf8');
    console.log('Successfully updated prisma/test-staff-failures-phase1.ts');
  } else {
    console.error('Could not find runner start in test-staff-failures-phase1.ts');
  }
} else {
  console.error('Could not find Cat 6 start in test-staff-failures-phase1.ts');
}

// 2. Patch prisma/test-staff-application-wide-authorization.ts
const appWidePath = path.join(rootDir, 'prisma/test-staff-application-wide-authorization.ts');
let appWideContent = fs.readFileSync(appWidePath, 'utf8').replace(/\r\n/g, '\n');

// Update Category 4 to test delegable vs immutable deletions
const cat4Old = `  // ─── CATEGORY 4: DESTRUCTIVE ACTION HARDENING (Owner-Only Deletions) ─────────
  setCategory(4);
  console.log("\\n▶ CATEGORY 4: Destructive Operation Hardening (Staff Deletion Ceiling)");
  {
    const destructiveEntities = [
      { name: "Invoices", route: "DELETE /api/invoices/[id]" },
      { name: "Suppliers", route: "DELETE /api/suppliers/[id]" },
      { name: "Rate Sheets", route: "DELETE /api/rate-sheets/[id]" },
      { name: "Hotels", route: "DELETE /api/hotels/[id]" },
      { name: "Destinations", route: "DELETE /api/destinations/[id]" },
      { name: "Vehicles", route: "DELETE /api/vehicles/[id]" },
      { name: "Activities", route: "DELETE /api/activities/[id]" },
      { name: "Itinerary Templates", route: "DELETE /api/itinerary-templates/[id]" },
      { name: "Expenses", route: "DELETE /api/finance/expenses/[id]" },
      { name: "Supplier Payables", route: "DELETE /api/finance/supplier-payables/[id]" },
    ];

    for (const entity of destructiveEntities) {
      const ownerCtx = simulateRequireAgencyOwnerContext(mockOwnerUser);
      assert(Boolean(ownerCtx), \`\${entity.route}: Owner admitted to perform deletion\`);

      let staffErr: any = null;
      try {
        simulateRequireAgencyOwnerContext(mockStaffUser);
      } catch (e) {
        staffErr = e;
      }
      assert(
        staffErr instanceof ForbiddenError,
        \`\${entity.route}: Staff strictly blocked from deletion with HTTP 403\`
      );
    }
  }`;

const cat4New = `  // ─── CATEGORY 4: DESTRUCTIVE ACTION HARDENING (Delegable vs Immutable Deletions) ──
  setCategory(4);
  console.log("\\n▶ CATEGORY 4: Destructive Operation Hardening (Delegable vs Immutable Deletions)");
  {
    // 1. Truly immutable owner-only deletion routes
    const immutableOwnerDeletions = [
      { name: "Invoices", route: "DELETE /api/invoices/[id]" },
      { name: "Suppliers", route: "DELETE /api/suppliers/[id]" },
      { name: "Rate Sheets", route: "DELETE /api/rate-sheets/[id]" },
      { name: "Expenses", route: "DELETE /api/finance/expenses/[id]" },
      { name: "Supplier Payables", route: "DELETE /api/finance/supplier-payables/[id]" },
      { name: "Payments", route: "DELETE /api/payments/[id]" },
    ];

    for (const entity of immutableOwnerDeletions) {
      const ownerCtx = simulateRequireAgencyOwnerContext(mockOwnerUser);
      assert(Boolean(ownerCtx), \`\${entity.route}: Owner admitted to perform deletion\`);

      let staffErr: any = null;
      try {
        simulateRequireAgencyOwnerContext(mockStaffUser);
      } catch (e) {
        staffErr = e;
      }
      assert(
        staffErr instanceof ForbiddenError,
        \`\${entity.route}: Staff strictly blocked from deletion with HTTP 403\`
      );
    }

    // 2. Delegable operational deletion routes (permitted when Owner delegates delete: true, blocked by default)
    const delegableModules = ["CUSTOMERS", "ENQUIRIES", "TRIPS", "QUOTATIONS", "BOOKINGS", "DESTINATIONS", "HOTELS", "VEHICLES", "ACTIVITIES", "ITINERARIES"];
    for (const mod of delegableModules) {
      // Default: delete is false -> staff blocked
      const denied = !evaluateStaffPermission("AGENCY_STAFF", { [mod]: { view: true, delete: false } }, mod, "DELETE");
      assert(denied, \`Staff is blocked by default from deleting \${mod}\`);

      // Delegated: delete is true -> staff permitted
      const allowed = evaluateStaffPermission("AGENCY_STAFF", { [mod]: { view: true, delete: true } }, mod, "DELETE");
      assert(allowed, \`Staff is permitted to delete \${mod} when Owner grants delete: true\`);
    }
  }`;

// Update Category 8 to verify that all 26 pages remain visible in navigation for staff
const cat8Old = `  // ─── CATEGORY 8: CLIENT-SIDE LEAST-PRIVILEGE & NAVIGATION ───────────────────
  setCategory(8);
  console.log("\\n▶ CATEGORY 8: Client-Side Least-Privilege & Owner-Only Navigation");
  {
    const filterSections = (isAgencyOwner: boolean) =>
      agencyNavigationConfig
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.ownerOnly || isAgencyOwner),
        }))
        .filter((section) => section.items.length > 0);

    const ownerSections = filterSections(true);
    const staffSections = filterSections(false);

    const allOwnerItems = ownerSections.flatMap((s) => s.items.map((i) => i.href));
    assert(allOwnerItems.includes("/finance"), "Sidebar: /finance is visible for Agency Owner");
    assert(allOwnerItems.includes("/reports"), "Sidebar: /reports is visible for Agency Owner");
    assert(allOwnerItems.includes("/rate-sheets"), "Sidebar: /rate-sheets is visible for Agency Owner");
    assert(allOwnerItems.includes("/customer-insights"), "Sidebar: /customer-insights is visible for Agency Owner");
    assert(allOwnerItems.includes("/settings"), "Sidebar: /settings is visible for Agency Owner");
    assert(allOwnerItems.includes("/subscription"), "Sidebar: /subscription is visible for Agency Owner");

    const allStaffItems = staffSections.flatMap((s) => s.items.map((i) => i.href));
    assert(!allStaffItems.includes("/finance"), "Sidebar: /finance is HIDDEN for Agency Staff");
    assert(!allStaffItems.includes("/reports"), "Sidebar: /reports is HIDDEN for Agency Staff");
    assert(!allStaffItems.includes("/rate-sheets"), "Sidebar: /rate-sheets is HIDDEN for Agency Staff");
    assert(!allStaffItems.includes("/customer-insights"), "Sidebar: /customer-insights is HIDDEN for Agency Staff");
    assert(!allStaffItems.includes("/settings"), "Sidebar: /settings is HIDDEN for Agency Staff");
    assert(!allStaffItems.includes("/subscription"), "Sidebar: /subscription is HIDDEN for Agency Staff");

    assert(allStaffItems.includes("/dashboard"), "Sidebar: /dashboard is accessible to staff");
    assert(allStaffItems.includes("/enquiries"), "Sidebar: /enquiries is accessible to staff");
    assert(allStaffItems.includes("/trips"), "Sidebar: /trips is accessible to staff");
    assert(allStaffItems.includes("/quotations"), "Sidebar: /quotations is accessible to staff");
    assert(allStaffItems.includes("/bookings"), "Sidebar: /bookings is accessible to staff");
    assert(allStaffItems.includes("/customers"), "Sidebar: /customers is accessible to staff");
    assert(allStaffItems.includes("/payments"), "Sidebar: /payments is accessible to staff");
    assert(allStaffItems.includes("/feedback"), "Sidebar: /feedback is accessible to staff");
  }`;

const cat8New = `  // ─── CATEGORY 8: CLIENT-SIDE LEAST-PRIVILEGE & NAVIGATION ───────────────────
  setCategory(8);
  console.log("\\n▶ CATEGORY 8: Client-Side Least-Privilege & Navigation Visibility");
  {
    // Requirement 3: Every application page remains visible in the sidebar & navigation for all users
    const allNavItems = agencyNavigationConfig.flatMap((s) => s.items.map((i) => i.href));
    assert(allNavItems.length === 26, "agencyNavigationConfig defines all 26 application pages");

    // All pages remain visible for both Agency Owner and Agency Staff
    assert(allNavItems.includes("/dashboard"), "Sidebar: /dashboard is visible in navigation");
    assert(allNavItems.includes("/enquiries"), "Sidebar: /enquiries is visible in navigation");
    assert(allNavItems.includes("/follow-ups"), "Sidebar: /follow-ups is visible in navigation");
    assert(allNavItems.includes("/customers"), "Sidebar: /customers is visible in navigation");
    assert(allNavItems.includes("/customer-insights"), "Sidebar: /customer-insights is visible in navigation");
    assert(allNavItems.includes("/trips"), "Sidebar: /trips is visible in navigation");
    assert(allNavItems.includes("/quotations"), "Sidebar: /quotations is visible in navigation");
    assert(allNavItems.includes("/bookings"), "Sidebar: /bookings is visible in navigation");
    assert(allNavItems.includes("/documents"), "Sidebar: /documents is visible in navigation");
    assert(allNavItems.includes("/operations"), "Sidebar: /operations is visible in navigation");
    assert(allNavItems.includes("/destinations"), "Sidebar: /destinations is visible in navigation");
    assert(allNavItems.includes("/hotels"), "Sidebar: /hotels is visible in navigation");
    assert(allNavItems.includes("/vehicles"), "Sidebar: /vehicles is visible in navigation");
    assert(allNavItems.includes("/activities"), "Sidebar: /activities is visible in navigation");
    assert(allNavItems.includes("/rate-sheets"), "Sidebar: /rate-sheets is visible in navigation");
    assert(allNavItems.includes("/suppliers"), "Sidebar: /suppliers is visible in navigation");
    assert(allNavItems.includes("/finance"), "Sidebar: /finance is visible in navigation");
    assert(allNavItems.includes("/invoices"), "Sidebar: /invoices is visible in navigation");
    assert(allNavItems.includes("/payments"), "Sidebar: /payments is visible in navigation");
    assert(allNavItems.includes("/feedback"), "Sidebar: /feedback is visible in navigation");
    assert(allNavItems.includes("/reports"), "Sidebar: /reports is visible in navigation");
    assert(allNavItems.includes("/communications"), "Sidebar: /communications is visible in navigation");
    assert(allNavItems.includes("/referrals"), "Sidebar: /referrals is visible in navigation");
    assert(allNavItems.includes("/settings"), "Sidebar: /settings is visible in navigation");
    assert(allNavItems.includes("/subscription"), "Sidebar: /subscription is visible in navigation");
    assert(allNavItems.includes("/support"), "Sidebar: /support is visible in navigation");
  }`;

if (appWideContent.includes(cat4Old)) {
  appWideContent = appWideContent.replace(cat4Old, cat4New);
} else {
  console.error('cat4Old not found in test-staff-application-wide-authorization.ts');
}

if (appWideContent.includes(cat8Old)) {
  appWideContent = appWideContent.replace(cat8Old, cat8New);
} else {
  console.error('cat8Old not found in test-staff-application-wide-authorization.ts');
}

fs.writeFileSync(appWidePath, appWideContent.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully updated prisma/test-staff-application-wide-authorization.ts');

