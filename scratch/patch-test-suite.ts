import * as fs from "fs";
import * as path from "path";

const targetPath = path.resolve("prisma/test-staff-failures-phase1.ts");
let raw = fs.readFileSync(targetPath, "utf8");
const isCRLF = raw.includes("\r\n");
let content = raw.replace(/\r\n/g, "\n");

const cat4Target = `  // ──────────────────────────────────────────────────────────────────────────
  // 4. CRITICAL STAFF PERMISSION PROFILE SAFETY CHECK (SECTION 5)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\\n▶ CATEGORY 4: Staff Permission Profile Safety & Fail-Closed Invariants");

  await test("Genuinely new staff member without custom profile deterministically resolves to DEFAULT_STAFF_PERMISSIONS", async () => {
    const mockPrismaNewStaff: any = {
      user: {
        findFirst: async () => ({ id: "usr_new_01", agencyId: "agency_alpha", role: "AGENCY_STAFF" }),
      },
      staffPermissionProfile: {
        findUnique: async () => null, // Query succeeded; user has no custom profile
      },
    };

    const permissions = await staffPermissionService.getStaffPermissions(
      "agency_alpha",
      "usr_new_01",
      mockPrismaNewStaff
    );

    assert.strictEqual(permissions.ENQUIRIES.view, true);
    assert.strictEqual(permissions.ENQUIRIES.create, true);
    assert.strictEqual(permissions.ENQUIRIES.delete, false);
    assert.strictEqual(permissions.TRIPS.view, true);
    assert.strictEqual(permissions.PAYMENTS.view, true);
    assert.strictEqual(permissions.PAYMENTS.recordReceipt, false);
  });

  await test("Staff member with custom profile resolves to custom grants", async () => {
    const mockCustomGrants = {
      ENQUIRIES: { view: true, create: false, update: false, delete: false },
      PAYMENTS: { view: false, recordReceipt: false, delete: false },
    };

    const mockPrismaCustomStaff: any = {
      user: {
        findFirst: async () => ({ id: "usr_custom_01", agencyId: "agency_alpha", role: "AGENCY_STAFF" }),
      },
      staffPermissionProfile: {
        findUnique: async () => ({
          userId: "usr_custom_01",
          permissions: mockCustomGrants,
        }),
      },
    };

    const permissions = await staffPermissionService.getStaffPermissions(
      "agency_alpha",
      "usr_custom_01",
      mockPrismaCustomStaff
    );

    assert.strictEqual(permissions.ENQUIRIES.view, true);
    assert.strictEqual(permissions.ENQUIRIES.create, false);
    assert.strictEqual(permissions.PAYMENTS.view, false);
  });

  await test("Database or missing-table failure does NOT return permissive defaults; fails closed safely", async () => {
    let loggedError: any = null;
    const origError = console.error;
    console.error = (...args: any[]) => {
      loggedError = args;
    };

    try {
      const mockPrismaDbError: any = {
        user: {
          findFirst: async () => ({ id: "usr_err_01", agencyId: "agency_alpha", role: "AGENCY_STAFF" }),
        },
        staffPermissionProfile: {
          findUnique: async () => {
            const err: any = new Error('The table public.staff_permission_profiles does not exist in the current database.');
            err.code = "P2021";
            throw err;
          },
        },
      };

      const permissions = await staffPermissionService.getStaffPermissions(
        "agency_alpha",
        "usr_err_01",
        mockPrismaDbError
      );

      // CRITICAL SECURITY INVARIANT: Must NOT return DEFAULT_STAFF_PERMISSIONS on DB error!
      assert.notDeepStrictEqual(
        permissions,
        DEFAULT_STAFF_PERMISSIONS,
        "Database error must never fall back to permissive default permissions"
      );
      assert.deepStrictEqual(permissions, {}, "Database error must fail closed with empty permissions map");

      // Verify fail-closed evaluation: all actions must return false
      const canView = evaluateStaffPermission("AGENCY_STAFF", permissions, "PAYMENTS", "VIEW");
      assert.strictEqual(canView, false, "Fail-closed permissions map must evaluate to false");

      const canCreate = evaluateStaffPermission("AGENCY_STAFF", permissions, "ENQUIRIES", "CREATE");
      assert.strictEqual(canCreate, false, "Fail-closed permissions map must evaluate to false");

      // Verify safe structured logging
      assert(loggedError !== null, "Expected structured error to be logged");
      assert(loggedError[0].includes("[StaffPermissionService]"), "Log message must identify service");
      assert.strictEqual(loggedError[1].agencyId, "agency_alpha");
      assert.strictEqual(loggedError[1].userId, "usr_err_01");
      assert.strictEqual(loggedError[1].errorCode, "P2021");
    } finally {
      console.error = origError;
    }
  });

  await test("Corrupted or malformed profile payload fails closed safely", async () => {
    let loggedWarning: any = null;
    const origWarn = console.warn;
    console.warn = (...args: any[]) => {
      loggedWarning = args;
    };

    try {
      const mockPrismaCorrupt: any = {
        user: {
          findFirst: async () => ({ id: "usr_corrupt_01", agencyId: "agency_alpha", role: "AGENCY_STAFF" }),
        },
        staffPermissionProfile: {
          findUnique: async () => ({
            userId: "usr_corrupt_01",
            permissions: "CORRUPTED_STRING_NOT_AN_OBJECT",
          }),
        },
      };

      const permissions = await staffPermissionService.getStaffPermissions(
        "agency_alpha",
        "usr_corrupt_01",
        mockPrismaCorrupt
      );

      assert.deepStrictEqual(permissions, {}, "Corrupt permissions must fail closed with empty map");
      const canView = evaluateStaffPermission("AGENCY_STAFF", permissions, "TRIPS", "VIEW");
      assert.strictEqual(canView, false, "Corrupt profile must fail closed");

      assert(loggedWarning !== null, "Expected structured warning to be logged");
      assert.strictEqual(loggedWarning[1].userId, "usr_corrupt_01");
    } finally {
      console.warn = origWarn;
    }
  });`;

