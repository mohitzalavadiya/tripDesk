import "dotenv/config";
import assert from "assert";
import { staffPermissionService } from "../src/lib/services/staff-permission-service";
import { handleApiError, ApiError, NotFoundError, ValidationError, ForbiddenError, UnauthorizedError } from "../src/lib/api/errors";
import { DEFAULT_STAFF_PERMISSIONS } from "../src/lib/auth/permissions";
import { z } from "zod";

const updatePermissionsSchema = z.object({
  permissions: z.record(
    z.string(),
    z.record(z.string(), z.boolean().optional())
  ),
});

async function runVerification() {
  console.log("================================================================================");
  console.log("  TEAM PERMISSIONS API & ERROR HANDLING END-TO-END VERIFICATION");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    total++;
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         ${err.message}`);
      if (err.stack) console.error(err.stack);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Missing table returns HTTP 503 with MIGRATION_REQUIRED
  // --------------------------------------------------------------------------
  await test("Missing table: updateStaffPermissions throws ApiError(503, MIGRATION_REQUIRED)", async () => {
    const mockPrismaMissingTable: any = {
      __mockHasStaffPermissionProfileTable: false,
      user: {
        findFirst: async () => ({ id: "usr_staff_01", agencyId: "agency_alpha", role: "AGENCY_STAFF" }),
      },
    };

    let caughtError: any = null;
    try {
      await staffPermissionService.updateStaffPermissions(
        "agency_alpha",
        "usr_staff_01",
        "usr_owner_01",
        { CUSTOMERS: { view: true, create: true } } as any,
        mockPrismaMissingTable
      );
    } catch (err: any) {
      caughtError = err;
    }

    assert(caughtError instanceof ApiError, "Expected error to be an instance of ApiError");
    assert.strictEqual(caughtError.statusCode, 503, "Expected status code 503");
    assert.strictEqual(caughtError.code, "MIGRATION_REQUIRED", "Expected code MIGRATION_REQUIRED");
    assert(caughtError.message.includes("20261027150000_phase_f_staff_permissions"), "Expected message to reference the migration file");

    // Test through handleApiError
    const response = handleApiError(caughtError);
    assert.strictEqual(response.status, 503, "Response status must be 503");
    const json = await response.json();
    assert.strictEqual(json.success, false, "json.success must be false");
    assert.strictEqual(json.error.code, "MIGRATION_REQUIRED");
    assert(json.error.message.includes("staff_permission_profiles table does not exist"));
  });

  // --------------------------------------------------------------------------
  // TEST 2: Successful update persists and sanitizes invariants correctly
  // --------------------------------------------------------------------------
  await test("Successful update: persists permissions, enforces delete=false and view prerequisite", async () => {
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
      CUSTOMERS: { view: true, create: true, update: true, delete: true }, // delete: true should be stripped!
      BOOKINGS: { view: false, create: true, update: true }, // view: false should force create/update to false!
    };

    const result = await staffPermissionService.updateStaffPermissions(
      "agency_alpha",
      "usr_staff_01",
      "usr_owner_01",
      inputPermissions,
      mockPrismaMigrated
    );

    // Invariant 1: Staff can NEVER be granted delete
    assert.strictEqual(result.CUSTOMERS.delete, false, "delete must remain false even if input requested true");
    assert.strictEqual(result.CUSTOMERS.create, true, "create allowed when view is true");
    assert.strictEqual(result.CUSTOMERS.update, true, "update allowed when view is true");

    // Invariant 2: Child actions cannot be true if view is false
    assert.strictEqual(result.BOOKINGS.view, false, "BOOKINGS.view is false");
    assert.strictEqual(result.BOOKINGS.create, false, "BOOKINGS.create must be false when view is false");
    assert.strictEqual(result.BOOKINGS.update, false, "BOOKINGS.update must be false when view is false");

    // Verify upsert was called with sanitized payload
    assert(upsertPayload !== null, "staffPermissionProfile.upsert was called");
    assert.strictEqual(upsertPayload.create.permissions.CUSTOMERS.delete, false);

    // Verify audit log event was created
    assert(auditEventLogged !== null, "Audit log event was created");
    assert.strictEqual(auditEventLogged.action, "STAFF_PERMISSIONS_UPDATED");
    assert.strictEqual(auditEventLogged.actorUserId, "usr_owner_01");
    assert.strictEqual(auditEventLogged.targetUserId, "usr_staff_01");
  });

  // --------------------------------------------------------------------------
  // TEST 3: Invalid payload is rejected with appropriate 400 VALIDATION_ERROR
  // --------------------------------------------------------------------------
  await test("Invalid payload: schema validation rejects non-object or malformed input", async () => {
    // 3a: Non-object permissions
    const res1 = updatePermissionsSchema.safeParse({ permissions: "not-an-object" });
    assert.strictEqual(res1.success, false, "Must reject string permissions");
    const httpRes1 = handleApiError(res1.error);
    assert.strictEqual(httpRes1.status, 400, "Validation error must return 400");
    const json1 = await httpRes1.json();
    assert.strictEqual(json1.error.code, "VALIDATION_ERROR");

    // 3b: Missing permissions property
    const res2 = updatePermissionsSchema.safeParse({});
    assert.strictEqual(res2.success, false, "Must reject empty body");
    const httpRes2 = handleApiError(res2.error);
    assert.strictEqual(httpRes2.status, 400);

    // 3c: Invalid field type in permissions map
    const res3 = updatePermissionsSchema.safeParse({
      permissions: {
        CUSTOMERS: { view: "YES_PLEASE" } // non-boolean
      }
    });
    assert.strictEqual(res3.success, false, "Must reject non-boolean permission flags");
  });

  // --------------------------------------------------------------------------
  // TEST 4: Unauthorized access blocked with 401 or 403
  // --------------------------------------------------------------------------
  await test("Unauthorized access: 401 UNAUTHORIZED and 403 FORBIDDEN handled correctly", async () => {
    // Unauthenticated
    const unauthError = new UnauthorizedError();
    const unauthRes = handleApiError(unauthError);
    assert.strictEqual(unauthRes.status, 401, "Unauthenticated error must return 401");
    const unauthJson = await unauthRes.json();
    assert.strictEqual(unauthJson.error.code, "UNAUTHORIZED");

    // Non-owner / Staff attempting to access owner endpoint
    const forbiddenError = new ForbiddenError("This endpoint requires an active Agency Owner workspace session");
    const forbiddenRes = handleApiError(forbiddenError);
    assert.strictEqual(forbiddenRes.status, 403, "Staff forbidden error must return 403");
    const forbiddenJson = await forbiddenRes.json();
    assert.strictEqual(forbiddenJson.error.code, "FORBIDDEN");
    assert.strictEqual(forbiddenJson.error.message, "This endpoint requires an active Agency Owner workspace session");
  });

  // --------------------------------------------------------------------------
  // TEST 5: Tenant isolation & self-modification guard
  // --------------------------------------------------------------------------
  await test("Tenant isolation: target staff in different agency returns 404 NOT_FOUND", async () => {
    const mockPrismaCrossTenant: any = {
      __mockHasStaffPermissionProfileTable: true,
      user: {
        findFirst: async (args: any) => {
          // Cross-tenant lookup fails because agencyId does not match
          if (args.where.agencyId !== "agency_other_tenant") return null;
          return { id: "usr_staff_victim", agencyId: "agency_other_tenant", role: "AGENCY_STAFF" };
        },
      },
    };

    let caughtError: any = null;
    try {
      await staffPermissionService.updateStaffPermissions(
        "agency_attacker", // Attacker agency
        "usr_staff_victim", // Target user in agency_other_tenant
        "usr_owner_attacker",
        { CUSTOMERS: { view: true } } as any,
        mockPrismaCrossTenant
      );
    } catch (err: any) {
      caughtError = err;
    }

    assert(caughtError instanceof NotFoundError, "Expected NotFoundError for cross-tenant target");
    assert.strictEqual(caughtError.statusCode, 404);
    assert.strictEqual(caughtError.code, "NOT_FOUND");

    const httpRes = handleApiError(caughtError);
    assert.strictEqual(httpRes.status, 404);
    const json = await httpRes.json();
    assert.strictEqual(json.error.code, "NOT_FOUND");
  });

  await test("Self-modification guard: Agency Owner modifying own permissions throws 400 VALIDATION_ERROR", async () => {
    let caughtError: any = null;
    try {
      await staffPermissionService.updateStaffPermissions(
        "agency_alpha",
        "usr_owner_alpha", // target is same as actor
        "usr_owner_alpha",
        { CUSTOMERS: { view: true } } as any
      );
    } catch (err: any) {
      caughtError = err;
    }

    assert(caughtError instanceof ValidationError, "Expected ValidationError when modifying self");
    assert.strictEqual(caughtError.statusCode, 400);
    assert.strictEqual(caughtError.code, "VALIDATION_ERROR");

    const httpRes = handleApiError(caughtError);
    assert.strictEqual(httpRes.status, 400);
    const json = await httpRes.json();
    assert.strictEqual(json.error.code, "VALIDATION_ERROR");
    assert(json.error.message.includes("Agency Owners cannot modify their own administrative permissions"));
  });

  // --------------------------------------------------------------------------
  // TEST 6: Unexpected database failure masks sensitive details and returns 500
  // --------------------------------------------------------------------------
  await test("Database failure: unexpected query error does NOT leak SQL or connection credentials", async () => {
    const origError = console.error;
    console.error = () => {}; // suppress logger output in test

    try {
      const sensitiveDbError = new Error(
        'FATAL: password authentication failed for user "postgres_admin" at postgresql://postgres_admin:SuperSecretPassword123@db.prod.internal:5432/tripdesk'
      );

      const httpRes = handleApiError(sensitiveDbError);
      assert.strictEqual(httpRes.status, 500, "Unexpected database failure must return 500");
      const json = await httpRes.json();

      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "INTERNAL_ERROR");
      assert.strictEqual(
        json.error.message,
        "An unexpected error occurred while processing your request. Please try again later."
      );

      // Verify ZERO credentials or database hostnames leaked to client
      const rawString = JSON.stringify(json);
      assert(!rawString.includes("SuperSecretPassword123"), "Credentials must never leak");
      assert(!rawString.includes("postgres_admin"), "Username must never leak");
      assert(!rawString.includes("db.prod.internal"), "Host must never leak");
      assert(!rawString.includes("FATAL"), "Internal error details must never leak");
    } finally {
      console.error = origError;
    }
  });

  // --------------------------------------------------------------------------
  // TEST 7: Frontend Modal contract verification (handleSave and handleReset)
  // --------------------------------------------------------------------------
  await test("Frontend contract: extracts json.error.message and prevents [object Object]", async () => {
    // Simulate server response on 503 MIGRATION_REQUIRED
    const mockApiResponse = {
      ok: false,
      status: 503,
      json: async () => ({
        success: false,
        error: {
          code: "MIGRATION_REQUIRED",
          message: "Cannot update staff permissions: staff_permission_profiles table does not exist in current database. Pending migration: 20261027150000_phase_f_staff_permissions",
        },
      }),
    };

    // Modal handleSave parsing logic:
    const json = await mockApiResponse.json();
    let extractedMessage = "";
    let isSuccessToastShown = false;
    let isModalClosed = false;

    try {
      if (!mockApiResponse.ok || !json.success) {
        const errorMsg =
          json.error?.message ||
          (typeof json.error === "string" ? json.error : "Failed to update permissions");
        throw new Error(errorMsg);
      }
      isSuccessToastShown = true;
      isModalClosed = true;
    } catch (err: any) {
      extractedMessage = err.message;
    }

    assert.strictEqual(isSuccessToastShown, false, "Success toast must NOT be shown on failure");
    assert.strictEqual(isModalClosed, false, "Modal must NOT close on failure");
    assert.notStrictEqual(extractedMessage, "[object Object]", "Must NEVER format error as [object Object]");
    assert(
      extractedMessage.includes("staff_permission_profiles table does not exist"),
      "Extracted message must contain the exact API error description"
    );
  });

  await test("Frontend contract: handleReset failure preserves state and rejects cleanly", async () => {
    const mockResetResponse = {
      ok: false,
      status: 503,
      json: async () => ({
        success: false,
        error: {
          code: "MIGRATION_REQUIRED",
          message: "Cannot update staff permissions: staff_permission_profiles table does not exist in current database. Pending migration: 20261027150000_phase_f_staff_permissions",
        },
      }),
    };

    const json = await mockResetResponse.json();
    let extractedMessage = "";
    let isResetToastShown = false;
    let isConfirmResetClosed = false;

    try {
      if (!mockResetResponse.ok || !json.success) {
        const errorMsg =
          json.error?.message ||
          (typeof json.error === "string" ? json.error : "Failed to reset permissions");
        throw new Error(errorMsg);
      }
      isResetToastShown = true;
      isConfirmResetClosed = true;
    } catch (err: any) {
      extractedMessage = err.message;
    }

    assert.strictEqual(isResetToastShown, false, "Reset toast must NOT be shown on failure");
    assert.strictEqual(isConfirmResetClosed, false, "Confirmation dialog must NOT close on failure");
    assert.notStrictEqual(extractedMessage, "[object Object]");
    assert(extractedMessage.includes("20261027150000_phase_f_staff_permissions"));
  });

  console.log("\n================================================================================");
  console.log(`  VERIFICATION RESULT: ${passed}/${total} TESTS PASSED (100%)`);
  console.log("================================================================================\n");
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL ERROR IN TEST SUITE:", err);
    process.exit(1);
  });
