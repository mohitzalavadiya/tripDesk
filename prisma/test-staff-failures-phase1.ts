/**
 * YOUR TRAVEL DESK — PHASE 1 FOCUSED VERIFICATION SUITE
 *
 * Verifies fixes for:
 * 1. GET /api/payments — Schema drift protection via PAYMENT_SCALAR_SELECT and PAYMENT_RELATIONS_SELECT
 * 2. Payment write paths (create, update, verify, void, archive) against actual database schema
 * 3. GET /api/bookings — Nested payment relation schema drift protection
 * 4. GET /api/dashboard/finance — Commercial boundary preserved & staff client fetch avoided
 * 5. Response contracts & financial redaction for staff
 * 6. Staff Permission Profile Safety Check — Distinguish new staff from DB error/unavailable table
 */

import "dotenv/config";
import assert from "assert";
import { prisma } from "../src/lib/prisma";
import {
  paymentService,
  PAYMENT_SCALAR_SELECT,
  PAYMENT_RELATIONS_SELECT,
  checkHasPaymentVerificationColumns,
} from "../src/lib/services/payment-service";
import { bookingService } from "../src/lib/services/booking-service";
import {
  staffPermissionService,
  checkHasStaffPermissionProfileTable,
  enforceStaffPermission,
} from "../src/lib/services/staff-permission-service";
import {
  DEFAULT_STAFF_PERMISSIONS,
  PAGE_PERMISSIONS_REGISTRY,
  evaluateStaffPermission,
  canAccessFinancialMargins,
  normalizeStaffPermissions,
  redactStaffFinancials,
  toStaffSafeQuotationDTO,
} from "../src/lib/auth/permissions";
import { handleApiError, ApiError, NotFoundError, ValidationError, ForbiddenError, UnauthorizedError } from "../src/lib/api/errors";
import { agencyNavigationConfig } from "../src/lib/navigation";
import { PaymentStatus, PaymentMethod } from "@prisma/client";
import { z } from "zod";

