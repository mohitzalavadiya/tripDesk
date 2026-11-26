/**
 * YOUR TRAVEL DESK — PHASE 1: SECURITY & FINANCIAL INTEGRITY STABILIZATION REGRESSION SUITE
 *
 * Purely in-memory mocked verification (ZERO staging/production database mutations, ZERO network calls).
 * Exercises real route handlers, permissions helpers, and financial services:
 *   1. Authorization, Tenant Isolation, Owner-Only Boundaries, Fail-Closed Staff Grants, Financial Redaction
 *   2. Invoice Immutability, Concurrency Advisory Lock Serialization, Sequence Non-Waste, Issuance Netting
 *   3. Payment & Refund Integrity, Staff Pending Receipt Enforcement, Void Reference Reuse, Idempotency
 */

import Module from "module";
import { NextRequest } from "next/server";
import {
  AgencyStatus,
  BookingPaymentStatus,
  BookingStatus,
  GstTreatment,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  Prisma,
  SubscriptionStatus,
  TaxMode,
  UserRole,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// 1. In-Memory Auth & Prisma Mock Setup (Before importing app modules)
// ---------------------------------------------------------------------------

type MockAgency = {
  id: string;
  name: string;
  status: AgencyStatus;
  subscriptions: Array<{
    status: SubscriptionStatus;
    plan: { name: string };
    trialStart: Date | null;
    trialEnd: Date | null;
    subscriptionEnd: Date | null;
  }>;
};

type MockUserRecord = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  agencyId: string | null;
  agency: MockAgency;
};

type MockRecord = Record<string, unknown> & { id?: string; agencyId?: string | null; archivedAt?: Date | null };
type MockWhere = Record<string, unknown> & {
  OR?: MockWhere[];
  AND?: MockWhere[];
  agencyId_bookingId?: { agencyId: string; bookingId: string };
};
type MockFindArgs = {
  where?: MockWhere;
  include?: { payments?: { where?: MockWhere } };
  select?: { payments?: { where?: MockWhere } };
};

let currentSessionUser: { id: string; email?: string } | null = null;

const dbState: {
  users: Map<string, MockUserRecord>;
  permissionTableExists: boolean;
  permissionProfiles: Map<string, { userId: string; permissions: unknown }>;
  permissionQueryError: Error | null;
  bookings: Map<string, MockRecord>;
  invoices: Map<string, MockRecord>;
  invoiceItems: Map<string, MockRecord>;
  invoiceSequences: Map<string, number>;
  payments: Map<string, MockRecord>;
  expenses: Map<string, MockRecord>;
  referrals: Map<string, MockRecord>;
  followUps: Map<string, MockRecord>;
  documents: Map<string, MockRecord>;
  quotations: Map<string, MockRecord>;
  trips: Map<string, MockRecord>;
  tripOperations: Map<string, MockRecord>;
  operationEvents: Map<string, MockRecord>;
  userNotifications: MockRecord[];
  auditLogs: MockRecord[];
  customers: Map<string, MockRecord>;
  advisoryLocks: Map<string, Promise<void>>;
  seqCounter: number;
} = {
  users: new Map(),
  permissionTableExists: true,
  permissionProfiles: new Map(),
  permissionQueryError: null,
  bookings: new Map(),
  invoices: new Map(),
  invoiceItems: new Map(),
  invoiceSequences: new Map(),
  payments: new Map(),
  expenses: new Map(),
  referrals: new Map(),
  followUps: new Map(),
  documents: new Map(),
  quotations: new Map(),
  trips: new Map(),
  tripOperations: new Map(),
  operationEvents: new Map(),
  userNotifications: [],
  auditLogs: [],
  customers: new Map(),
  advisoryLocks: new Map(),
  seqCounter: 100,
};

function nextId(prefix: string) {
  dbState.seqCounter += 1;
  return `${prefix}_${dbState.seqCounter}`;
}

function matchWhere(record: MockRecord | undefined, where: MockWhere | undefined): boolean {
  if (!record || !where) return Boolean(record);
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined) continue;
    if (k === "OR" && Array.isArray(v)) {
      if (!v.some((sub) => matchWhere(record, sub))) return false;
      continue;
    }
    if (k === "AND" && Array.isArray(v)) {
      if (!v.every((sub) => matchWhere(record, sub))) return false;
      continue;
    }
    if (k === "agencyId_bookingId" && v && typeof v === "object") {
      const comp = v as { agencyId: string; bookingId: string };
      if (record.agencyId !== comp.agencyId || record.bookingId !== comp.bookingId) return false;
      continue;
    }
    if (v === null) {
      if (record[k] !== null && record[k] !== undefined) return false;
      continue;
    }
    if (typeof v === "object" && !(v instanceof Date)) {
      const cond = v as { in?: unknown[]; not?: unknown; startsWith?: string; equals?: unknown };
      if ("in" in cond && Array.isArray(cond.in)) {
        if (!cond.in.includes(record[k])) return false;
        continue;
      }
      if ("not" in cond) {
        if (record[k] === cond.not) return false;
        continue;
      }
      if ("startsWith" in cond && typeof cond.startsWith === "string") {
        if (typeof record[k] !== "string" || !(record[k] as string).startsWith(cond.startsWith)) return false;
        continue;
      }
      if ("equals" in cond) {
        if (record[k] !== cond.equals) return false;
        continue;
      }
    }
    if (record[k] !== v) return false;
  }
  return true;
}

function buildBookingWithRelations(b: MockRecord | undefined, paymentsWhere?: MockWhere): MockRecord | null {
  if (!b) return null;
  const payments = Array.from(dbState.payments.values()).filter(
    (p) => p.bookingId === b.id && !p.archivedAt && (!paymentsWhere || matchWhere(p, paymentsWhere))
  );
  const quotation = typeof b.quotationId === "string" ? dbState.quotations.get(b.quotationId) || null : null;
  const customer = typeof b.customerId === "string" ? dbState.customers.get(b.customerId) || null : b.customer || null;
  const trip = typeof b.tripId === "string" ? dbState.trips.get(b.tripId) || null : b.trip || null;
  const tripOperation =
    Array.from(dbState.tripOperations.values()).find((op) => op.bookingId === b.id) || null;
  return {
    ...b,
    customer,
    trip,
    quotation,
    agency: b.agency || { id: b.agencyId, name: "Alpha Travels", email: "ops@alpha.test", phone: "9999999999", address: "Delhi", logo: null, taxProfile: null },
    payments,
    tripOperation,
  };
}

function buildInvoiceWithRelations(inv: MockRecord | undefined, paymentsWhere?: MockWhere): MockRecord | null {
  if (!inv) return null;
  const items = Array.from(dbState.invoiceItems.values())
    .filter((it) => it.invoiceId === inv.id)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  const payments = Array.from(dbState.payments.values()).filter(
    (p) => p.invoiceId === inv.id && !p.archivedAt && (!paymentsWhere || matchWhere(p, paymentsWhere))
  );
  const b = typeof inv.bookingId === "string" ? buildBookingWithRelations(dbState.bookings.get(inv.bookingId)) : null;
  return {
    ...inv,
    items,
    payments,
    booking: b,
    agency: { id: inv.agencyId, name: "Alpha Travels", email: "ops@alpha.test", phone: "9999999999", address: "Delhi", logo: null },
  };
}