const cat4Repl = `  // ──────────────────────────────────────────────────────────────────────────
  // 4. CRITICAL STAFF PERMISSION PROFILE SAFETY CHECK (SECTION 5)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\\n▶ CATEGORY 4: Staff Permission Profile Safety & Fail-Closed Invariants");

  await test("Simulated Migrated Schema: Successful empty profile lookup (table exists, row null) deterministically resolves to DEFAULT_STAFF_PERMISSIONS", async () => {
    // Simulates fully migrated schema where staff_permission_profiles table exists and query finds no custom row
    const mockPrismaNewStaff: any = {
      __mockHasStaffPermissionProfileTable: true,
      user: {
        findFirst: async () => ({ id: "usr_new_01", agencyId: "agency_alpha", role: "AGENCY_STAFF" }),
      },
      staffPermissionProfile: {
        findUnique: async () => null, // Query succeeded; user has no custom profile
      },
    };

    const permissions = await staffPermissionService.getStaffPermissions(
      "agency_alpha",
      "usr_new_01",
      mockPrismaNewStaff
    );

    assert.strictEqual(permissions.ENQUIRIES.view, true);
    assert.strictEqual(permissions.ENQUIRIES.create, true);
    assert.strictEqual(permissions.ENQUIRIES.delete, false);
    assert.strictEqual(permissions.TRIPS.view, true);
    assert.strictEqual(permissions.PAYMENTS.view, true);
    assert.strictEqual(permissions.PAYMENTS.recordReceipt, false);
  });

  await test("Simulated Migrated Schema: Successful profile lookup with custom JSON resolves to custom grants", async () => {
    const mockCustomGrants = {
      ENQUIRIES: { view: true, create: false, update: false, delete: false },
      PAYMENTS: { view: false, recordReceipt: false, delete: false },
    };

    const mockPrismaCustomStaff: any = {
      __mockHasStaffPermissionProfileTable: true,
      user: {
        findFirst: async () => ({ id: "usr_custom_01", agencyId: "agency_alpha", role: "AGENCY_STAFF" }),
      },
      staffPermissionProfile: {
        findUnique: async () => ({
          userId: "usr_custom_01",
          permissions: mockCustomGrants,
        }),
      },
    };

    const permissions = await staffPermissionService.getStaffPermissions(
      "agency_alpha",
      "usr_custom_01",
      mockPrismaCustomStaff
    );

    assert.strictEqual(permissions.ENQUIRIES.view, true);
    assert.strictEqual(permissions.ENQUIRIES.create, false);
    assert.strictEqual(permissions.PAYMENTS.view, false);
  });

  await test("Simulated Missing Table: Missing-table failure (P2021 / unmigrated table) fails closed safely ({}) and does NOT grant defaults", async () => {
    let loggedWarning: any = null;
    const origWarn = console.warn;
    console.warn = (...args: any[]) => {
      loggedWarning = args;
    };

    try {
      const mockPrismaMissingTable: any = {
        __mockHasStaffPermissionProfileTable: false,
        user: {
          findFirst: async () => ({ id: "usr_unmigrated_01", agencyId: "agency_alpha", role: "AGENCY_STAFF" }),
        },
        staffPermissionProfile: {
          findUnique: async () => null,
        },
      };

      const permissions = await staffPermissionService.getStaffPermissions(
        "agency_alpha",
        "usr_unmigrated_01",
        mockPrismaMissingTable
      );

      // CRITICAL SECURITY INVARIANT: Must NOT return DEFAULT_STAFF_PERMISSIONS on missing table!
      assert.notDeepStrictEqual(
        permissions,
        DEFAULT_STAFF_PERMISSIONS,
        "Missing-table failure must never fall back to permissive default permissions"
      );
      assert.deepStrictEqual(permissions, {}, "Missing-table failure must fail closed with empty permissions map");

      // Verify fail-closed evaluation: all actions must return false
      const canView = evaluateStaffPermission("AGENCY_STAFF", permissions, "PAYMENTS", "VIEW");
      assert.strictEqual(canView, false, "Fail-closed permissions map must evaluate to false for PAYMENTS.VIEW");

      const canCreate = evaluateStaffPermission("AGENCY_STAFF", permissions, "ENQUIRIES", "CREATE");
      assert.strictEqual(canCreate, false, "Fail-closed permissions map must evaluate to false for ENQUIRIES.CREATE");

      assert(loggedWarning !== null, "Expected structured warning to be logged");
      assert(loggedWarning[0].includes("[StaffPermissionService]"), "Log message must identify service");
      assert(loggedWarning[0].includes("absent from current database; failing closed"), "Log message must identify missing table");
    } finally {
      console.warn = origWarn;
    }
  });

  await test("Simulated Database Outage: Query failure or connection outage fails closed safely ({}) and does NOT grant defaults", async () => {
    let loggedError: any = null;
    const origError = console.error;
    console.error = (...args: any[]) => {
      loggedError = args;
    };

    try {
      const mockPrismaDbError: any = {
        __mockHasStaffPermissionProfileTable: true,
        user: {
          findFirst: async () => ({ id: "usr_err_01", agencyId: "agency_alpha", role: "AGENCY_STAFF" }),
        },
        staffPermissionProfile: {
          findUnique: async () => {
            const err: any = new Error('Connection pool timeout: database is unreachable.');
            err.code = "ECONNREFUSED";
            throw err;
          },
        },
      };

      const permissions = await staffPermissionService.getStaffPermissions(
        "agency_alpha",
        "usr_err_01",
        mockPrismaDbError
      );

      // CRITICAL SECURITY INVARIANT: Must NOT return DEFAULT_STAFF_PERMISSIONS on DB outage!
      assert.notDeepStrictEqual(
        permissions,
        DEFAULT_STAFF_PERMISSIONS,
        "Database outage must never fall back to permissive default permissions"
      );
      assert.deepStrictEqual(permissions, {}, "Database error must fail closed with empty permissions map");

      const canView = evaluateStaffPermission("AGENCY_STAFF", permissions, "TRIPS", "VIEW");
      assert.strictEqual(canView, false, "Fail-closed permissions map must evaluate to false");

      assert(loggedError !== null, "Expected structured error to be logged");
      assert.strictEqual(loggedError[1].errorCode, "ECONNREFUSED");
    } finally {
      console.error = origError;
    }
  });

  await test("Corrupted or malformed profile payload fails closed safely", async () => {
    let loggedWarning: any = null;
    const origWarn = console.warn;
    console.warn = (...args: any[]) => {
      loggedWarning = args;
    };

    try {
      const mockPrismaCorrupt: any = {
        __mockHasStaffPermissionProfileTable: true,
        user: {
          findFirst: async () => ({ id: "usr_corrupt_01", agencyId: "agency_alpha", role: "AGENCY_STAFF" }),
        },
        staffPermissionProfile: {
          findUnique: async () => ({
            userId: "usr_corrupt_01",
            permissions: "CORRUPTED_STRING_NOT_AN_OBJECT",
          }),
        },
      };

      const permissions = await staffPermissionService.getStaffPermissions(
        "agency_alpha",
        "usr_corrupt_01",
        mockPrismaCorrupt
      );

      assert.deepStrictEqual(permissions, {}, "Corrupt permissions must fail closed with empty map");
      const canView = evaluateStaffPermission("AGENCY_STAFF", permissions, "TRIPS", "VIEW");
      assert.strictEqual(canView, false, "Corrupt profile must fail closed");

      assert(loggedWarning !== null, "Expected structured warning to be logged");
      assert.strictEqual(loggedWarning[1].userId, "usr_corrupt_01");
    } finally {
      console.warn = origWarn;
    }
  });

  await test("Actual Connected Database: staffPermissionService.getStaffPermissions fails closed ({}) on pre-migration database", async () => {
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

if (content.includes(cat4Target)) {
  content = content.replace(cat4Target, cat4Repl);
  if (isCRLF) content = content.replace(/\n/g, "\r\n");
  fs.writeFileSync(targetPath, content, "utf8");
  console.log("Successfully updated Category 4 in test-staff-failures-phase1.ts");
} else {
  console.error("FAILED to find cat4Target in test-staff-failures-phase1.ts");
}

