import assert from "node:assert/strict";
import Module from "node:module";
import { NextRequest } from "next/server";

// Helper to craft a minimal unsigned JWT with a specific `iat` (seconds) for session-revocation tests
function makeJwtWithIat(iatSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: "staff_alpha", iat: iatSeconds })).toString("base64url");
  return `${header}.${payload}.sig`;
}

type UserRecord = {
  id: string;
  agencyId: string | null;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  deactivatedAt: Date | null;
  sessionRevokedAt: Date | null;
  deactivatedById: string | null;
};

const dbState = {
  users: new Map<string, UserRecord>(),
  permissionProfiles: new Map<string, { userId: string; permissions: Record<string, unknown> }>(),
  auditLogs: [] as Array<Record<string, unknown>>,
  authBanned: new Map<string, boolean>(),
  failNextBan: false,
  failNextUnban: false,
};

let currentSessionUser: { id: string; email: string } | null = null;
let currentJwtIatSeconds = Math.floor(Date.now() / 1000);

const mockPrisma: any = {
  __mockHasAgencyAuditLogsTable: true,
  __mockHasStaffPermissionProfileTable: true,
  user: {
    findUnique: async ({ where }: any) => {
      const u = dbState.users.get(where.id);
      return u ? { ...u, agency: u.agencyId ? { id: u.agencyId, name: "Alpha Travels", status: "ACTIVE", subscriptions: [{ status: "ACTIVE", plan: { name: "Pro" } }] } : null } : null;
    },
    findFirst: async ({ where }: any) => {
      for (const u of dbState.users.values()) {
        if (where.id && u.id !== where.id) continue;
        if (where.agencyId && u.agencyId !== where.agencyId) continue;
        if (where.role && u.role !== where.role) continue;
        return { ...u };
      }
      return null;
    },
    update: async ({ where, data }: any) => {
      const existing = dbState.users.get(where.id);
      if (!existing) throw new Error("User not found");
      const updated: UserRecord = {
        ...existing,
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.deactivatedAt !== undefined ? { deactivatedAt: data.deactivatedAt } : {}),
        ...(data.sessionRevokedAt !== undefined ? { sessionRevokedAt: data.sessionRevokedAt } : {}),
        ...(data.deactivatedById !== undefined ? { deactivatedById: data.deactivatedById } : {}),
      };
      dbState.users.set(where.id, updated);
      return { ...updated };
    },
  },
  staffPermissionProfile: {
    findUnique: async ({ where }: any) => dbState.permissionProfiles.get(where.userId) ?? null,
  },
  agencyAuditLog: {
    create: async ({ data }: any) => {
      dbState.auditLogs.push(data);
      return data;
    },
  },
  $transaction: async (fn: (tx: any) => Promise<any>) => fn(mockPrisma),
};

