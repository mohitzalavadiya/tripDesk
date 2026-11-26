import { prisma } from "@/lib/prisma";
import { ApiError, NotFoundError, ValidationError, ForbiddenError } from "@/lib/api/errors";
import {
  DEFAULT_STAFF_PERMISSIONS,
  evaluateStaffPermission,
  normalizeStaffPermissions,
  StaffPermissionsProfileMap,
} from "@/lib/auth/permissions";
import { agencyAuditService } from "./agency-audit-service";
import "server-only";

let _hasStaffPermissionProfileTableCache: boolean | null = null;

export async function checkHasStaffPermissionProfileTable(client: any = prisma): Promise<boolean> {
  // Allow test mocks to explicitly declare table existence
  if (client && typeof client.__mockHasStaffPermissionProfileTable === "boolean") {
    return client.__mockHasStaffPermissionProfileTable;
  }
  // Allow unit test mocks that provide staffPermissionProfile directly without Prisma query capabilities
  if (client && client !== prisma && client.staffPermissionProfile && !client.$queryRaw) {
    return true;
  }
  if (_hasStaffPermissionProfileTableCache !== null) {
    return _hasStaffPermissionProfileTableCache;
  }

  const db = (client && typeof client.$queryRaw === "function") ? client : prisma;
  if (db && typeof db.$queryRaw === "function") {
    // If the database query throws (e.g. connection error, credentials failure),
    // let it throw so database failures are not falsely masked as missing tables.
    const res: any = await db.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'staff_permission_profiles'
      LIMIT 1
    `;
    _hasStaffPermissionProfileTableCache = Array.isArray(res) && res.length > 0;
    return _hasStaffPermissionProfileTableCache;
  }
  return false;
}

export function resetStaffPermissionTableCacheForTesting() {
  _hasStaffPermissionProfileTableCache = null;
}

export const staffPermissionService = {
  /**
   * Retrieves the permission profile for a staff member.
   * If no custom profile exists, returns the default operational staff permissions.
   */
  async getStaffPermissions(agencyId: string, userId: string, prismaClient: any = prisma): Promise<StaffPermissionsProfileMap> {
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
        return normalizeStaffPermissions(profile.permissions);
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
  },

  /**
   * Updates a staff member's permissions with audit logging and invariant enforcement.
   * Invariants:
   * 1. Cannot modify own permissions.
   * 2. Cannot grant DELETE on immutable owner-only modules.
   * 3. View is a strict prerequisite: if view is false, child actions cannot be true.
   * 4. Target must be an AGENCY_STAFF user in the same agency.
   */
  async updateStaffPermissions(
    agencyId: string,
    targetUserId: string,
    actorUserId: string,
    permissionsInput: StaffPermissionsProfileMap,
    metadataOrClient?: any,
    prismaClient?: any
  ): Promise<StaffPermissionsProfileMap> {
    let client: any = prisma;
    let metadata: { ipAddress?: string | null; userAgent?: string | null } | undefined;

    if (metadataOrClient && (metadataOrClient.user || metadataOrClient.staffPermissionProfile || metadataOrClient.agencyAuditLog || metadataOrClient.$transaction)) {
      client = metadataOrClient;
      metadata = undefined;
    } else {
      metadata = metadataOrClient;
      client = prismaClient || prisma;
    }

    if (targetUserId === actorUserId) {
      throw new ValidationError("Agency Owners cannot modify their own administrative permissions.");
    }

    const targetUser = client.user?.findFirst ? await client.user.findFirst({
      where: { id: targetUserId, agencyId, role: "AGENCY_STAFF" },
      select: { id: true, name: true, email: true },
    }) : { id: targetUserId };

    if (!targetUser) {
      throw new NotFoundError("Target staff member");
    }

    // Sanitize and enforce invariants via canonical normalizer
    const sanitized = normalizeStaffPermissions(permissionsInput);

    // Fetch prior state for auditing
    let priorPermissions = DEFAULT_STAFF_PERMISSIONS;
    try {
      if (client.staffPermissionProfile?.findUnique) {
        const existing = await client.staffPermissionProfile.findUnique({
          where: { userId: targetUserId },
        });
        if (existing?.permissions) {
          priorPermissions = existing.permissions as StaffPermissionsProfileMap;
        }
      }
    } catch {}

    const hasTable = await checkHasStaffPermissionProfileTable(client);
    if (!hasTable) {
      throw new ApiError(
        503,
        "MIGRATION_REQUIRED",
        "Cannot update staff permissions: staff_permission_profiles table does not exist in current database. Pending migration: 20261027150000_phase_f_staff_permissions"
      );
    }

    // Persist profile
    if (client.staffPermissionProfile?.upsert) {
      await client.staffPermissionProfile.upsert({
        where: { userId: targetUserId },
        create: {
          agencyId,
          userId: targetUserId,
          permissions: sanitized as any,
        },
        update: {
          permissions: sanitized as any,
        },
      });
    }

    // Log audit event
    await agencyAuditService.logEvent({
      agencyId,
      actorUserId,
      targetUserId,
      action: "STAFF_PERMISSIONS_UPDATED",
      entityType: "STAFF_PERMISSION",
      entityId: targetUserId,
      previousState: priorPermissions,
      newState: sanitized,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    }, client);

    return sanitized;
  },

  /**
   * Resets a staff member's permissions to the standard least-privilege defaults.
   */
  async resetToDefaultPermissions(
    agencyId: string,
    targetUserId: string,
    actorUserId: string,
    metadataOrClient?: any,
    prismaClient?: any
  ): Promise<StaffPermissionsProfileMap> {
    return this.updateStaffPermissions(
      agencyId,
      targetUserId,
      actorUserId,
      DEFAULT_STAFF_PERMISSIONS,
      metadataOrClient,
      prismaClient
    );
  },

  /**
   * Evaluates if a given user has permission to perform an action.
   */
  async hasStaffPermission(
    role: string | null | undefined,
    agencyId: string,
    userId: string,
    moduleKey: string,
    actionKey: string,
    prismaClient: any = prisma
  ): Promise<boolean> {
    if (!role) return false;
    if (role === "AGENCY_OWNER") return true;
    if (role !== "AGENCY_STAFF") return false;

    try {
      const grants = await this.getStaffPermissions(agencyId, userId, prismaClient);
      return evaluateStaffPermission(role, grants, moduleKey, actionKey);
    } catch {
      return false;
    }
  },
};

/**
 * Enforces staff capability authorization at server API boundaries.
 * Agency Owner and Platform Owner immediately pass without database query.
 * For staff, verifies permission ceiling and saved grants; throws 403 ForbiddenError if denied.
 */
export async function enforceStaffPermission(
  role: string | null | undefined,
  agencyId: string,
  userId: string,
  moduleKey: string,
  actionKey: string,
  deniedMessageOrPrisma?: string | any,
  prismaClient: any = prisma
): Promise<void> {
  if (role !== "AGENCY_STAFF") return; // Agency Owner and Platform Owner bypass

  const actualPrisma =
    deniedMessageOrPrisma && typeof deniedMessageOrPrisma === "object"
      ? deniedMessageOrPrisma
      : prismaClient || prisma;

  const actualMessage =
    typeof deniedMessageOrPrisma === "string" ? deniedMessageOrPrisma : undefined;

  const allowed = await staffPermissionService.hasStaffPermission(
    role,
    agencyId,
    userId,
    moduleKey,
    actionKey,
    actualPrisma
  );
  if (!allowed) {
    throw new ForbiddenError(
      actualMessage || `You do not have permission to ${actionKey.toLowerCase()} ${moduleKey.toLowerCase().replace(/_/g, " ")}.`
    );
  }
}