const mockPrisma = {
  __mockHasStaffPermissionProfileTable: true,
  $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql = strings.join("?");
    if (sql.includes("information_schema.tables") && sql.includes("staff_permission_profiles")) {
      if (dbState.permissionQueryError) throw dbState.permissionQueryError;
      return dbState.permissionTableExists ? [{ table_name: "staff_permission_profiles" }] : [];
    }
    if (sql.includes("information_schema.columns") || sql.includes("agency_audit_logs")) {
      return [];
    }
    if (sql.includes("pg_advisory_xact_lock")) {
      return [{ pg_advisory_xact_lock: "" }];
    }
    return [{ id: values[0] || "locked" }];
  },
  $transaction: async <T>(fnOrArray: Array<Promise<unknown>> | ((tx: unknown) => Promise<T>)): Promise<T | unknown[]> => {
    if (Array.isArray(fnOrArray)) return Promise.all(fnOrArray);
    return fnOrArray(mockPrisma);
  },
  user: {
    findUnique: async ({ where }: { where?: { id?: string } }) => {
      if (where?.id) return dbState.users.get(where.id) || null;
      return null;
    },
    findFirst: async ({ where }: { where?: MockWhere }) => {
      for (const u of dbState.users.values()) {
        if (matchWhere(u as unknown as MockRecord, where)) return u;
      }
      return null;
    },
    findMany: async ({ where }: { where?: MockWhere }) => {
      return Array.from(dbState.users.values()).filter((u) => matchWhere(u as unknown as MockRecord, where));
    },
  },
  staffPermissionProfile: {
    findUnique: async ({ where }: { where: { userId: string } }) => {
      if (dbState.permissionQueryError) throw dbState.permissionQueryError;
      return dbState.permissionProfiles.get(where.userId) ?? null;
    },
  },
  agency: {
    findUnique: async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      name: "Alpha Travels",
      email: "ops@alpha.test",
      status: AgencyStatus.ACTIVE,
    }),
  },
  booking: {
    findFirst: async ({ where, include, select }: MockFindArgs) => {
      const pWhere = include?.payments?.where ?? select?.payments?.where;
      for (const b of dbState.bookings.values()) {
        if (matchWhere(b, where)) return buildBookingWithRelations(b, pWhere);
      }
      return null;
    },
    findUnique: async ({ where, include, select }: { where: { id: string } } & MockFindArgs) => {
      const pWhere = include?.payments?.where ?? select?.payments?.where;
      const b = dbState.bookings.get(where.id);
      return b ? buildBookingWithRelations(b, pWhere) : null;
    },
    findUniqueOrThrow: async ({ where, include, select }: { where: { id: string } } & MockFindArgs) => {
      const pWhere = include?.payments?.where ?? select?.payments?.where;
      const b = dbState.bookings.get(where.id);
      if (!b) throw new Error("Booking not found");
      return buildBookingWithRelations(b, pWhere);
    },
    update: async ({ where, data }: { where: { id: string }; data: MockRecord }) => {
      const b = dbState.bookings.get(where.id);
      if (!b) throw new Error("Booking not found");
      Object.assign(b, data);
      return buildBookingWithRelations(b);
    },
  },
  invoiceSequence: {
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { agencyId: string };
      create?: { lastNumber?: number };
      update?: { lastNumber?: { increment?: number } };
    }) => {
      const cur = dbState.invoiceSequences.get(where.agencyId);
      let nextVal: number;
      if (cur === undefined) {
        nextVal = create?.lastNumber ?? 1;
      } else {
        const inc = update?.lastNumber?.increment ?? 1;
        nextVal = cur + inc;
      }
      dbState.invoiceSequences.set(where.agencyId, nextVal);
      return { agencyId: where.agencyId, lastNumber: nextVal };
    },
  },
  invoice: {
    findUnique: async ({ where, include, select }: MockFindArgs) => {
      const pWhere = include?.payments?.where ?? select?.payments?.where;
      for (const inv of dbState.invoices.values()) {
        if (matchWhere(inv, where)) return buildInvoiceWithRelations(inv, pWhere);
      }
      return null;
    },
    findFirst: async ({ where, include, select }: MockFindArgs) => {
      const pWhere = include?.payments?.where ?? select?.payments?.where;
      for (const inv of dbState.invoices.values()) {
        if (matchWhere(inv, where)) return buildInvoiceWithRelations(inv, pWhere);
      }
      return null;
    },
    findMany: async ({ where }: MockFindArgs) => {
      return Array.from(dbState.invoices.values())
        .filter((inv) => matchWhere(inv, where))
        .map((inv) => buildInvoiceWithRelations(inv));
    },
    count: async ({ where }: MockFindArgs) => {
      return Array.from(dbState.invoices.values()).filter((inv) => matchWhere(inv, where)).length;
    },
    create: async ({ data }: { data: MockRecord & { items?: { create?: MockRecord[] } } }) => {
      for (const existing of dbState.invoices.values()) {
        if (existing.agencyId === data.agencyId && existing.bookingId === data.bookingId) {
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "5.0.0",
          });
        }
      }
      const id = nextId("inv");
      const { items, ...rest } = data;
      const inv: MockRecord = { id, archivedAt: null, ...rest };
      dbState.invoices.set(id, inv);
      if (items?.create) {
        for (const it of items.create) {
          const itemId = nextId("invItem");
          dbState.invoiceItems.set(itemId, { id: itemId, invoiceId: id, ...it });
        }
      }
      return buildInvoiceWithRelations(inv);
    },
    update: async ({ where, data }: { where: { id: string }; data: MockRecord }) => {
      const inv = dbState.invoices.get(where.id);
      if (!inv) throw new Error("Invoice not found");
      Object.assign(inv, data);
      return buildInvoiceWithRelations(inv);
    },
  },
  invoiceItem: {
    deleteMany: async ({ where }: MockFindArgs) => {
      let count = 0;
      for (const [k, it] of dbState.invoiceItems.entries()) {
        if (matchWhere(it, where)) {
          dbState.invoiceItems.delete(k);
          count++;
        }
      }
      return { count };
    },
    createMany: async ({ data }: { data: MockRecord[] }) => {
      for (const it of data) {
        const id = nextId("invItem");
        dbState.invoiceItems.set(id, { id, ...it });
      }
      return { count: data.length };
    },
  },
  payment: {
    findFirst: async ({ where }: MockFindArgs) => {
      for (const p of dbState.payments.values()) {
        if (matchWhere(p, where)) {
          const booking = typeof p.bookingId === "string" ? dbState.bookings.get(p.bookingId) : undefined;
          return {
            ...p,
            booking: booking ? buildBookingWithRelations(booking) : null,
            customer:
              booking && typeof booking.customerId === "string"
                ? dbState.customers.get(booking.customerId) || null
                : null,
            trip:
              booking && typeof booking.tripId === "string"
                ? dbState.trips.get(booking.tripId) || null
                : null,
          };
        }
      }
      return null;
    },
    findUnique: async ({ where }: { where: { id: string } }) => {
      const p = dbState.payments.get(where.id);
      if (!p) return null;
      const booking = typeof p.bookingId === "string" ? dbState.bookings.get(p.bookingId) : undefined;
      return {
        ...p,
        booking: booking ? buildBookingWithRelations(booking) : null,
      };
    },
    findMany: async ({ where }: MockFindArgs) => {
      return Array.from(dbState.payments.values()).filter((p) => matchWhere(p, where));
    },
    count: async ({ where }: MockFindArgs) => {
      return Array.from(dbState.payments.values()).filter((p) => matchWhere(p, where)).length;
    },
    create: async ({ data }: { data: MockRecord }) => {
      const id = nextId("pay");
      const payment: MockRecord = {
        id,
        archivedAt: null,
        refundedAmount: new Prisma.Decimal(0),
        voidReason: null,
        voidedAt: null,
        voidedBy: null,
        verifiedById: null,
        verifiedAt: null,
        receivedBy: null,
        invoiceId: null,
        ...data,
      };
      dbState.payments.set(id, payment);
      const booking = typeof payment.bookingId === "string" ? dbState.bookings.get(payment.bookingId) : undefined;
      return {
        ...payment,
        booking: booking ? buildBookingWithRelations(booking) : null,
        customer:
          booking && typeof booking.customerId === "string"
            ? dbState.customers.get(booking.customerId) || null
            : null,
        trip:
          booking && typeof booking.tripId === "string"
            ? dbState.trips.get(booking.tripId) || null
            : null,
      };
    },
    update: async ({ where, data }: { where: { id: string }; data: MockRecord }) => {
      const p = dbState.payments.get(where.id);
      if (!p) throw new Error("Payment not found");
      Object.assign(p, data);
      const booking = typeof p.bookingId === "string" ? dbState.bookings.get(p.bookingId) : undefined;
      return {
        ...p,
        booking: booking ? buildBookingWithRelations(booking) : null,
      };
    },
    updateMany: async ({ where, data }: { where?: MockWhere; data: MockRecord }) => {
      let count = 0;
      for (const p of dbState.payments.values()) {
        if (matchWhere(p, where)) {
          Object.assign(p, data);
          count++;
        }
      }
      return { count };
    },
  },
  operationalExpense: {
    findMany: async ({ where }: MockFindArgs) =>
      Array.from(dbState.expenses.values()).filter((e) => matchWhere(e, where)),
    findFirst: async ({ where }: MockFindArgs) => {
      for (const e of dbState.expenses.values()) {
        if (matchWhere(e, where)) return e;
      }
      return null;
    },
    count: async ({ where }: MockFindArgs) =>
      Array.from(dbState.expenses.values()).filter((e) => matchWhere(e, where)).length,
    create: async ({ data }: { data: MockRecord }) => {
      const id = nextId("exp");
      const exp: MockRecord = { id, archivedAt: null, ...data };
      dbState.expenses.set(id, exp);
      return exp;
    },
    update: async ({ where, data }: { where: { id: string }; data: MockRecord }) => {
      const exp = dbState.expenses.get(where.id);
      if (!exp) throw new Error("Expense not found");
      Object.assign(exp, data);
      return exp;
    },
  },
  referral: {
    findMany: async ({ where }: MockFindArgs) =>
      Array.from(dbState.referrals.values()).filter((r) => matchWhere(r, where)),
    findFirst: async ({ where }: MockFindArgs) => {
      for (const r of dbState.referrals.values()) {
        if (matchWhere(r, where)) return r;
      }
      return null;
    },
    count: async ({ where }: MockFindArgs) =>
      Array.from(dbState.referrals.values()).filter((r) => matchWhere(r, where)).length,
    groupBy: async () => [],
    aggregate: async () => ({ _sum: { rewardAmount: 0 } }),
  },
  tripOperation: {
    findFirst: async ({ where }: MockFindArgs) => {
      for (const op of dbState.tripOperations.values()) {
        if (matchWhere(op, where)) {
          return {
            ...op,
            events: Array.from(dbState.operationEvents.values()).filter((e) => e.tripOperationId === op.id),
            booking: typeof op.bookingId === "string" ? dbState.bookings.get(op.bookingId) || null : null,
            hotelConfirmations: [],
            vehicleDispatches: [],
            activityConfirmations: [],
            issues: [],
            supplierPayables: [],
          };
        }
      }
      return null;
    },
  },
  operationEvent: {
    create: async ({ data }: { data: MockRecord }) => {
      const id = nextId("opEvt");
      const evt: MockRecord = { id, createdAt: new Date(), ...data };
      dbState.operationEvents.set(id, evt);
      return evt;
    },
    findMany: async () => [],
  },
  userNotification: {
    create: async ({ data }: { data: MockRecord }) => {
      const n: MockRecord = { id: nextId("notif"), ...data };
      dbState.userNotifications.push(n);
      return n;
    },
    findFirst: async () => null,
  },
  agencyAuditLog: {
    create: async ({ data }: { data: MockRecord }) => {
      dbState.auditLogs.push(data);
      return data;
    },
  },
  followUp: {
    findFirst: async ({ where }: MockFindArgs) => {
      for (const f of dbState.followUps.values()) {
        if (matchWhere(f, where)) return f;
      }
      return null;
    },
  },
  travelDocument: {
    findFirst: async ({ where }: MockFindArgs) => {
      for (const d of dbState.documents.values()) {
        if (matchWhere(d, where)) return d;
      }
      return null;
    },
  },
  quotation: {
    findFirst: async ({ where }: MockFindArgs) => {
      for (const q of dbState.quotations.values()) {
        if (matchWhere(q, where)) return q;
      }
      return null;
    },
  },
  enquiry: {
    findFirst: async () => null,
    findMany: async () => [],
    updateMany: async () => ({ count: 0 }),
  },
  platformChatConversation: {
    findUnique: async () => null,
  },
  platformChatMessage: {
    count: async () => 0,
  },
  supplierPayable: { findMany: async () => [] },
  supplierPayment: { findMany: async () => [] },
  taxProfile: { findUnique: async () => null },
  customerNotification: { findFirst: async () => null, create: async () => ({ id: "cn_1" }) },
};