const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
(Module as unknown as { _load: (request: string, parent: unknown, isMain: boolean) => unknown })._load = function (
  request: string,
  parent: unknown,
  isMain: boolean
) {
  if (request === "server-only") return {};
  if (request === "@/lib/prisma" || request.endsWith("/lib/prisma")) {
    return { __esModule: true, default: mockPrisma, prisma: mockPrisma };
  }
  if (request === "@/lib/supabase/server" || request.endsWith("/lib/supabase/server")) {
    return {
      createClient: async () => ({
        auth: {
          getUser: async () => ({ data: { user: currentSessionUser }, error: null }),
          getSession: async () => ({
            data: {
              session: currentSessionUser ? { access_token: makeJwtWithIat(currentJwtIatSeconds) } : null,
            },
          }),
        },
      }),
    };
  }
  if (request === "@/lib/supabase/admin" || request.endsWith("/lib/supabase/admin")) {
    return {
      revokeAuthUserSessionsAndBan: async (userId: string) => {
        if (dbState.failNextBan) {
          dbState.failNextBan = false;
          throw new Error("Simulated Supabase outage");
        }
        dbState.authBanned.set(userId, true);
        return { invoked: true };
      },
      unbanAuthUser: async (userId: string) => {
        if (dbState.failNextUnban) {
          dbState.failNextUnban = false;
          throw new Error("Simulated Supabase unban outage");
        }
        dbState.authBanned.set(userId, false);
        return { invoked: true };
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

async function run() {
  const { staffLifecycleService } = await import("../src/lib/services/staff-lifecycle-service");
  const { staffPermissionService } = await import("../src/lib/services/staff-permission-service");
  const { isDbUserSessionValid } = await import("../src/lib/auth/session-validation");
  const { getRequestContext } = await import("../src/lib/api/context");
  const deactivateRoute = await import("../src/app/api/team/members/[id]/deactivate/route");
  const reactivateRoute = await import("../src/app/api/team/members/[id]/reactivate/route");

  dbState.users.set("owner_alpha", {
    id: "owner_alpha",
    agencyId: "agency_alpha",
    name: "Owner Alpha",
    email: "owner@alpha.test",
    role: "AGENCY_OWNER",
    isActive: true,
    deactivatedAt: null,
    sessionRevokedAt: null,
    deactivatedById: null,
  });
  dbState.users.set("staff_alpha", {
    id: "staff_alpha",
    agencyId: "agency_alpha",
    name: "Staff Alpha",
    email: "staff@alpha.test",
    role: "AGENCY_STAFF",
    isActive: true,
    deactivatedAt: null,
    sessionRevokedAt: null,
    deactivatedById: null,
  });
  dbState.users.set("staff_beta", {
    id: "staff_beta",
    agencyId: "agency_beta",
    name: "Staff Beta",
    email: "staff@beta.test",
    role: "AGENCY_STAFF",
    isActive: true,
    deactivatedAt: null,
    sessionRevokedAt: null,
    deactivatedById: null,
  });
  dbState.users.set("platform_admin", {
    id: "platform_admin",
    agencyId: null,
    name: "Platform Owner",
    email: "admin@tripdesk.test",
    role: "PLATFORM_OWNER",
    isActive: true,
    deactivatedAt: null,
    sessionRevokedAt: null,
    deactivatedById: null,
  });
  dbState.permissionProfiles.set("staff_alpha", {
    userId: "staff_alpha",
    permissions: {
      BOOKINGS: { view: true, create: true, update: true, delete: true },
      FINANCE: { view: true, create: true },
      TEAM: { view: true, create: true, update: true, delete: true },
    },
  });

  let passed = 0;
  function check(cond: boolean, label: string) {
    if (!cond) {
      console.error(`  ✗ [FAIL] ${label}`);
      process.exit(1);
    }
    console.log(`  ✓ [PASS] ${label}`);
    passed++;
  }

  // 1. Unauthenticated requests rejected (401)
  currentSessionUser = null;
  const unauthRes = await deactivateRoute.POST(
    new NextRequest("http://localhost/api/team/members/staff_alpha/deactivate", { method: "POST" }),
    { params: Promise.resolve({ id: "staff_alpha" }) }
  );
  check(unauthRes.status === 401, `Unauthenticated deactivate returns 401 (got ${unauthRes.status})`);

  // 2. Staff with full TEAM permissions CANNOT deactivate themselves or other staff
  currentSessionUser = { id: "staff_alpha", email: "staff@alpha.test" };
  currentJwtIatSeconds = Math.floor(Date.now() / 1000) - 60;
  const staffSelfRes = await deactivateRoute.POST(
    new NextRequest("http://localhost/api/team/members/staff_alpha/deactivate", { method: "POST" }),
    { params: Promise.resolve({ id: "staff_alpha" }) }
  );
  check(staffSelfRes.status === 403, `Staff cannot deactivate themselves (got ${staffSelfRes.status})`);

  const staffOtherRes = await deactivateRoute.POST(
    new NextRequest("http://localhost/api/team/members/staff_beta/deactivate", { method: "POST" }),
    { params: Promise.resolve({ id: "staff_beta" }) }
  );
  check(staffOtherRes.status === 403, `Staff cannot deactivate other staff (got ${staffOtherRes.status})`);

  // 3. Owner cannot deactivate self, cross-agency staff, or PLATFORM_OWNER
  currentSessionUser = { id: "owner_alpha", email: "owner@alpha.test" };
  const ownerSelfRes = await deactivateRoute.POST(
    new NextRequest("http://localhost/api/team/members/owner_alpha/deactivate", { method: "POST" }),
    { params: Promise.resolve({ id: "owner_alpha" }) }
  );
  check(ownerSelfRes.status === 400, `Owner cannot deactivate self (got ${ownerSelfRes.status})`);

  const crossAgencyRes = await deactivateRoute.POST(
    new NextRequest("http://localhost/api/team/members/staff_beta/deactivate", {
      method: "POST",
      body: JSON.stringify({ agencyId: "agency_beta" }),
    }),
    { params: Promise.resolve({ id: "staff_beta" }) }
  );
  check(crossAgencyRes.status === 404, `Cross-agency deactivate rejected with 404 (got ${crossAgencyRes.status})`);

  const platformTargetRes = await deactivateRoute.POST(
    new NextRequest("http://localhost/api/team/members/platform_admin/deactivate", { method: "POST" }),
    { params: Promise.resolve({ id: "platform_admin" }) }
  );
  check(platformTargetRes.status === 404 || platformTargetRes.status === 403, `PLATFORM_OWNER target rejected (got ${platformTargetRes.status})`);

  // 4. Failure ordering: if Supabase revocation fails, DB is still deactivated & 502 returned
  dbState.failNextBan = true;
  const failBanRes = await deactivateRoute.POST(
    new NextRequest("http://localhost/api/team/members/staff_alpha/deactivate", { method: "POST" }),
    { params: Promise.resolve({ id: "staff_alpha" }) }
  );
  check(failBanRes.status === 502, `Failed Supabase revocation returns 502 (got ${failBanRes.status})`);
  check(dbState.users.get("staff_alpha")?.isActive === false, "DB user remains safely deactivated on auth failure");

  // 5. Idempotent retry completes Supabase ban cleanly & audit log recorded
  const retryDeactRes = await deactivateRoute.POST(
    new NextRequest("http://localhost/api/team/members/staff_alpha/deactivate", { method: "POST" }),
    { params: Promise.resolve({ id: "staff_alpha" }) }
  );
  const retryDeactJson = await retryDeactRes.json();
  check(retryDeactRes.status === 200 && retryDeactJson.data.alreadyDeactivated === true, "Repeated deactivation succeeds idempotently");
  check(dbState.authBanned.get("staff_alpha") === true, "Supabase Auth user banned on deactivation");
  check(dbState.auditLogs.some((l) => l.action === "STAFF_DEACTIVATED" && l.targetUserId === "staff_alpha"), "STAFF_DEACTIVATED audit log persisted");
  check(dbState.permissionProfiles.has("staff_alpha"), "StaffPermissionProfile preserved on deactivation");

  // 6. Active session & cached permission checks immediately reject deactivated staff
  const preDeactivationIat = Math.floor(Date.now() / 1000) - 300;
  currentSessionUser = { id: "staff_alpha", email: "staff@alpha.test" };
  currentJwtIatSeconds = preDeactivationIat;
  const deactivatedCtx = await getRequestContext();
  check(deactivatedCtx === null, "getRequestContext() returns null for deactivated staff with existing JWT");

  const permWhileDeactivated = await staffPermissionService.hasStaffPermission(
    "AGENCY_STAFF",
    "agency_alpha",
    "staff_alpha",
    "BOOKINGS",
    "VIEW",
    mockPrisma
  );
  check(permWhileDeactivated === false, "Deactivated staff cannot bypass via saved permissions");

  // 7. Reactivation failure does NOT mark DB active
  currentSessionUser = { id: "owner_alpha", email: "owner@alpha.test" };
  dbState.failNextUnban = true;
  const failUnbanRes = await reactivateRoute.POST(
    new NextRequest("http://localhost/api/team/members/staff_alpha/reactivate", { method: "POST" }),
    { params: Promise.resolve({ id: "staff_alpha" }) }
  );
  check(failUnbanRes.status === 502 && dbState.users.get("staff_alpha")?.isActive === false, "Failed Supabase unban leaves DB deactivated");

  // 8. Owner reactivates staff -> old JWT STILL rejected, fresh JWT works, saved permissions restored
  const reactRes = await reactivateRoute.POST(
    new NextRequest("http://localhost/api/team/members/staff_alpha/reactivate", { method: "POST" }),
    { params: Promise.resolve({ id: "staff_alpha" }) }
  );
  check(reactRes.status === 200 && dbState.users.get("staff_alpha")?.isActive === true, "Owner reactivates staff successfully");
  check(dbState.authBanned.get("staff_alpha") === false, "Supabase Auth ban lifted on reactivation");
  check(dbState.auditLogs.some((l) => l.action === "STAFF_REACTIVATED" && l.targetUserId === "staff_alpha"), "STAFF_REACTIVATED audit log persisted");

  // Old JWT issued before deactivation MUST remain invalid after reactivation
  currentSessionUser = { id: "staff_alpha", email: "staff@alpha.test" };
  currentJwtIatSeconds = preDeactivationIat;
  const oldSessionAfterReact = await getRequestContext();
  check(oldSessionAfterReact === null, "Old pre-deactivation JWT remains invalid after reactivation");

  // Fresh login JWT issued after reactivation MUST work and load saved permissions
  currentJwtIatSeconds = Math.floor(Date.now() / 1000) + 60;
  const freshSessionAfterReact = await getRequestContext();
  check(freshSessionAfterReact !== null && freshSessionAfterReact.dbUser.id === "staff_alpha", "Fresh post-reactivation JWT succeeds");

  const permAfterReact = await staffPermissionService.hasStaffPermission(
    "AGENCY_STAFF",
    "agency_alpha",
    "staff_alpha",
    "FINANCE",
    "VIEW",
    mockPrisma
  );
  check(permAfterReact === true, "Saved permissions are preserved and active after reactivation");

  // Idempotent repeat reactivation
  const repeatReactRes = await staffLifecycleService.reactivateStaffMember("agency_alpha", "staff_alpha", "owner_alpha", undefined, {
    prismaClient: mockPrisma,
    unbanAuthFn: async () => ({ invoked: false }),
  });
  check(repeatReactRes.alreadyActive === true, "Repeated reactivation is handled idempotently");

  // Direct session-validation edge check
  const invalidSessionResult = await isDbUserSessionValid(
    { isActive: true, deactivatedAt: null, sessionRevokedAt: new Date(Date.now()) },
    { auth: { getSession: async () => ({ data: { session: { access_token: makeJwtWithIat(preDeactivationIat) } } }) } }
  );
  check(invalidSessionResult === false, "isDbUserSessionValid rejects token with iat < sessionRevokedAt");

  console.log(`\nSTAFF LIFECYCLE SUITE SUMMARY: ${passed} passed, 0 failed (total ${passed})`);
}

run().catch((err) => {
  console.error("Fatal error in staff lifecycle suite:", err);
  process.exit(1);
});
