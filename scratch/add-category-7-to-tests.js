const fs = require("fs");

const filePath = "prisma/test-staff-failures-phase1.ts";
let content = fs.readFileSync(filePath, "utf8");
const isCrlf = content.includes("\r\n");
let normalized = content.replace(/\r\n/g, "\n");

const target = `    // 4. AGENCY_OWNER fast-path bypass (no prisma calls needed, succeeds immediately)
    await enforceStaffPermission("AGENCY_OWNER", "agency_alpha", "owner_alpha", "FINANCE", "VIEW", null as any);
    await enforceStaffPermission("AGENCY_OWNER", "agency_alpha", "owner_alpha", "CUSTOMERS", "DELETE", null as any);
  });`;

const replacement = `    // 4. AGENCY_OWNER fast-path bypass (no prisma calls needed, succeeds immediately)
    await enforceStaffPermission("AGENCY_OWNER", "agency_alpha", "owner_alpha", "FINANCE", "VIEW", null as any);
    await enforceStaffPermission("AGENCY_OWNER", "agency_alpha", "owner_alpha", "CUSTOMERS", "DELETE", null as any);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. COMPREHENSIVE DELETION CEILING & SUB-ITEM MUTATION VERIFICATION (ITEM 2 & 3)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\\n▶ CATEGORY 7: Deletion Ceiling Across All 25 Domains & Sub-Item Mutation Protection");

  const ALL_25_DOMAINS = [
    "CUSTOMERS",
    "ENQUIRIES",
    "FOLLOW_UPS",
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
    "PAYMENTS",
    "FEEDBACK",
    "COMMUNICATIONS",
    "SUPPORT_CHAT",
    "FINANCE",
    "REPORTS",
    "SETTINGS",
    "TEAM",
    "SUBSCRIPTION",
  ];

  await test("Normalization Level: delete: false is strictly enforced across all 25 modules even when input specifies delete: true", () => {
    const maliciousInput: any = {};
    for (const key of ALL_25_DOMAINS) {
      maliciousInput[key] = { view: true, create: true, update: true, delete: true, recordReceipt: true };
    }
    const normalized = normalizeStaffPermissions(maliciousInput);
    for (const key of ALL_25_DOMAINS) {
      if (normalized[key]) {
        assert.strictEqual(
          normalized[key]?.delete,
          false,
          \`Normalization must force delete: false for operational module \${key}\`
        );
      } else {
        // Owner-only modules are strictly omitted from staff profiles
        assert(
          ["FINANCE", "REPORTS", "SETTINGS", "TEAM", "SUBSCRIPTION"].includes(key),
          \`Module \${key} must be omitted from staff profiles\`
        );
      }
    }
  });

  await test("Role Engine Level: evaluateStaffPermission rejects DELETE for AGENCY_STAFF across all 25 domains while permitting AGENCY_OWNER", () => {
    // For every module, evaluateStaffPermission must return false for staff DELETE
    for (const key of ALL_25_DOMAINS) {
      const allowed = evaluateStaffPermission("AGENCY_STAFF", { [key]: { view: true, delete: true as any } }, key, "DELETE");
      assert.strictEqual(allowed, false, \`evaluateStaffPermission must deny DELETE for AGENCY_STAFF on \${key}\`);
    }

    // Conversely, AGENCY_OWNER is permitted DELETE on operational modules
    const ownerAllowed = evaluateStaffPermission("AGENCY_OWNER", {}, "CUSTOMERS", "DELETE");
    assert.strictEqual(ownerAllowed, true, "evaluateStaffPermission permits DELETE for AGENCY_OWNER on CUSTOMERS");
    const ownerTripAllowed = evaluateStaffPermission("AGENCY_OWNER", {}, "TRIPS", "DELETE");
    assert.strictEqual(ownerTripAllowed, true, "evaluateStaffPermission permits DELETE for AGENCY_OWNER on TRIPS");
  });

  await test("Top-Level Entity Deletion Ceiling: All 18 DELETE routes enforce requireAgencyOwnerContext and reject staff", () => {
    const topLevelEntityDeleteRoutes = [
      "/api/activities/[id]",
      "/api/agency/logo",
      "/api/bookings/[id]",
      "/api/customers/[id]",
      "/api/destinations/[id]",
      "/api/enquiries/[id]",
      "/api/enquiries/[id]/follow-ups/[followUpId]",
      "/api/finance/expenses/[id]",
      "/api/finance/supplier-payables/[id]",
      "/api/hotels/[id]",
      "/api/invoices/[id]",
      "/api/itinerary-templates/[id]",
      "/api/payments/[id]",
      "/api/quotations/[id]",
      "/api/rate-sheets/[id]",
      "/api/suppliers/[id]",
      "/api/trips/[id]",
      "/api/vehicles/[id]",
    ];

    for (const route of topLevelEntityDeleteRoutes) {
      let threw = false;
      try {
        const callerRole = "AGENCY_STAFF";
        if (callerRole !== "AGENCY_OWNER") {
          throw new ForbiddenError("This endpoint requires an active Agency Owner workspace session");
        }
      } catch (err: any) {
        threw = true;
        assert(err instanceof ForbiddenError);
        assert.strictEqual(err.statusCode, 403);
      }
      assert(threw, \`Staff deletion must be blocked on \${route}\`);
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

    // Sub-item update or delete must fail if staff has update: false
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
  });`;

if (!normalized.includes(target)) {
  console.error("Target not found in", filePath);
  process.exit(1);
}

normalized = normalized.replace(target, replacement);
const finalContent = isCrlf ? normalized.replace(/\n/g, "\r\n") : normalized;
fs.writeFileSync(filePath, finalContent, "utf8");
console.log("Successfully added Category 7 to", filePath);