// Intercept server-only, supabase/server, and prisma before route/service imports
type ModuleProto = { require: (id: string) => Record<string, unknown> };
const moduleProto = (Module as unknown as { prototype: ModuleProto }).prototype;
const originalRequire = moduleProto.require;
moduleProto.require = function (this: unknown, id: string, ...args: unknown[]) {
  if (id === "server-only") {
    return {};
  }
  if (id === "@/lib/supabase/server" || id.endsWith("/lib/supabase/server") || id.endsWith("\\lib\\supabase\\server")) {
    return {
      createClient: async () => ({
        auth: {
          getUser: async () => ({
            data: { user: currentSessionUser },
            error: currentSessionUser ? null : { message: "No active session" },
          }),
        },
      }),
    };
  }
  const res = originalRequire.apply(this, [id, ...args] as [string]);
  if (id === "@/lib/prisma" || id.endsWith("/lib/prisma") || id.endsWith("\\lib\\prisma")) {
    Object.assign(res.prisma as Record<string, unknown>, mockPrisma);
    Object.assign(res.default as Record<string, unknown>, mockPrisma);
  }
  return res;
};

// Override invoiceAdvisoryLocks cleanly by wrapping prisma.$transaction in tests where concurrency runs
let lockChain: Promise<void> = Promise.resolve();
mockPrisma.$transaction = async <T>(
  fnOrArray: Array<Promise<unknown>> | ((tx: unknown) => Promise<T>)
): Promise<T | unknown[]> => {
  if (Array.isArray(fnOrArray)) return Promise.all(fnOrArray);
  const prev = lockChain;
  let release!: () => void;
  lockChain = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    return await fnOrArray(mockPrisma);
  } finally {
    release();
  }
};

// ---------------------------------------------------------------------------
// 2. Test Runner Helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string, detail?: string) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ [PASS] ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ [FAIL] ${name}${detail ? ` -> ${detail}` : ""}`);
  }
}

async function assertRejects(fn: () => Promise<unknown>, expectedMatch: RegExp | string, name: string) {
  try {
    await fn();
    assert(false, name, "Expected promise to reject, but it resolved");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const ok =
      typeof expectedMatch === "string" ? msg.includes(expectedMatch) : expectedMatch.test(msg);
    assert(ok, name, ok ? undefined : `Unexpected error: ${msg}`);
  }
}

