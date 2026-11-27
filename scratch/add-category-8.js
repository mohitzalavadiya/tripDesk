const fs = require('fs');
const path = require('path');

const testPath = path.resolve('prisma/test-staff-failures-phase1.ts');
let content = fs.readFileSync(testPath, 'utf8');

const marker = `    assert(errTripView instanceof ForbiddenError, "GET /api/trips/[id] must reject staff with TRIPS.view=false");
  });`;

const category8Tests = `    assert(errTripView instanceof ForbiddenError, "GET /api/trips/[id] must reject staff with TRIPS.view=false");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 8. GRANULAR PAGE-BY-PAGE INDEPENDENCE, DETAIL DECOUPLING & INVARIANTS
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\\n▶ CATEGORY 8: Granular Page-by-Page Independence, Detail Decoupling & Invariants");

  await test("PAGE_PERMISSIONS_REGISTRY defines unique page keys and deterministic metadata", () => {
    const keys = PAGE_PERMISSIONS_REGISTRY.map((p) => p.moduleKey);
    const uniqueKeys = new Set(keys);
    assert.strictEqual(keys.length, uniqueKeys.size, "All registry moduleKeys must be unique without duplicates");
    assert.strictEqual(keys.length, 33, "PAGE_PERMISSIONS_REGISTRY must contain exactly 33 canonical permission entries");

    // Verify all categories are represented
    const categories = new Set(PAGE_PERMISSIONS_REGISTRY.map((p) => p.category));
    assert(categories.has("CRM & Sales"));
    assert(categories.has("Trips & Bookings"));
    assert(categories.has("Catalog & Inventory"));
    assert(categories.has("Finance & Invoicing"));
    assert(categories.has("Engagement & Analytics"));
    assert(categories.has("Settings & Admin"));
  });

  await test("Customer List and Customer Detail permissions are 100% independent", () => {
    // Sub-case A: List view allowed, Detail view denied
    const listAllowedDetailDenied = {
      CUSTOMERS: { view: true, create: true, update: true, delete: false },
      CUSTOMER_DETAIL: { view: false, update: false, delete: false },
    };
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", listAllowedDetailDenied, "CUSTOMERS", "VIEW"),
      true,
      "CUSTOMERS view must be true"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", listAllowedDetailDenied, "CUSTOMER_DETAIL", "VIEW"),
      false,
      "CUSTOMER_DETAIL view must be false independently"
    );

    // Sub-case B: List view denied, Detail view allowed
    const listDeniedDetailAllowed = {
      CUSTOMERS: { view: false, create: false, update: false, delete: false },
      CUSTOMER_DETAIL: { view: true, update: true, delete: false },
    };
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", listDeniedDetailAllowed, "CUSTOMERS", "VIEW"),
      false,
      "CUSTOMERS view must be false"
    );
    assert.strictEqual(
      evaluateStaffPermission("AGENCY_STAFF", listDeniedDetailAllowed, "CUSTOMER_DETAIL", "VIEW"),
      true,
      "CUSTOMER_DETAIL view must be true independently"
    );
  });

  await test("Enquiry List and Enquiry Detail permissions are 100% independent", () => {
    const listAllowedDetailDenied = {
      ENQUIRIES: { view: true, create: true, update: true, delete: false },
      ENQUIRY_DETAIL: { view: false, update: false, delete: false },
    };
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", listAllowedDetailDenied, "ENQUIRIES", "VIEW"), true);
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", listAllowedDetailDenied, "ENQUIRY_DETAIL", "VIEW"), false);

    const listDeniedDetailAllowed = {
      ENQUIRIES: { view: false, create: false, update: false, delete: false },
      ENQUIRY_DETAIL: { view: true, update: true, delete: false },
    };
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", listDeniedDetailAllowed, "ENQUIRIES", "VIEW"), false);
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", listDeniedDetailAllowed, "ENQUIRY_DETAIL", "VIEW"), true);
  });

  await test("Trip List and Trip Detail permissions are 100% independent", () => {
    const listAllowedDetailDenied = {
      TRIPS: { view: true, create: true, update: true, delete: false },
      TRIP_DETAIL: { view: false, update: false, delete: false },
    };
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", listAllowedDetailDenied, "TRIPS", "VIEW"), true);
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", listAllowedDetailDenied, "TRIP_DETAIL", "VIEW"), false);

    const listDeniedDetailAllowed = {
      TRIPS: { view: false, create: false, update: false, delete: false },
      TRIP_DETAIL: { view: true, update: true, delete: false },
    };
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", listDeniedDetailAllowed, "TRIPS", "VIEW"), false);
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", listDeniedDetailAllowed, "TRIP_DETAIL", "VIEW"), true);
  });

  await test("Quotation, Booking and Operations Issues detail entries behave independently", () => {
    const mixedGrants = {
      QUOTATIONS: { view: true },
      QUOTATION_DETAIL: { view: false },
      BOOKINGS: { view: false },
      BOOKING_DETAIL: { view: true },
      OPERATIONS: { view: true },
      OPERATIONS_ISSUES: { view: false },
    };

    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", mixedGrants, "QUOTATIONS", "VIEW"), true);
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", mixedGrants, "QUOTATION_DETAIL", "VIEW"), false);
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", mixedGrants, "BOOKINGS", "VIEW"), false);
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", mixedGrants, "BOOKING_DETAIL", "VIEW"), true);
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", mixedGrants, "OPERATIONS", "VIEW"), true);
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", mixedGrants, "OPERATIONS_ISSUES", "VIEW"), false);
  });

  await test("Legacy permission profile safely resolves detail fallback without elevation", () => {
    // Legacy profile has only parent CUSTOMERS
    const legacyProfile = {
      CUSTOMERS: { view: true, update: true, delete: false },
    };
    // CUSTOMER_DETAIL is not in profile -> falls back safely to CUSTOMERS
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", legacyProfile, "CUSTOMER_DETAIL", "VIEW"), true);
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", legacyProfile, "CUSTOMER_DETAIL", "UPDATE"), true);
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", legacyProfile, "CUSTOMER_DETAIL", "DELETE"), false);

    // If parent CUSTOMERS has view: false, detail cannot be viewed
    const legacyDeniedProfile = {
      CUSTOMERS: { view: false, update: false, delete: false },
    };
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", legacyDeniedProfile, "CUSTOMER_DETAIL", "VIEW"), false);
  });

  await test("Detail page view prerequisite strictly disables child update and delete actions", () => {
    const invalidDetail = {
      CUSTOMER_DETAIL: { view: false, update: true, delete: true },
    };
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", invalidDetail, "CUSTOMER_DETAIL", "VIEW"), false);
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", invalidDetail, "CUSTOMER_DETAIL", "UPDATE"), false);
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", invalidDetail, "CUSTOMER_DETAIL", "DELETE"), false);
  });

  await test("Delegable Delete on detail pages survives normalization and enforces role authorization", () => {
    const delegableDetailInput = {
      CUSTOMER_DETAIL: { view: true, update: true, delete: true },
      ENQUIRY_DETAIL: { view: true, update: true, delete: false },
      TRIP_DETAIL: { view: true, update: true, delete: true },
    };

    const normalized = normalizeStaffPermissions(delegableDetailInput);
    assert.strictEqual(normalized.CUSTOMER_DETAIL.delete, true, "CUSTOMER_DETAIL delete must be preserved");
    assert.strictEqual(normalized.ENQUIRY_DETAIL.delete, false, "ENQUIRY_DETAIL delete must be false");
    assert.strictEqual(normalized.TRIP_DETAIL.delete, true, "TRIP_DETAIL delete must be preserved");

    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", normalized, "CUSTOMER_DETAIL", "DELETE"), true);
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", normalized, "ENQUIRY_DETAIL", "DELETE"), false);
    assert.strictEqual(evaluateStaffPermission("AGENCY_STAFF", normalized, "TRIP_DETAIL", "DELETE"), true);
  });`;

content = content.replace(/\r\n/g, '\n');
if (content.includes(marker.replace(/\r\n/g, '\n'))) {
  content = content.replace(marker.replace(/\r\n/g, '\n'), category8Tests);
  fs.writeFileSync(testPath, content, 'utf8');
  console.log("Successfully appended Category 8 tests to prisma/test-staff-failures-phase1.ts!");
} else {
  console.error("Could not find marker to append Category 8 tests");
}

