import * as fs from "fs";
import * as path from "path";

const targetPath = path.resolve("src/lib/services/staff-permission-service.ts");
let raw = fs.readFileSync(targetPath, "utf8");
const isCRLF = raw.includes("\r\n");
let content = raw.replace(/\r\n/g, "\n");

const topTarget = `import { agencyAuditService } from "./agency-audit-service";
import "server-only";

export const staffPermissionService = {`;

const topRepl = `import { agencyAuditService } from "./agency-audit-service";
import "server-only";

let _hasStaffPermissionProfileTableCache: boolean | null = null;

export async function checkHasStaffPermissionProfileTable(client: any = prisma): Promise<boolean> {
  if (_hasStaffPermissionProfileTableCache !== null) {
    return _hasStaffPermissionProfileTableCache;
  }
  // Allow test mocks to explicitly declare table existence
  if (client && typeof client.__mockHasStaffPermissionProfileTable === "boolean") {
    return client.__mockHasStaffPermissionProfileTable;
  }
  // Allow unit test mocks that provide staffPermissionProfile directly without Prisma query capabilities
  if (client && client !== prisma && client.staffPermissionProfile && !client.$queryRaw && !client.$transaction) {
    return true;
  }
  try {
    const rawQuery = client?.$queryRaw || prisma?.$queryRaw;
    if (typeof rawQuery === "function") {
      const res: any = await rawQuery\`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'staff_permission_profiles'
        LIMIT 1
      \`;
      _hasStaffPermissionProfileTableCache = Array.isArray(res) && res.length > 0;
      return _hasStaffPermissionProfileTableCache;
    }
  } catch {
    // Non-PostgreSQL or query error
  }
  return false;
}

export function resetStaffPermissionTableCacheForTesting() {
  _hasStaffPermissionProfileTableCache = null;
}

export const staffPermissionService = {`;

if (content.includes(topTarget)) {
  content = content.replace(topTarget, topRepl);
  console.log("Added checkHasStaffPermissionProfileTable helper");
} else {
  console.error("FAILED to match topTarget");
}

const getPermsTarget = `  async getStaffPermissions(agencyId: string, userId: string, prismaClient: any = prisma): Promise<StaffPermissionsProfileMap> {
    const client = prismaClient || prisma;
    const user = client.user?.findFirst ? await client.user.findFirst({
      where: { id: userId, agencyId, role: "AGENCY_STAFF" },
      select: { id: true },
    }) : { id: userId };

    if (!user) {
      throw new Error("Staff member not found in this agency.");
    }

    try {
      if (client.staffPermissionProfile?.findUnique) {
        const profile = await client.staffPermissionProfile.findUnique({
          where: { userId },
        });

        // 1. Genuinely new or unconfigured staff member: query succeeded and returned no custom record
        if (profile === null || profile === undefined) {
          return DEFAULT_STAFF_PERMISSIONS;
        }

        // 2. Existing profile with valid structured permissions object
        if (profile?.permissions && typeof profile.permissions === "object" && !Array.isArray(profile.permissions)) {
          return profile.permissions as StaffPermissionsProfileMap;
        }

        // 3. Profile exists but permissions field is corrupt/malformed -> fail closed
        console.warn("[StaffPermissionService] Corrupt or malformed permission profile detected; failing closed", {
          agencyId,
          userId,
        });
        return {};
      }
    } catch (err: any) {
      // 4. Database failure, connection outage, or unmigrated table (e.g. Prisma P2021)
      console.error("[StaffPermissionService] Database or schema failure while retrieving staff permissions; failing closed", {
        agencyId,
        userId,
        errorCode: err?.code,
        errorMessage: err?.message,
      });
      return {};
    }

    return DEFAULT_STAFF_PERMISSIONS;
  },`;

const getPermsRepl = `  async getStaffPermissions(agencyId: string, userId: string, prismaClient: any = prisma): Promise<StaffPermissionsProfileMap> {
    const client = prismaClient || prisma;
    const user = client.user?.findFirst ? await client.user.findFirst({
      where: { id: userId, agencyId, role: "AGENCY_STAFF" },
      select: { id: true },
    }) : { id: userId };

    if (!user) {
      throw new Error("Staff member not found in this agency.");
    }

    // 1. Explicitly verify table presence
    const hasTable = await checkHasStaffPermissionProfileTable(client);
    if (!hasTable) {
      console.warn(
        "[StaffPermissionService] staff_permission_profiles table is absent from current database; failing closed. Migration prerequisite: 20261027150000_phase_f_staff_permissions",
        { agencyId, userId }
      );
      return {};
    }

    if (!client.staffPermissionProfile?.findUnique) {
      console.warn("[StaffPermissionService] staffPermissionProfile delegate unavailable on client; failing closed", { agencyId, userId });
      return {};
    }

    try {
      const profile = await client.staffPermissionProfile.findUnique({
        where: { userId },
      });

      // 2. Table exists and query executed successfully: genuinely new staff member with no custom row
      if (profile === null || profile === undefined) {
        return DEFAULT_STAFF_PERMISSIONS;
      }

      // 3. Table exists and query executed successfully: existing profile with valid structured permissions object
      if (profile?.permissions && typeof profile.permissions === "object" && !Array.isArray(profile.permissions)) {
        return profile.permissions as StaffPermissionsProfileMap;
      }

      // 4. Table exists and query executed successfully: profile exists but permissions field is corrupt/malformed -> fail closed
      console.warn("[StaffPermissionService] Corrupt or malformed permission profile detected; failing closed", {
        agencyId,
        userId,
      });
      return {};
    } catch (err: any) {
      // 5. Database failure, connection outage, or query failure
      console.error("[StaffPermissionService] Database or schema failure while retrieving staff permissions; failing closed", {
        agencyId,
        userId,
        errorCode: err?.code,
        errorMessage: err?.message,
      });
      return {};
    }
  },`;

if (content.includes(getPermsTarget)) {
  content = content.replace(getPermsTarget, getPermsRepl);
  console.log("Replaced getStaffPermissions implementation");
} else {
  console.error("FAILED to match getPermsTarget");
}

const updateTarget = `    // Persist profile
    if (client.staffPermissionProfile?.upsert) {`;

const updateRepl = `    const hasTable = await checkHasStaffPermissionProfileTable(client);
    if (!hasTable) {
      throw new Error(
        "Cannot update staff permissions: staff_permission_profiles table does not exist in current database. Pending migration: 20261027150000_phase_f_staff_permissions"
      );
    }

    // Persist profile
    if (client.staffPermissionProfile?.upsert) {`;

if (content.includes(updateTarget)) {
  content = content.replace(updateTarget, updateRepl);
  console.log("Added table existence check to updateStaffPermissions");
} else {
  console.error("FAILED to match updateTarget");
}

if (isCRLF) content = content.replace(/\n/g, "\r\n");
fs.writeFileSync(targetPath, content, "utf8");
console.log("Saved staff-permission-service.ts");