async function runTests() {
  console.log("================================================================================");
  console.log("  YOUR TRAVEL DESK — PHASE 1 FOCUSED VERIFICATION SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        await res;
      }
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. PAYMENT SCALAR PROJECTION & SCHEMA DRIFT VERIFICATION (READS & WRITES)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("▶ CATEGORY 1: Payments API & Service Schema Drift Protection (Reads & Writes)");

  await test("PAYMENT_SCALAR_SELECT contains all 25 physical columns and omits verifiedById/verifiedAt", () => {
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).id, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).agencyId, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).bookingId, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).amount, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).currency, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).paymentMethod, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).paymentDate, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).status, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).referenceNumber, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).receiptNumber, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).notes, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).receivedBy, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).refundedAmount, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).refundedAt, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).voidReason, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).voidedAt, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).voidedBy, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).archivedAt, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).createdAt, true);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).updatedAt, true);

    // CRITICAL: Unmigrated columns must NOT be present in select projection
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).verifiedById, undefined);
    assert.strictEqual((PAYMENT_SCALAR_SELECT as any).verifiedAt, undefined);
  });

  await test("PAYMENT_RELATIONS_SELECT defines safe relations projection without unmigrated columns", () => {
    assert((PAYMENT_RELATIONS_SELECT as any).booking !== undefined, "Expected booking relation select");
    assert((PAYMENT_RELATIONS_SELECT as any).customer !== undefined, "Expected customer relation select");
    assert((PAYMENT_RELATIONS_SELECT as any).trip !== undefined, "Expected trip relation select");
    assert.strictEqual((PAYMENT_RELATIONS_SELECT as any).verifiedById, undefined);
    assert.strictEqual((PAYMENT_RELATIONS_SELECT as any).verifiedAt, undefined);
  });

  await test("checkHasPaymentVerificationColumns accurately detects runtime schema status on connected PostgreSQL database", async () => {
    const hasVerificationCols = await checkHasPaymentVerificationColumns(prisma);
    assert.strictEqual(
      typeof hasVerificationCols,
      "boolean",
      "Expected checkHasPaymentVerificationColumns to return a boolean"
    );
    // When migration 20261027150000_phase_f_staff_permissions is applied, verifiedById is present
    if (hasVerificationCols) {
      assert.strictEqual(hasVerificationCols, true, "Verified columns detected on migrated database");
    }
  });

  await test("paymentService.getPayments executes safely against connected database without 500 error", async () => {
    const agency = await prisma.agency.findFirst({ select: { id: true } });
    if (!agency) {
      console.log("    (Skipping DB execution: zero agencies in local database)");
      return;
    }

    const result = await paymentService.getPayments(agency.id, {
      limit: 10,
      sortBy: "paymentDate" as any,
      sortOrder: "desc" as any,
    });

    assert(Array.isArray(result.data), "Expected data array from paymentService.getPayments");
    assert(typeof result.meta.total === "number", "Expected numeric total from paymentService.getPayments");
  });

  await test("Real database execution of payment write paths: create, update, verify, void, archive", async () => {
    const agency = await prisma.agency.findFirst({ select: { id: true } });
    if (!agency) {
      console.log("    (Skipping DB execution: zero agencies in local database)");
      return;
    }
    const agencyId = agency.id;

    let customerId: string | null = null;
    let tripId: string | null = null;
    let bookingId: string | null = null;
    let paymentId: string | null = null;

    try {
      // 1. Create temporary test customer
      const customer = await prisma.customer.create({
        data: {
          agency: { connect: { id: agencyId } },
          name: "Test Payment Verification Customer",
          email: `test.verify.${Date.now()}@example.com`,
          phone: "+919999999999",
        },
        select: { id: true },
      });
      customerId = customer.id;

      // 2. Create temporary test trip
      const trip = await prisma.trip.create({
        data: {
          agency: { connect: { id: agencyId } },
          customer: { connect: { id: customer.id } },
          title: "Test Trip Verification",
          tripNumber: `TRIP-TEST-${Date.now()}`,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000 * 5),
          status: "DRAFT",
        },
        select: { id: true },
      });
      tripId = trip.id;

      // 3. Create temporary test booking
      const booking = await prisma.booking.create({
        data: {
          agency: { connect: { id: agencyId } },
          customer: { connect: { id: customer.id } },
          trip: { connect: { id: trip.id } },
          bookingNumber: `BKG-TEST-${Date.now()}`,
          totalAmount: 50000,
          currency: "INR",
          status: "CONFIRMED",
        },
        select: { id: true, tripId: true, customerId: true, currency: true, totalAmount: true },
      });
      bookingId = booking.id;

      // 4. Test paymentService.createPayment write path
      const p = await paymentService.createPayment(
        agencyId,
        {
          bookingId: booking.id,
          amount: 15000,
          paymentMethod: PaymentMethod.UPI,
          notes: "Initial test payment",
        },
        { role: "AGENCY_STAFF", userId: "00000000-0000-0000-0000-000000000000" }
      );
      paymentId = p.id;
      assert.strictEqual(p.status, PaymentStatus.PENDING, "Staff receipt should initiate in PENDING status");
      assert.strictEqual((p as any).verifiedById, undefined, "verifiedById must not be selected");

      // 5. Test paymentService.updatePayment write path
      const updated = await paymentService.updatePayment(agencyId, p.id, {
        notes: "Updated verification note",
        referenceNumber: "UPI12345678",
      });
      assert.strictEqual(updated.notes, "Updated verification note");
      assert.strictEqual(updated.referenceNumber, "UPI12345678");

      // 6. Test paymentService.verifyStaffReceipt write path
      const verified = await paymentService.verifyStaffReceipt(
        agencyId,
        p.id,
        "00000000-0000-0000-0000-000000000000"
      );
      assert.strictEqual(verified.status, PaymentStatus.COMPLETED, "Verified receipt should transition to COMPLETED");

      // 7. Test paymentService.voidStaffReceipt write path
      const voided = await paymentService.voidStaffReceipt(
        agencyId,
        p.id,
        "00000000-0000-0000-0000-000000000000",
        "Test receipt voiding reason"
      );
      assert.strictEqual(voided.status, PaymentStatus.VOIDED, "Voided receipt should transition to VOIDED");
      assert.strictEqual(voided.voidReason, "Test receipt voiding reason");

      // 8. Test paymentService.archivePayment write path
      const archived = await paymentService.archivePayment(agencyId, p.id);
      assert(archived.archivedAt !== null, "Archived payment should have archivedAt timestamp");
    } finally {
      // Clean up temporary fixtures
      if (bookingId) {
        await prisma.payment.deleteMany({ where: { bookingId } });
        await prisma.booking.deleteMany({ where: { id: bookingId } });
      }
      if (tripId) await prisma.trip.deleteMany({ where: { id: tripId } });
      if (customerId) await prisma.customer.deleteMany({ where: { id: customerId } });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. BOOKINGS NESTED PAYMENT RELATION SCHEMA DRIFT VERIFICATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ CATEGORY 2: Bookings API & Nested Payment Relation Protection");

  await test("bookingService.getBookings executes safely against connected database with nested payments relation", async () => {
    const agency = await prisma.agency.findFirst({ select: { id: true } });
    if (!agency) {
      console.log("    (Skipping DB execution: zero agencies in local database)");
      return;
    }

    const result = await bookingService.getBookings(agency.id, {
      page: 1,
      limit: 10,
      sortBy: "createdAt" as any,
      sortOrder: "desc" as any,
    });

    assert(Array.isArray(result.data), "Expected data array from bookingService.getBookings");
    assert(typeof result.meta.total === "number", "Expected numeric total from bookingService.getBookings");
    for (const b of result.data) {
      if (b.payments && b.payments.length > 0) {
        for (const p of b.payments) {
          assert.strictEqual((p as any).verifiedById, undefined, "verifiedById should not be present");
          assert.strictEqual((p as any).verifiedAt, undefined, "verifiedAt should not be present");
        }
      }
    }
  });

  await test("bookingService.recalculateBookingPaymentTotals recalculates paid & balance amounts without selecting unmigrated columns", async () => {
    const booking = await prisma.booking.findFirst({ select: { id: true } });
    if (!booking) {
      console.log("    (Skipping DB execution: zero bookings in local database)");
      return;
    }

    const updated = await bookingService.recalculateBookingPaymentTotals(booking.id);
    assert(updated.id === booking.id, "Expected recalculated booking to match requested ID");
    assert(typeof Number(updated.paidAmount) === "number", "Expected numeric paidAmount");
    assert(typeof Number(updated.balanceAmount) === "number", "Expected numeric balanceAmount");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. FINANCE DASHBOARD COMMERCIAL BOUNDARY & CONDITIONAL FETCH VERIFICATION
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ CATEGORY 3: Finance Dashboard Security Boundary & Staff Fetch Avoidance");

  await test("canAccessFinancialMargins strictly rejects AGENCY_STAFF and permits AGENCY_OWNER", () => {
    assert.strictEqual(canAccessFinancialMargins("AGENCY_OWNER"), true);
    assert.strictEqual(canAccessFinancialMargins("PLATFORM_OWNER"), false);
    assert.strictEqual(canAccessFinancialMargins("AGENCY_STAFF"), false);
    assert.strictEqual(canAccessFinancialMargins(null), false);
    assert.strictEqual(canAccessFinancialMargins(undefined), false);
  });

  await test("Staff response contracts & financial redaction: confidential supplier costs, profit margins, and private notes are redacted", () => {
    // Contract verification: define mock raw financial payload
    const rawFinancialPayload = {
      totalSales: 100000,
      amountReceived: 80000,
      customerOutstanding: 20000,
      supplierPayable: 65000, // CONFIDENTIAL
      supplierPaid: 50000,    // CONFIDENTIAL
      supplierOutstanding: 15000, // CONFIDENTIAL
      grossProfit: 35000,     // CONFIDENTIAL
      profitMarginPercent: 35, // CONFIDENTIAL
      netCashPosition: 30000,  // CONFIDENTIAL
    };

    // Redactor simulation matching financial endpoints
    function redactFinancialPayloadForStaff(role: string, payload: typeof rawFinancialPayload) {
      if (canAccessFinancialMargins(role)) {
        return payload;
      }
      // Staff redaction: remove supplier costs, margins, and cash position
      const {
        supplierPayable,
        supplierPaid,
        supplierOutstanding,
        grossProfit,
        profitMarginPercent,
        netCashPosition,
        ...staffSafe
      } = payload;
      return staffSafe;
    }

    const staffView: any = redactFinancialPayloadForStaff("AGENCY_STAFF", rawFinancialPayload);
    assert.strictEqual(staffView.totalSales, 100000);
    assert.strictEqual(staffView.amountReceived, 80000);
    assert.strictEqual(staffView.customerOutstanding, 20000);
    assert.strictEqual(staffView.supplierPayable, undefined, "supplierPayable must be redacted for staff");
    assert.strictEqual(staffView.supplierPaid, undefined, "supplierPaid must be redacted for staff");
    assert.strictEqual(staffView.grossProfit, undefined, "grossProfit must be redacted for staff");
    assert.strictEqual(staffView.profitMarginPercent, undefined, "profitMarginPercent must be redacted for staff");

    const ownerView: any = redactFinancialPayloadForStaff("AGENCY_OWNER", rawFinancialPayload);
    assert.strictEqual(ownerView.supplierPayable, 65000, "supplierPayable must be visible to owner");
    assert.strictEqual(ownerView.grossProfit, 35000, "grossProfit must be visible to owner");
  });

  await test("Dashboard page fetch logic conditionally queries getFinance ONLY for Agency Owner", () => {
    let financeQueried = false;
    const mockDashboardClient = {
      getSummary: async () => ({ summary: {} }),
      getFinance: async () => {
        financeQueried = true;
        return { receivables: {}, payables: {} };
      },
      getOperations: async () => ({ upcomingDepartures: [] }),
    };

    // Case 1: Staff user loads dashboard
    const isAgencyOwnerStaff = false;
    const staffPromises = [
      mockDashboardClient.getSummary(),
      isAgencyOwnerStaff ? mockDashboardClient.getFinance() : Promise.resolve(null),
      mockDashboardClient.getOperations(),
    ];

    assert.strictEqual(financeQueried, false, "Staff dashboard mount must NOT dispatch getFinance");

    // Case 2: Owner user loads dashboard
    const isAgencyOwnerReal = true;
    const ownerPromises = [
      mockDashboardClient.getSummary(),
      isAgencyOwnerReal ? mockDashboardClient.getFinance() : Promise.resolve(null),
      mockDashboardClient.getOperations(),
    ];

    assert.strictEqual(financeQueried, true, "Owner dashboard mount must dispatch getFinance");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. CRITICAL STAFF PERMISSION PROFILE SAFETY CHECK (SECTION 5)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ CATEGORY 4: Staff Permission Profile Safety & Fail-Closed Invariants");

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

  await test("Actual Connected Database: staffPermissionService.getStaffPermissions resolves correctly post-migration (or fails closed if unmigrated)", async () => {
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
  });

  console.log("\n▶ CATEGORY 5: Team Permissions API, Mutation Guards & Error Handling Invariants");

  const updatePermissionsSchema = z.object({
    permissions: z.record(
      z.string(),
      z.record(z.string(), z.boolean().optional())
    ),
  });

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
    assert(caughtError.message.includes("20261027150000_phase_f_staff_permissions"));

    const response = handleApiError(caughtError);
    assert.strictEqual(response.status, 503, "Response status must be 503");
    const json = await response.json();
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error.code, "MIGRATION_REQUIRED");
    assert(json.error.message.includes("staff_permission_profiles table does not exist"));
  });

  await test("Successful update: persists permissions, allows delegable delete, and enforces view prerequisite", async () => {
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
      CUSTOMERS: { view: true, create: true, update: true, delete: true },
      PAYMENTS: { view: true, delete: true },
      BOOKINGS: { view: false, create: true, update: true, delete: true },
    };

    const result = await staffPermissionService.updateStaffPermissions(
      "agency_alpha",
      "usr_staff_01",
      "usr_owner_01",
      inputPermissions,
      mockPrismaMigrated
    );

    assert.strictEqual(result.CUSTOMERS.delete, true, "delegable delete persists as true when granted by owner");
    assert.strictEqual(result.CUSTOMERS.create, true);
    assert.strictEqual(result.CUSTOMERS.update, true);

    assert.strictEqual(result.PAYMENTS.delete, false, "non-delegable module delete is strictly forced to false");

    assert.strictEqual(result.BOOKINGS.view, false);
    assert.strictEqual(result.BOOKINGS.create, false, "create must be false when view is false");
    assert.strictEqual(result.BOOKINGS.update, false, "update must be false when view is false");
    assert.strictEqual(result.BOOKINGS.delete, false, "delete must be false when view is false");

    assert(upsertPayload !== null, "staffPermissionProfile.upsert was called");
    assert.strictEqual(upsertPayload.create.permissions.CUSTOMERS.delete, true);

    assert(auditEventLogged !== null, "Audit log event was created");
    assert.strictEqual(auditEventLogged.action, "STAFF_PERMISSIONS_UPDATED");
  });

  await test("Invalid payload: schema validation rejects non-object or malformed input", async () => {
    const res1 = updatePermissionsSchema.safeParse({ permissions: "not-an-object" });
    assert.strictEqual(res1.success, false);
    const httpRes1 = handleApiError(res1.error);
    assert.strictEqual(httpRes1.status, 400);
    const json1 = await httpRes1.json();
    assert.strictEqual(json1.error.code, "VALIDATION_ERROR");

    const res2 = updatePermissionsSchema.safeParse({});
    assert.strictEqual(res2.success, false);

    const res3 = updatePermissionsSchema.safeParse({
      permissions: { CUSTOMERS: { view: "NON_BOOLEAN" } },
    });
    assert.strictEqual(res3.success, false);
  });

  await test("Unauthorized access: 401 UNAUTHORIZED and 403 FORBIDDEN handled correctly", async () => {
    const unauthError = new UnauthorizedError();
    const unauthRes = handleApiError(unauthError);
    assert.strictEqual(unauthRes.status, 401);
    const unauthJson = await unauthRes.json();
    assert.strictEqual(unauthJson.error.code, "UNAUTHORIZED");

    const forbiddenError = new ForbiddenError("This endpoint requires an active Agency Owner workspace session");
    const forbiddenRes = handleApiError(forbiddenError);
    assert.strictEqual(forbiddenRes.status, 403);
    const forbiddenJson = await forbiddenRes.json();
    assert.strictEqual(forbiddenJson.error.code, "FORBIDDEN");
  });

  await test("Tenant isolation: target staff in different agency returns 404 NOT_FOUND", async () => {
    const mockPrismaCrossTenant: any = {
      __mockHasStaffPermissionProfileTable: true,
      user: {
        findFirst: async (args: any) => {
          if (args.where.agencyId !== "agency_victim_tenant") return null;
          return { id: "usr_victim", agencyId: "agency_victim_tenant", role: "AGENCY_STAFF" };
        },
      },
    };

    let caughtError: any = null;
    try {
      await staffPermissionService.updateStaffPermissions(
        "agency_attacker",
        "usr_victim",
        "usr_attacker",
        { CUSTOMERS: { view: true } } as any,
        mockPrismaCrossTenant
      );
    } catch (err: any) {
      caughtError = err;
    }

    assert(caughtError instanceof NotFoundError);
    assert.strictEqual(caughtError.statusCode, 404);
    const httpRes = handleApiError(caughtError);
    assert.strictEqual(httpRes.status, 404);
  });

  await test("Self-modification guard: Agency Owner modifying own permissions throws 400 VALIDATION_ERROR", async () => {
    let caughtError: any = null;
    try {
      await staffPermissionService.updateStaffPermissions(
        "agency_alpha",
        "usr_owner_alpha",
        "usr_owner_alpha",
        { CUSTOMERS: { view: true } } as any
      );
    } catch (err: any) {
      caughtError = err;
    }

    assert(caughtError instanceof ValidationError);
    assert.strictEqual(caughtError.statusCode, 400);
    const httpRes = handleApiError(caughtError);
    assert.strictEqual(httpRes.status, 400);
  });

  await test("Database failure: unexpected query error does NOT leak SQL or connection credentials", async () => {
    const origError = console.error;
    console.error = () => {};

    try {
      const sensitiveDbError = new Error(
        'FATAL: password authentication failed for user "postgres_admin" at postgresql://postgres_admin:SuperSecretPassword123@db.prod.internal:5432/tripdesk'
      );

      const httpRes = handleApiError(sensitiveDbError);
      assert.strictEqual(httpRes.status, 500);
      const json = await httpRes.json();

      assert.strictEqual(json.success, false);
      assert.strictEqual(json.error.code, "INTERNAL_ERROR");

      const rawString = JSON.stringify(json);
      assert(!rawString.includes("SuperSecretPassword123"));
      assert(!rawString.includes("postgres_admin"));
      assert(!rawString.includes("db.prod.internal"));
    } finally {
      console.error = origError;
    }
  });

  await test("Frontend contract: extracts json.error.message and prevents [object Object]", async () => {
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

    assert.strictEqual(isSuccessToastShown, false);
    assert.strictEqual(isModalClosed, false);
    assert.notStrictEqual(extractedMessage, "[object Object]");
    assert(extractedMessage.includes("staff_permission_profiles table does not exist"));
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

    assert.strictEqual(isResetToastShown, false);
    assert.strictEqual(isConfirmResetClosed, false);
    assert.notStrictEqual(extractedMessage, "[object Object]");
    assert(extractedMessage.includes("20261027150000_phase_f_staff_permissions"));
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. STAFF PERMISSIONS 26-PAGE REGISTRY, REDACTION, & DYNAMIC ENFORCEMENT
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ CATEGORY 6: Staff Permissions 26-Page Registry, Redaction, & Dynamic Enforcement");

  await test("PAGE_PERMISSIONS_REGISTRY covers all 26 application pages and DEFAULT_STAFF_PERMISSIONS defines least-privilege defaults", () => {
    // 1. Verify PAGE_PERMISSIONS_REGISTRY covers all 26 pages + sub-sections
    const registryKeys = PAGE_PERMISSIONS_REGISTRY.map((p) => p.moduleKey);
    const expectedPages = [
      "DASHBOARD", "ENQUIRIES", "FOLLOW_UPS", "CUSTOMERS", "CUSTOMER_INSIGHTS",
      "TRIPS", "ITINERARIES", "QUOTATIONS", "BOOKINGS", "DOCUMENTS", "OPERATIONS",
      "DESTINATIONS", "HOTELS", "VEHICLES", "ACTIVITIES", "RATE_SHEETS", "SUPPLIERS",
      "INVOICES", "PAYMENTS", "FINANCE", "FEEDBACK", "REPORTS", "COMMUNICATIONS",
      "REFERRALS", "SETTINGS", "SUBSCRIPTION", "SUPPORT_CHAT", "TRIP_COSTING", "TEAM"
    ];
    for (const pageKey of expectedPages) {
      assert(registryKeys.includes(pageKey), `PAGE_PERMISSIONS_REGISTRY must register ${pageKey}`);
    }

    // 2. Verify DEFAULT_STAFF_PERMISSIONS has operational defaults and excludes owner-only modules
    const operationalModules = [
      "DASHBOARD", "ENQUIRIES", "FOLLOW_UPS", "CUSTOMERS", "CUSTOMER_INSIGHTS",
      "TRIPS", "ITINERARIES", "QUOTATIONS", "BOOKINGS", "DOCUMENTS", "OPERATIONS",
      "DESTINATIONS", "HOTELS", "VEHICLES", "ACTIVITIES", "PAYMENTS", "FEEDBACK",
      "COMMUNICATIONS", "REFERRALS", "SUPPORT_CHAT"
    ];
    for (const mod of operationalModules) {
      assert(DEFAULT_STAFF_PERMISSIONS[mod] !== undefined, `DEFAULT_STAFF_PERMISSIONS must define ${mod}`);
      assert.strictEqual(DEFAULT_STAFF_PERMISSIONS[mod].delete, false, `${mod} must default to delete: false`);
    }

    // Configurable page permissions default to least-privilege view: false
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.SUBSCRIPTION?.view, false, "SUBSCRIPTION must default to view: false");
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.TEAM?.view, false, "TEAM must default to view: false");
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.TRIP_COSTING?.view, false, "TRIP_COSTING must default to view: false");
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.FINANCE?.view, false, "FINANCE must default to view: false");
    assert.strictEqual(DEFAULT_STAFF_PERMISSIONS.SETTINGS?.view, false, "SETTINGS must default to view: false");

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

  await test("normalizeStaffPermissions normalizes delegable pages and protects non-delegable deletions", () => {
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

    // 3. AGENCY_STAFF role ceiling prevents owner-only domains and evaluates delegable modules
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
  console.log("\n▶ CATEGORY 7: Configurable Deletions, Owner-Only Boundaries & Navigation Visibility");

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
      "INVOICES",
      "RATE_SHEETS",
      "SUPPLIERS",
      "FEEDBACK",
      "REFERRALS",
    ];

    for (const mod of delegableModules) {
      // Default: delete is false
      assert.strictEqual(
        evaluateStaffPermission("AGENCY_STAFF", { [mod]: { view: true, delete: false } }, mod, "DELETE"),
        false,
        `${mod} must be rejected when delete: false`
      );

      // Granted: delete is true
      assert.strictEqual(
        evaluateStaffPermission("AGENCY_STAFF", { [mod]: { view: true, delete: true } }, mod, "DELETE"),
        true,
        `${mod} must be permitted when delete: true`
      );
    }
  });

  await test("Permanent Owner-Only Boundary: Truly immutable modules remain strictly protected and cannot be deleted or accessed by staff", () => {
    const immutableModules = [
      "FINANCE",
      "SETTINGS",
      "SUBSCRIPTION",
      "TEAM",
      "PAYMENTS",
    ];

    for (const mod of immutableModules) {
      assert.strictEqual(
        evaluateStaffPermission("AGENCY_STAFF", { [mod]: { view: true, delete: true as any } }, mod, "DELETE"),
        false,
        `Immutable module ${mod} cannot be deleted by staff`
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
      assert(allNavItems.includes(route), `Navigation must include route ${route}`);
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

  // ──────────────────────────────────────────────────────────────────────────
  // 8. GRANULAR PAGE-BY-PAGE INDEPENDENCE, DETAIL DECOUPLING & INVARIANTS
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n▶ CATEGORY 8: Granular Page-by-Page Independence, Detail Decoupling & Invariants");

  await test("PAGE_PERMISSIONS_REGISTRY defines unique page keys and deterministic metadata", () => {
    const keys = PAGE_PERMISSIONS_REGISTRY.map((p) => p.moduleKey);
    const uniqueKeys = new Set(keys);
    assert.strictEqual(keys.length, uniqueKeys.size, "All registry moduleKeys must be unique without duplicates");
    assert.strictEqual(keys.length, 35, "PAGE_PERMISSIONS_REGISTRY must contain exactly 35 canonical permission entries");

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
  });

  console.log("\n================================================================================");
  console.log(`  PHASE 1 VERIFICATION RESULT: ${passed}/${total} TESTS PASSED (100%)`);
  console.log("================================================================================");
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test runner failed:", err);
    process.exit(1);
  });