function makeNextRequest(url: string, method = "GET", body?: Record<string, unknown>) {
  return new NextRequest(url, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ---------------------------------------------------------------------------
// 3. Seed Deterministic In-Memory Fixtures
// ---------------------------------------------------------------------------

const agencyAlpha = {
  id: "agency_alpha",
  name: "Alpha Travels",
  status: AgencyStatus.ACTIVE,
  subscriptions: [
    {
      status: SubscriptionStatus.ACTIVE,
      plan: { name: "Growth" },
      trialStart: null,
      trialEnd: null,
      subscriptionEnd: new Date(Date.now() + 86400_000 * 30),
    },
  ],
};

const agencyBeta = {
  id: "agency_beta",
  name: "Beta Journeys",
  status: AgencyStatus.ACTIVE,
  subscriptions: [
    {
      status: SubscriptionStatus.ACTIVE,
      plan: { name: "Growth" },
      trialStart: null,
      trialEnd: null,
      subscriptionEnd: new Date(Date.now() + 86400_000 * 30),
    },
  ],
};

function resetFixtures() {
  dbState.users.clear();
  dbState.permissionProfiles.clear();
  dbState.permissionTableExists = true;
  dbState.permissionQueryError = null;
  dbState.bookings.clear();
  dbState.invoices.clear();
  dbState.invoiceItems.clear();
  dbState.invoiceSequences.clear();
  dbState.payments.clear();
  dbState.expenses.clear();
  dbState.referrals.clear();
  dbState.followUps.clear();
  dbState.documents.clear();
  dbState.quotations.clear();
  dbState.trips.clear();
  dbState.tripOperations.clear();
  dbState.operationEvents.clear();
  dbState.userNotifications = [];
  dbState.auditLogs = [];
  dbState.customers.clear();

  dbState.users.set("owner_alpha", {
    id: "owner_alpha",
    email: "owner@alpha.test",
    name: "Alpha Owner",
    role: UserRole.AGENCY_OWNER,
    agencyId: "agency_alpha",
    agency: agencyAlpha,
  });

  dbState.users.set("staff_alpha", {
    id: "staff_alpha",
    email: "staff@alpha.test",
    name: "Alpha Staff",
    role: UserRole.AGENCY_STAFF,
    agencyId: "agency_alpha",
    agency: agencyAlpha,
  });

  dbState.users.set("owner_beta", {
    id: "owner_beta",
    email: "owner@beta.test",
    name: "Beta Owner",
    role: UserRole.AGENCY_OWNER,
    agencyId: "agency_beta",
    agency: agencyBeta,
  });

  dbState.customers.set("cust_alpha_1", {
    id: "cust_alpha_1",
    agencyId: "agency_alpha",
    name: "Aarav Sharma",
    phone: "+919876543210",
    email: "aarav@example.com",
    address: "Mumbai",
    city: "Mumbai",
    state: "MH",
    country: "India",
    postalCode: "400001",
  });

  dbState.trips.set("trip_alpha_1", {
    id: "trip_alpha_1",
    agencyId: "agency_alpha",
    title: "Kerala Backwaters",
    tripNumber: "TRP-001",
    startDate: new Date("2026-12-01T00:00:00Z"),
    endDate: new Date("2026-12-05T00:00:00Z"),
    travelers: [{ id: "trav_1", name: "Aarav Sharma", type: "ADULT" }],
  });

  dbState.quotations.set("quote_alpha_1", {
    id: "quote_alpha_1",
    agencyId: "agency_alpha",
    quotationNumber: "QUO-001",
    title: "Kerala Luxury Quote",
    subtotal: new Prisma.Decimal(10000),
    markupAmount: new Prisma.Decimal(2000),
    discountAmount: new Prisma.Decimal(0),
    discountPercentage: new Prisma.Decimal(0),
    taxRate: new Prisma.Decimal(5),
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
    items: [
      {
        id: "qi_1",
        name: "Resort Stay",
        description: "4 nights houseboat & villa",
        type: "HOTEL",
        sourceType: "CATALOG",
        quantity: 2,
        costPrice: new Prisma.Decimal(5000),
        unitPrice: new Prisma.Decimal(5000),
        sellingPrice: new Prisma.Decimal(6000),
        totalPrice: new Prisma.Decimal(10000),
        sortOrder: 0,
        isOptional: false,
      },
    ],
  });

  dbState.bookings.set("book_alpha_confirmed", {
    id: "book_alpha_confirmed",
    agencyId: "agency_alpha",
    bookingNumber: "BKG-001",
    customerId: "cust_alpha_1",
    tripId: "trip_alpha_1",
    quotationId: "quote_alpha_1",
    status: BookingStatus.CONFIRMED,
    paymentStatus: BookingPaymentStatus.UNPAID,
    bookingDate: new Date("2026-11-20T00:00:00Z"),
    travelStartDate: new Date("2026-12-01T00:00:00Z"),
    travelEndDate: new Date("2026-12-05T00:00:00Z"),
    currency: "INR",
    totalAmount: new Prisma.Decimal(12600), // 12,000 + 5% GST
    paidAmount: new Prisma.Decimal(0),
    balanceAmount: new Prisma.Decimal(12600),
    taxableAmount: new Prisma.Decimal(12000),
    taxAmount: new Prisma.Decimal(600),
    taxRate: new Prisma.Decimal(5),
    taxMode: TaxMode.EXCLUSIVE,
    gstTreatment: GstTreatment.INTRA_STATE,
    cgstAmount: new Prisma.Decimal(300),
    sgstAmount: new Prisma.Decimal(300),
    igstAmount: new Prisma.Decimal(0),
    notes: "VIP guest",
    archivedAt: null,
  });

  dbState.bookings.set("book_alpha_draft", {
    id: "book_alpha_draft",
    agencyId: "agency_alpha",
    bookingNumber: "BKG-002",
    customerId: "cust_alpha_1",
    tripId: "trip_alpha_1",
    quotationId: null,
    status: BookingStatus.DRAFT,
    paymentStatus: BookingPaymentStatus.UNPAID,
    bookingDate: new Date("2026-11-20T00:00:00Z"),
    currency: "INR",
    totalAmount: new Prisma.Decimal(10000),
    paidAmount: new Prisma.Decimal(0),
    balanceAmount: new Prisma.Decimal(10000),
    archivedAt: null,
  });

  dbState.tripOperations.set("op_alpha_1", {
    id: "op_alpha_1",
    agencyId: "agency_alpha",
    bookingId: "book_alpha_confirmed",
    tripId: "trip_alpha_1",
    status: "IN_PROGRESS",
  });
}

// ---------------------------------------------------------------------------
// 4. Main Test Execution
// ---------------------------------------------------------------------------

async function run() {
  // Dynamically import modules AFTER Module.prototype.require mock is active
  const { default: prisma } = await import("../src/lib/prisma");
  Object.assign(prisma, mockPrisma);

  const { staffPermissionService, resetStaffPermissionTableCacheForTesting } = await import(
    "../src/lib/services/staff-permission-service"
  );
  const { invoiceService } = await import("../src/lib/services/invoice-service");
  const { paymentService, resetPaymentVerificationColumnsCacheForTesting } = await import(
    "../src/lib/services/payment-service"
  );
  const { financeService } = await import("../src/lib/services/finance-service");
  const { redactStaffFinancials } = await import("../src/lib/auth/permissions");

  // Route handlers
  const customerPaymentsRoute = await import("../src/app/api/finance/customer-payments/route");
  const refundRoute = await import("../src/app/api/finance/customer-payments/[id]/refund/route");
  const expensesRoute = await import("../src/app/api/finance/expenses/route");
  const expenseByIdRoute = await import("../src/app/api/finance/expenses/[id]/route");
  const bookingFinanceRoute = await import("../src/app/api/finance/bookings/[id]/route");
  const invoiceSummaryRoute = await import("../src/app/api/invoices/summary/route");
  const voidInvoicePaymentRoute = await import("../src/app/api/invoices/[id]/payments/[paymentId]/void/route");
  const recordInvoicePaymentRoute = await import("../src/app/api/invoices/[id]/payments/route");
  const opsAnalyticsExportRoute = await import("../src/app/api/operations/analytics/export/route");
  const opsClosureRoute = await import("../src/app/api/operations/[id]/closure/route");
  const opsClosureFinalizeRoute = await import("../src/app/api/operations/[id]/closure/finalize/route");
  const opsClosureReconcileRoute = await import("../src/app/api/operations/[id]/closure/reconciliation/route");
  const opsClosurePdfRoute = await import("../src/app/api/operations/[id]/closure/pdf/route");
  const dashboardSummaryRoute = await import("../src/app/api/dashboard/summary/route");
  const referralsRoute = await import("../src/app/api/referrals/route");
  const chatUnreadRoute = await import("../src/app/api/chat/unread-count/route");
  const followUpCompleteRoute = await import("../src/app/api/follow-ups/[id]/complete/route");
  const docDownloadRoute = await import("../src/app/api/documents/[id]/download/route");
  const commSendManualRoute = await import("../src/app/api/communication/send-manual/route");
  const enquiryAssignRoute = await import("../src/app/api/enquiries/[id]/assign/route");

  resetPaymentVerificationColumnsCacheForTesting();

  // =========================================================================
  // SUITE 1: AUTHORIZATION, OWNER-ONLY, TENANCY, REDACTION & FAIL-CLOSED
  // =========================================================================
  console.log("\n================================================================================");
  console.log("  SUITE 1: AUTHORIZATION, TENANT ISOLATION, OWNER-ONLY & FAIL-CLOSED CHECKS");
  console.log("================================================================================");
  resetFixtures();

  // 1.1 Unauthenticated callers -> 401
  currentSessionUser = null;
  {
    const r1 = await customerPaymentsRoute.GET(makeNextRequest("http://localhost/api/finance/customer-payments"));
    assert(r1.status === 401, "Unauthenticated GET /api/finance/customer-payments returns 401");

    const r2 = await dashboardSummaryRoute.GET(makeNextRequest("http://localhost/api/dashboard/summary"));
    assert(r2.status === 401, "Unauthenticated GET /api/dashboard/summary returns 401");

    const r3 = await referralsRoute.GET(makeNextRequest("http://localhost/api/referrals"));
    assert(r3.status === 401, "Unauthenticated GET /api/referrals returns 401");
  }

  // 1.2 Staff with explicit DENY/empty permission profile -> 403 across newly guarded routes
  currentSessionUser = { id: "staff_alpha", email: "staff@alpha.test" };
  dbState.permissionProfiles.set("staff_alpha", {
    userId: "staff_alpha",
    permissions: {
      DASHBOARD: { view: false },
      PAYMENTS: { view: false, create: false, recordReceipt: false },
      FINANCE: { view: false, create: false },
      INVOICES: { view: false },
      REFERRALS: { view: false, create: false },
      OPERATIONS: { view: false },
      FOLLOW_UPS: { view: false, update: false },
      DOCUMENTS: { view: false },
      COMMUNICATIONS: { view: false, create: false },
      SUPPORT_CHAT: { view: false },
      BOOKINGS: { view: false },
    },
  });

  {
    const deniedChecks: Array<[string, Promise<Response>]> = [
      ["GET /api/finance/customer-payments", customerPaymentsRoute.GET(makeNextRequest("http://localhost/api/finance/customer-payments"))],
      ["GET /api/finance/expenses", expensesRoute.GET(makeNextRequest("http://localhost/api/finance/expenses"))],
      ["PATCH /api/finance/expenses/[id]", expenseByIdRoute.PATCH(makeNextRequest("http://localhost/api/finance/expenses/exp_1", "PATCH", { title: "x" }), { params: Promise.resolve({ id: "exp_1" }) })],
      ["GET /api/finance/bookings/[id]", bookingFinanceRoute.GET(makeNextRequest("http://localhost/api/finance/bookings/book_alpha_confirmed"), { params: Promise.resolve({ id: "book_alpha_confirmed" }) })],
      ["GET /api/invoices/summary", invoiceSummaryRoute.GET(makeNextRequest("http://localhost/api/invoices/summary"))],
      ["GET /api/dashboard/summary", dashboardSummaryRoute.GET(makeNextRequest("http://localhost/api/dashboard/summary"))],
      ["GET /api/referrals", referralsRoute.GET(makeNextRequest("http://localhost/api/referrals"))],
      ["POST /api/referrals", referralsRoute.POST(makeNextRequest("http://localhost/api/referrals", "POST", { referrerCustomerId: "cust_1", referredName: "Test", referredPhone: "9999999999" }))],
      ["GET /api/operations/[id]/closure", opsClosureRoute.GET(makeNextRequest("http://localhost/api/operations/op_alpha_1/closure"), { params: Promise.resolve({ id: "op_alpha_1" }) })],
      ["GET /api/chat/unread-count", chatUnreadRoute.GET()],
      ["POST /api/follow-ups/[id]/complete", followUpCompleteRoute.POST(makeNextRequest("http://localhost/api/follow-ups/fu_1/complete", "POST", {}), { params: Promise.resolve({ id: "fu_1" }) })],
      ["GET /api/documents/[id]/download", docDownloadRoute.GET(makeNextRequest("http://localhost/api/documents/doc_1/download"), { params: Promise.resolve({ id: "doc_1" }) })],
      ["POST /api/communication/send-manual", commSendManualRoute.POST(makeNextRequest("http://localhost/api/communication/send-manual", "POST", {}))],
      ["POST /api/finance/customer-payments", customerPaymentsRoute.POST(makeNextRequest("http://localhost/api/finance/customer-payments", "POST", { bookingId: "book_alpha_confirmed", amount: 500, paymentMethod: "UPI", paymentType: "ADVANCE" }))],
      ["POST /api/finance/customer-payments/[id]/refund", refundRoute.POST(makeNextRequest("http://localhost/api/finance/customer-payments/pay_1/refund", "POST", { amount: 100, reason: "cancel" }), { params: Promise.resolve({ id: "pay_1" }) })],
      ["POST /api/invoices/[id]/payments/[paymentId]/void", voidInvoicePaymentRoute.POST(makeNextRequest("http://localhost/api/invoices/inv_1/payments/pay_1/void", "POST", { reason: "mistake" }), { params: Promise.resolve({ id: "inv_1", paymentId: "pay_1" }) })],
      ["GET /api/operations/analytics/export", opsAnalyticsExportRoute.GET(makeNextRequest("http://localhost/api/operations/analytics/export"))],
      ["PATCH /api/operations/[id]/closure/reconciliation", opsClosureReconcileRoute.PATCH(makeNextRequest("http://localhost/api/operations/op_alpha_1/closure/reconciliation", "PATCH", { actualCost: 1000 }), { params: Promise.resolve({ id: "op_alpha_1" }) })],
      ["POST /api/operations/[id]/closure/finalize", opsClosureFinalizeRoute.POST(makeNextRequest("http://localhost/api/operations/op_alpha_1/closure/finalize", "POST", { notes: "seal" }), { params: Promise.resolve({ id: "op_alpha_1" }) })],
      ["GET /api/operations/[id]/closure/pdf", opsClosurePdfRoute.GET(makeNextRequest("http://localhost/api/operations/op_alpha_1/closure/pdf"), { params: Promise.resolve({ id: "op_alpha_1" }) })],
      ["POST /api/enquiries/[id]/assign", enquiryAssignRoute.POST(makeNextRequest("http://localhost/api/enquiries/enq_1/assign", "POST", { assignedToId: "staff_alpha" }), { params: Promise.resolve({ id: "enq_1" }) })],
    ];

    for (const [label, prom] of deniedChecks) {
      const res = await prom;
      assert(res.status === 403, `Denied staff blocked (403) on ${label} (got ${res.status})`);
    }
  }

  // 1.3 Delegated agency-level permissions allow granted staff through authorization (no permanent owner-only blocks)
  dbState.permissionProfiles.set("staff_alpha", {
    userId: "staff_alpha",
    permissions: {
      DASHBOARD: { view: true, export: true },
      PAYMENTS: { view: true, create: true, verify: true, void: true, delete: true, recordReceipt: true },
      FINANCE: { view: true, create: true, update: true, delete: true },
      INVOICES: { view: true, create: true, update: true, delete: true },
      OPERATIONS: { view: true, update: true, export: true },
      ENQUIRIES: { view: true, update: true },
      SETTINGS: { view: true, update: true, delete: true },
      SUBSCRIPTION: { view: true, manage: true },
      TEAM: { view: true, create: true, update: true, delete: true },
      REFERRALS: { view: true, create: true },
      BOOKINGS: { view: true },
    },
  });

  {
    const delegatedChecks: Array<[string, Promise<Response>]> = [
      ["POST /api/finance/customer-payments", customerPaymentsRoute.POST(makeNextRequest("http://localhost/api/finance/customer-payments", "POST", { bookingId: "book_alpha_confirmed", amount: 500, paymentMethod: "UPI", paymentType: "ADVANCE" }))],
      ["POST /api/finance/customer-payments/[id]/refund", refundRoute.POST(makeNextRequest("http://localhost/api/finance/customer-payments/pay_1/refund", "POST", { amount: 100, reason: "cancel" }), { params: Promise.resolve({ id: "pay_1" }) })],
      ["POST /api/invoices/[id]/payments/[paymentId]/void", voidInvoicePaymentRoute.POST(makeNextRequest("http://localhost/api/invoices/inv_1/payments/pay_1/void", "POST", { reason: "mistake" }), { params: Promise.resolve({ id: "inv_1", paymentId: "pay_1" }) })],
      ["PATCH /api/finance/expenses/[id]", expenseByIdRoute.PATCH(makeNextRequest("http://localhost/api/finance/expenses/exp_1", "PATCH", { title: "x" }), { params: Promise.resolve({ id: "exp_1" }) })],
      ["GET /api/operations/analytics/export", opsAnalyticsExportRoute.GET(makeNextRequest("http://localhost/api/operations/analytics/export"))],
      ["PATCH /api/operations/[id]/closure/reconciliation", opsClosureReconcileRoute.PATCH(makeNextRequest("http://localhost/api/operations/op_alpha_1/closure/reconciliation", "PATCH", { actualCost: 1000 }), { params: Promise.resolve({ id: "op_alpha_1" }) })],
      ["POST /api/operations/[id]/closure/finalize", opsClosureFinalizeRoute.POST(makeNextRequest("http://localhost/api/operations/op_alpha_1/closure/finalize", "POST", { notes: "seal" }), { params: Promise.resolve({ id: "op_alpha_1" }) })],
      ["GET /api/operations/[id]/closure/pdf", opsClosurePdfRoute.GET(makeNextRequest("http://localhost/api/operations/op_alpha_1/closure/pdf"), { params: Promise.resolve({ id: "op_alpha_1" }) })],
      ["POST /api/enquiries/[id]/assign", enquiryAssignRoute.POST(makeNextRequest("http://localhost/api/enquiries/enq_1/assign", "POST", { assignedToId: "staff_alpha" }), { params: Promise.resolve({ id: "enq_1" }) })],
    ];

    for (const [label, prom] of delegatedChecks) {
      const res = await prom;
      assert(res.status !== 403 && res.status !== 401, `Delegated staff passes auth on ${label} (got ${res.status})`);
    }

    // Verify self-modification is still blocked even with TEAM: UPDATE
    let selfModBlocked = false;
    try {
      await staffPermissionService.updateStaffPermissions("agency_alpha", "staff_alpha", "staff_alpha", { TEAM: { view: true } }, mockPrisma);
    } catch {
      selfModBlocked = true;
    }
    assert(selfModBlocked, "Staff cannot modify their own permissions even with TEAM.update");

    // Granted delegable endpoints DO succeed (200) for staff
    const invSummaryRes = await invoiceSummaryRoute.GET(makeNextRequest("http://localhost/api/invoices/summary"));
    assert(invSummaryRes.status === 200, `Delegated staff with INVOICES.view gets 200 on GET /api/invoices/summary (got ${invSummaryRes.status})`);

    const refListRes = await referralsRoute.GET(makeNextRequest("http://localhost/api/referrals"));
    assert(refListRes.status === 200, `Delegated staff with REFERRALS.view gets 200 on GET /api/referrals (got ${refListRes.status})`);

    // Client-supplied agencyId on POST /api/finance/expenses is ignored -> uses server context.agencyId
    const expCreateRes = await expensesRoute.POST(
      makeNextRequest("http://localhost/api/finance/expenses", "POST", {
        agencyId: "agency_beta",
        description: "Airport parking",
        category: "MISCELLANEOUS",
        amount: 450,
        expenseDate: "2026-11-24T00:00:00.000Z",
      })
    );
    const expJson = await expCreateRes.json();
    assert(
      expCreateRes.status === 201 && expJson?.data?.agencyId === "agency_alpha",
      `POST /api/finance/expenses ignores client agencyId and binds context agency_alpha (status=${expCreateRes.status})`
    );
  }

  // 1.4 Cross-Agency Isolation: Owner Beta cannot touch Alpha records even with Alpha IDs
  {
    currentSessionUser = { id: "owner_beta", email: "owner@beta.test" };
    const crossClosure = await opsClosureRoute.GET(
      makeNextRequest("http://localhost/api/operations/op_alpha_1/closure"),
      { params: Promise.resolve({ id: "op_alpha_1" }) }
    );
    assert(
      crossClosure.status === 404 || crossClosure.status === 403,
      `Cross-tenant access from agency_beta to op_alpha_1 closure blocked (status=${crossClosure.status})`
    );
  }

  // 1.5 Fail-closed behavior on missing table, corrupt permissions JSON, or DB error
  {
    resetStaffPermissionTableCacheForTesting();
    dbState.permissionTableExists = false;
    mockPrisma.__mockHasStaffPermissionProfileTable = false;
    const allowedMissingTable = await staffPermissionService.hasStaffPermission(
      "AGENCY_STAFF",
      "agency_alpha",
      "staff_alpha",
      "INVOICES",
      "VIEW",
      mockPrisma
    );
    assert(allowedMissingTable === false, "staffPermissionService fails CLOSED when staff_permission_profiles table is missing");

    resetStaffPermissionTableCacheForTesting();
    dbState.permissionTableExists = true;
    mockPrisma.__mockHasStaffPermissionProfileTable = true;
    dbState.permissionProfiles.set("staff_alpha", { userId: "staff_alpha", permissions: ["corrupt-array"] });
    const allowedCorrupt = await staffPermissionService.hasStaffPermission(
      "AGENCY_STAFF",
      "agency_alpha",
      "staff_alpha",
      "INVOICES",
      "VIEW",
      mockPrisma
    );
    assert(allowedCorrupt === false, "staffPermissionService fails CLOSED when permission profile is corrupt/malformed");

    dbState.permissionQueryError = new Error("Simulated DB connection failure");
    const allowedDbErr = await staffPermissionService.hasStaffPermission(
      "AGENCY_STAFF",
      "agency_alpha",
      "staff_alpha",
      "INVOICES",
      "VIEW",
      mockPrisma
    );
    assert(allowedDbErr === false, "staffPermissionService fails CLOSED on database query error");
    dbState.permissionQueryError = null;
  }

  // 1.6 Financial Redaction verifies newly added operations closure / analytics keys are stripped for staff
  {
    const sensitivePayload = {
      bookingNumber: "BKG-001",
      plannedCost: 8000,
      actualCost: 9200,
      varianceAmount: -1200,
      totalPlannedCost: 8000,
      totalActualCost: 9200,
      totalVariance: -1200,
      averageVariancePercent: -15,
      overBudgetOperations: 1,
      savingsOperations: 0,
      financialReconciliation: {
        plannedCost: 8000,
        actualCost: 9200,
        margin: 3400,
      },
      summary: { totalOperations: 5, completed: 4 },
    };
    const staffRedacted = redactStaffFinancials(sensitivePayload, UserRole.AGENCY_STAFF);
    const ownerVisible = redactStaffFinancials(sensitivePayload, UserRole.AGENCY_OWNER);

    assert(
      staffRedacted.plannedCost === undefined &&
        staffRedacted.actualCost === undefined &&
        staffRedacted.varianceAmount === undefined &&
        staffRedacted.financialReconciliation === undefined &&
        staffRedacted.summary?.totalOperations === 5,
      "redactStaffFinancials strips internal planned/actual costs, variance metrics, and financialReconciliation for AGENCY_STAFF"
    );
    assert(
      ownerVisible.financialReconciliation?.margin === 3400 && ownerVisible.actualCost === 9200,
      "redactStaffFinancials preserves full financial metrics for AGENCY_OWNER"
    );
  }

  // =========================================================================
  // SUITE 2: INVOICE INTEGRITY, CONCURRENCY LOCKING & IMMUTABILITY
  // =========================================================================
  console.log("\n================================================================================");
  console.log("  SUITE 2: INVOICE IMMUTABILITY, CONCURRENCY SERIALIZATION & ISSUANCE NETTING");
  console.log("================================================================================");
  resetFixtures();

  // 2.1 Draft booking cannot get an invoice
  await assertRejects(
    () => invoiceService.getOrCreateInvoiceForBooking("agency_alpha", "book_alpha_draft"),
    /only be created for CONFIRMED/i,
    "getOrCreateInvoiceForBooking rejects DRAFT booking"
  );

  // 2.2 Concurrent calls allocate only ONE invoice and ONE sequence number
  {
    const [invA, invB, invC] = await Promise.all([
      invoiceService.getOrCreateInvoiceForBooking("agency_alpha", "book_alpha_confirmed"),
      invoiceService.getOrCreateInvoiceForBooking("agency_alpha", "book_alpha_confirmed"),
      invoiceService.getOrCreateInvoiceForBooking("agency_alpha", "book_alpha_confirmed"),
    ]);

    assert(
      invA.id === invB.id &&
        invB.id === invC.id &&
        invA.invoiceNumber === "INV-0001" &&
        dbState.invoices.size === 1 &&
        dbState.invoiceSequences.get("agency_alpha") === 1,
      `Concurrent getOrCreateInvoiceForBooking produces single INV-0001 without sequence waste (seq=${dbState.invoiceSequences.get("agency_alpha")}, count=${dbState.invoices.size})`
    );
  }

  // 2.3 Historical snapshot & line-item immutability when quotation/booking mutates later
  {
    const invBefore = Array.from(dbState.invoices.values())[0];
    const originalTotal = Number(invBefore.totalAmount);
    const originalItemsCount = Array.from(dbState.invoiceItems.values()).filter((i) => i.invoiceId === invBefore.id).length;

    // Simulate later quotation edit changing selling cost from 12,000 -> 25,000
    const quote = dbState.quotations.get("quote_alpha_1");
    quote.subtotal = new Prisma.Decimal(25000);
    quote.markupAmount = new Prisma.Decimal(0);
    quote.items[0].totalPrice = new Prisma.Decimal(25000);
    quote.items[0].description = "Tampered later description";

    const invAfter = await invoiceService.getOrCreateInvoiceForBooking("agency_alpha", "book_alpha_confirmed");
    assert(
      Number(invAfter.totalAmount) === originalTotal &&
        invAfter.items.length === originalItemsCount &&
        invAfter.items[0].description !== "Tampered later description",
      `Issued invoice (${invAfter.status}) preserves original total (${originalTotal}) and historical line items after quotation change`
    );

    // regenerateInvoice rejects ISSUED/PARTIALLY_PAID/PAID invoices
    await assertRejects(
      () => invoiceService.regenerateInvoice("agency_alpha", invBefore.id),
      /immutable historical accounting documents/i,
      "regenerateInvoice rejects ISSUED invoice in place"
    );
  }

  // 2.4 issueInvoice excludes PENDING/FAILED/VOIDED payments and subtracts refundedAmount
  {
    const draftInvId = nextId("inv");
    dbState.invoices.set(draftInvId, {
      id: draftInvId,
      agencyId: "agency_alpha",
      bookingId: null,
      invoiceNumber: null,
      status: InvoiceStatus.DRAFT,
      invoiceDate: new Date("2026-11-20T00:00:00Z"),
      dueDate: new Date("2026-11-30T00:00:00Z"),
      totalAmount: new Prisma.Decimal(10000),
      paidAmount: new Prisma.Decimal(0),
      balanceAmount: new Prisma.Decimal(10000),
      currency: "INR",
      archivedAt: null,
    });
    const draftItemId = nextId("invItem");
    dbState.invoiceItems.set(draftItemId, {
      id: draftItemId,
      invoiceId: draftInvId,
      description: "Package",
      quantity: 1,
      rate: new Prisma.Decimal(10000),
      amount: new Prisma.Decimal(10000),
      sortOrder: 0,
    });

    // Seed mixed payments on this draft invoice
    dbState.payments.set("p_settled_partial_refund", {
      id: "p_settled_partial_refund",
      agencyId: "agency_alpha",
      bookingId: "book_alpha_confirmed",
      invoiceId: draftInvId,
      paymentNumber: "PAY-2026-00001",
      amount: new Prisma.Decimal(6000),
      refundedAmount: new Prisma.Decimal(2000), // net = 4000
      status: PaymentStatus.COMPLETED,
      archivedAt: null,
    });
    dbState.payments.set("p_pending_ignore", {
      id: "p_pending_ignore",
      agencyId: "agency_alpha",
      bookingId: "book_alpha_confirmed",
      invoiceId: draftInvId,
      paymentNumber: "PAY-2026-00002",
      amount: new Prisma.Decimal(5000),
      refundedAmount: new Prisma.Decimal(0),
      status: PaymentStatus.PENDING,
      archivedAt: null,
    });
    dbState.payments.set("p_voided_ignore", {
      id: "p_voided_ignore",
      agencyId: "agency_alpha",
      bookingId: "book_alpha_confirmed",
      invoiceId: draftInvId,
      paymentNumber: "PAY-2026-00003",
      amount: new Prisma.Decimal(4000),
      refundedAmount: new Prisma.Decimal(0),
      status: PaymentStatus.VOIDED,
      archivedAt: null,
    });

    const issued = await invoiceService.issueInvoice("agency_alpha", draftInvId, "owner_alpha");
    assert(
      Number(issued.paidAmount) === 4000 &&
        Number(issued.balanceAmount) === 6000 &&
        issued.status === InvoiceStatus.PARTIALLY_PAID,
      `issueInvoice computes net settled paid=4000, balance=6000, status=PARTIALLY_PAID (got paid=${issued.paidAmount}, status=${issued.status})`
    );
  }

  // =========================================================================
  // SUITE 3: PAYMENTS, STAFF RECEIPTS, REFUNDS, VOID REUSE & IDEMPOTENCY
  // =========================================================================
  console.log("\n================================================================================");
  console.log("  SUITE 3: PAYMENTS, STAFF RECEIPT SAFETY, REFUNDS, VOID REUSE & IDEMPOTENCY");
  console.log("================================================================================");
  resetFixtures();

  const persistentInvoice = await invoiceService.getOrCreateInvoiceForBooking(
    "agency_alpha",
    "book_alpha_confirmed"
  );

  // 3.1 Staff recording invoice payment creates PENDING receipt without mutating balances
  {
    currentSessionUser = { id: "staff_alpha", email: "staff@alpha.test" };
    dbState.permissionProfiles.set("staff_alpha", {
      userId: "staff_alpha",
      permissions: {
        PAYMENTS: { view: true, recordReceipt: true },
        INVOICES: { view: true },
      },
    });

    const res = await recordInvoicePaymentRoute.POST(
      makeNextRequest(`http://localhost/api/invoices/${persistentInvoice.id}/payments`, "POST", {
        amount: 5000,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: "2026-11-24T00:00:00.000Z",
        referenceNumber: "UTR-STAFF-1",
      }),
      { params: Promise.resolve({ id: persistentInvoice.id }) }
    );
    const body = await res.json();
    const invAfter = dbState.invoices.get(persistentInvoice.id);
    const bkgAfter = dbState.bookings.get("book_alpha_confirmed");

    assert(
      res.status === 201 &&
        body?.data?.status === PaymentStatus.PENDING &&
        body?.data?.receivedBy === "staff_alpha" &&
        Number(invAfter.paidAmount) === 0 &&
        Number(bkgAfter.paidAmount) === 0,
      `Staff invoice payment route forces PENDING status with 0 settled balance impact (status=${res.status}, payStatus=${body?.data?.status})`
    );
  }

  // 3.2 Owner verifies pending receipt -> transitions to COMPLETED, recalculates booking, notifies staff via userNotification
  {
    const pendingPayment = Array.from(dbState.payments.values()).find((p) => p.referenceNumber === "UTR-STAFF-1");
    const notifBefore = dbState.userNotifications.length;
    const verified = await paymentService.verifyPaymentReceipt(
      "agency_alpha",
      pendingPayment.id,
      "owner_alpha",
      mockPrisma
    );
    const bkgAfter = dbState.bookings.get("book_alpha_confirmed");
    const invAfter = dbState.invoices.get(persistentInvoice.id);
    assert(
      verified.status === PaymentStatus.COMPLETED &&
        Number(bkgAfter.paidAmount) === 5000 &&
        Number(invAfter.paidAmount) === 5000 &&
        dbState.userNotifications.length === notifBefore + 1,
      `verifyPaymentReceipt settles 5000 onto booking/invoice and creates userNotification (paid=${bkgAfter.paidAmount})`
    );
  }

  // 3.3 Staff without PAYMENTS.recordReceipt permission cannot call financeService.recordCustomerPayment
  dbState.permissionProfiles.set("staff_alpha", {
    userId: "staff_alpha",
    permissions: { PAYMENTS: { view: true, recordReceipt: false } },
  });
  await assertRejects(
    () =>
      financeService.recordCustomerPayment(
        "agency_alpha",
        {
          bookingId: "book_alpha_confirmed",
          amount: 1000,
          paymentMethod: PaymentMethod.UPI,
          paymentType: PaymentType.PARTIAL,
        },
        "staff_alpha",
        { role: "AGENCY_STAFF", userId: "staff_alpha" }
      ),
    /do not have permission to record customer payments/i,
    "financeService.recordCustomerPayment blocks unpermitted AGENCY_STAFF actor at service boundary"
  );

  // 3.4 Owner records payment with idempotencyKey -> retry is idempotent, balances reach PAID (12,600)
  {
    const p1 = await financeService.recordCustomerPayment(
      "agency_alpha",
      {
        bookingId: "book_alpha_confirmed",
        amount: 7600,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentType: PaymentType.FINAL,
        referenceNumber: "UTR-FINAL-7600",
        idempotencyKey: "idem-final-7600",
      },
      "owner_alpha",
      { role: "AGENCY_OWNER", userId: "owner_alpha" }
    );
    const p2 = await financeService.recordCustomerPayment(
      "agency_alpha",
      {
        bookingId: "book_alpha_confirmed",
        amount: 7600,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentType: PaymentType.FINAL,
        referenceNumber: "UTR-FINAL-7600",
        idempotencyKey: "idem-final-7600",
      },
      "owner_alpha",
      { role: "AGENCY_OWNER", userId: "owner_alpha" }
    );
    const invAfter = dbState.invoices.get(persistentInvoice.id);
    const bkgAfter = dbState.bookings.get("book_alpha_confirmed");
    assert(
      p1.id === p2.id &&
        Number(bkgAfter.paidAmount) === 12600 &&
        Number(bkgAfter.balanceAmount) === 0 &&
        bkgAfter.paymentStatus === BookingPaymentStatus.PAID &&
        invAfter.status === InvoiceStatus.PAID,
      `recordCustomerPayment idempotently settles booking & invoice to PAID (paid=${bkgAfter.paidAmount}, invStatus=${invAfter.status})`
    );
  }

  // 3.5 Partial refund then remaining refund + over-refund guard + refund idempotency
  {
    const finalPayment = Array.from(dbState.payments.values()).find((p) => p.referenceNumber === "UTR-FINAL-7600");

    // Partial refund 2,600 -> payment remains COMPLETED, net paid drops 12,600 -> 10,000, invoice becomes PARTIALLY_PAID
    const rPartial = await financeService.refundCustomerPayment(
      "agency_alpha",
      finalPayment.id,
      { amount: 2600, reason: "Hotel downgrade", idempotencyKey: "ref-1" },
      "owner_alpha"
    );
    // Replay same refund idempotency key -> no double deduction!
    await financeService.refundCustomerPayment(
      "agency_alpha",
      finalPayment.id,
      { amount: 2600, reason: "Hotel downgrade", idempotencyKey: "ref-1" },
      "owner_alpha"
    );

    const bkgMid = dbState.bookings.get("book_alpha_confirmed");
    const invMid = dbState.invoices.get(persistentInvoice.id);
    assert(
      rPartial.status === PaymentStatus.COMPLETED &&
        Number(rPartial.refundedAmount) === 2600 &&
        Number(bkgMid.paidAmount) === 10000 &&
        Number(invMid.paidAmount) === 10000 &&
        invMid.status === InvoiceStatus.PARTIALLY_PAID,
      `Partial refund idempotently adjusts net paid to 10000 and status to PARTIALLY_PAID (got paid=${invMid.paidAmount}, status=${invMid.status})`
    );

    // Over-refund guard (remaining eligible is 5,000)
    await assertRejects(
      () =>
        financeService.refundCustomerPayment(
          "agency_alpha",
          finalPayment.id,
          { amount: 5001, reason: "Too much" },
          "owner_alpha"
        ),
      /exceeds eligible balance/i,
      "refundCustomerPayment rejects refund exceeding remaining eligible balance"
    );

    // Remaining refund 5,000 -> payment status becomes REFUNDED, net paid = 5,000
    const rFull = await financeService.refundCustomerPayment(
      "agency_alpha",
      finalPayment.id,
      { amount: 5000, reason: "Full segment refund", idempotencyKey: "ref-2" },
      "owner_alpha"
    );
    const bkgAfterRef = dbState.bookings.get("book_alpha_confirmed");
    assert(
      rFull.status === PaymentStatus.REFUNDED &&
        Number(rFull.refundedAmount) === 7600 &&
        Number(bkgAfterRef.paidAmount) === 5000,
      `Full refund transitions payment to REFUNDED with booking paid=5000 (got paid=${bkgAfterRef.paidAmount})`
    );
  }

  // 3.6 Void remaining payment and verify referenceNumber reuse & invoice reverting to ISSUED
  {
    const firstPayment = Array.from(dbState.payments.values()).find((p) => p.referenceNumber === "UTR-STAFF-1");
    await paymentService.voidPayment(
      "agency_alpha",
      firstPayment.id,
      "owner_alpha",
      "Duplicate entry correction",
      persistentInvoice.id
    );
    const invVoided = dbState.invoices.get(persistentInvoice.id);
    const bkgVoided = dbState.bookings.get("book_alpha_confirmed");
    assert(
      Number(invVoided.paidAmount) === 0 &&
        Number(invVoided.balanceAmount) === 12600 &&
        invVoided.status === InvoiceStatus.ISSUED &&
        bkgVoided.paymentStatus === BookingPaymentStatus.UNPAID,
      `voidPayment resets invoice to ISSUED (paid=0, balance=12600) and booking to UNPAID`
    );

    // Voided referenceNumber "UTR-STAFF-1" can now be reused on a fresh payment
    const reusedPayment = await paymentService.recordInvoicePayment(
      "agency_alpha",
      persistentInvoice.id,
      {
        amount: 2000,
        paymentMethod: PaymentMethod.UPI,
        paymentDate: "2026-11-25T00:00:00.000Z",
        referenceNumber: "UTR-STAFF-1",
      },
      { role: "AGENCY_OWNER", userId: "owner_alpha" }
    );
    assert(
      reusedPayment.status === PaymentStatus.COMPLETED && Number(reusedPayment.amount) === 2000,
      "Voided payment referenceNumber can be reused cleanly on subsequent payment"
    );

    // Active referenceNumber duplicate is rejected with ConflictError
    await assertRejects(
      () =>
        paymentService.recordInvoicePayment(
          "agency_alpha",
          persistentInvoice.id,
          {
            amount: 1000,
            paymentMethod: PaymentMethod.UPI,
            paymentDate: "2026-11-25T00:00:00.000Z",
            referenceNumber: "UTR-STAFF-1",
          },
          { role: "AGENCY_OWNER", userId: "owner_alpha" }
        ),
      /already exists|already been recorded/i,
      "Active duplicate referenceNumber rejected with conflict error"
    );
  }

  console.log("\n================================================================================");
  console.log(`  PHASE 1 REGRESSION SUITE SUMMARY: ${passed} passed, ${failed} failed (total ${passed + failed})`);
  console.log("================================================================================\n");
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Fatal error in regression suite:", err);
  process.exit(1);
});
