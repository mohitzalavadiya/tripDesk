import { ApiError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/api/errors";
import prisma from "@/lib/prisma";
import { revokeAuthUserSessionsAndBan, unbanAuthUser } from "@/lib/supabase/admin";
import "server-only";
import { agencyAuditService } from "./agency-audit-service";

export interface StaffLifecycleResult {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    deactivatedAt: Date | null;
    sessionRevokedAt: Date | null;
  };
  alreadyDeactivated?: boolean;
  alreadyActive?: boolean;
  authRevocationInvoked?: boolean;
}

const USER_LIFECYCLE_SELECT = {
  id: true,
  agencyId: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  deactivatedAt: true,
  sessionRevokedAt: true,
};

export const staffLifecycleService = {
  /**
   * Safely deactivates an AGENCY_STAFF member in the actor's agency.
   * Preserves all historical business records, audit logs, and StaffPermissionProfile.
   * Immediately revokes application sessions (via isActive=false + sessionRevokedAt)
   * and bans the Supabase Auth account to prevent logins and refresh-token renewals.
   */
  async deactivateStaffMember(
    agencyId: string,
    targetUserId: string,
    actorUserId: string,
    metadata?: { ipAddress?: string | null; userAgent?: string | null },
    deps?: {
      prismaClient?: any;
      revokeAuthFn?: (userId: string) => Promise<{ invoked: boolean }>;
    }
  ): Promise<StaffLifecycleResult> {
    const client = deps?.prismaClient || prisma;
    const revokeAuthFn = deps?.revokeAuthFn || revokeAuthUserSessionsAndBan;

    if (targetUserId === actorUserId) {
      throw new ValidationError("You cannot deactivate your own account.");
    }

    const actor = await client.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, agencyId: true, role: true, isActive: true },
    });

    if (!actor || actor.agencyId !== agencyId || actor.role !== "AGENCY_OWNER" || actor.isActive === false) {
      throw new ForbiddenError("Only an active Agency Owner can deactivate staff members.");
    }

    const target = await client.user.findUnique({
      where: { id: targetUserId },
      select: USER_LIFECYCLE_SELECT,
    });

    if (!target || target.agencyId !== agencyId) {
      throw new NotFoundError("Staff member");
    }

    if (target.role === "PLATFORM_OWNER") {
      throw new ForbiddenError("Platform administrator accounts cannot be targeted.");
    }

    if (target.role !== "AGENCY_STAFF") {
      throw new ForbiddenError("Only agency staff accounts can be deactivated.");
    }

    // Idempotency: if already deactivated, retry external Supabase revocation safely
    if (target.isActive === false) {
      let authRevocationInvoked = false;
      try {
        const res = await revokeAuthFn(targetUserId);
        authRevocationInvoked = res.invoked;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new ApiError(
          502,
          "AUTH_REVOCATION_FAILED",
          `Staff member is already inactive in the database, but external session revocation failed: ${msg}`
        );
      }

      return {
        user: {
          id: target.id,
          name: target.name,
          email: target.email,
          role: target.role,
          isActive: false,
          deactivatedAt: target.deactivatedAt,
          sessionRevokedAt: target.sessionRevokedAt,
        },
        alreadyDeactivated: true,
        authRevocationInvoked,
      };
    }

    const now = new Date();
    const txRunner = client.$transaction
      ? (fn: (tx: any) => Promise<any>) => client.$transaction(fn)
      : (fn: (tx: any) => Promise<any>) => fn(client);

    const updated = await txRunner(async (tx: any) => {
      const updatedUser = await tx.user.update({
        where: { id: targetUserId },
        data: {
          isActive: false,
          deactivatedAt: now,
          sessionRevokedAt: now,
          deactivatedById: actorUserId,
        },
        select: USER_LIFECYCLE_SELECT,
      });

      await agencyAuditService.logEvent(
        {
          agencyId,
          actorUserId,
          targetUserId,
          action: "STAFF_DEACTIVATED",
          entityType: "USER",
          entityId: targetUserId,
          previousState: {
            isActive: true,
            deactivatedAt: target.deactivatedAt,
          },
          newState: {
            isActive: false,
            deactivatedAt: now,
            sessionRevokedAt: now,
          },
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
        },
        tx
      );

      return updatedUser;
    });

    let authRevocationInvoked = false;
    try {
      const res = await revokeAuthFn(targetUserId);
      authRevocationInvoked = res.invoked;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ApiError(
        502,
        "AUTH_REVOCATION_FAILED",
        `Staff access was disabled in the database, but external session revocation failed. Please retry deactivation: ${msg}`
      );
    }

    return {
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
        deactivatedAt: updated.deactivatedAt,
        sessionRevokedAt: updated.sessionRevokedAt,
      },
      alreadyDeactivated: false,
      authRevocationInvoked,
    };
  },

  /**
   * Reactivates a previously deactivated AGENCY_STAFF member in the actor's agency.
   * Preserves sessionRevokedAt so old sessions remain invalid and require a fresh login.
   * Preserves existing StaffPermissionProfile without granting extra permissions.
   */
  async reactivateStaffMember(
    agencyId: string,
    targetUserId: string,
    actorUserId: string,
    metadata?: { ipAddress?: string | null; userAgent?: string | null },
    deps?: {
      prismaClient?: any;
      unbanAuthFn?: (userId: string) => Promise<{ invoked: boolean }>;
    }
  ): Promise<StaffLifecycleResult> {
    const client = deps?.prismaClient || prisma;
    const unbanAuthFn = deps?.unbanAuthFn || unbanAuthUser;

    if (targetUserId === actorUserId) {
      throw new ValidationError("You cannot reactivate your own account.");
    }

    const actor = await client.user.findUnique({
      where: { id: actorUserId },
      select: { id: true, agencyId: true, role: true, isActive: true },
    });

    if (!actor || actor.agencyId !== agencyId || actor.role !== "AGENCY_OWNER" || actor.isActive === false) {
      throw new ForbiddenError("Only an active Agency Owner can reactivate staff members.");
    }

    const target = await client.user.findUnique({
      where: { id: targetUserId },
      select: USER_LIFECYCLE_SELECT,
    });

    if (!target || target.agencyId !== agencyId) {
      throw new NotFoundError("Staff member");
    }

    if (target.role === "PLATFORM_OWNER") {
      throw new ForbiddenError("Platform administrator accounts cannot be targeted.");
    }

    if (target.role !== "AGENCY_STAFF") {
      throw new ForbiddenError("Only agency staff accounts can be reactivated.");
    }

    if (target.isActive !== false && !target.deactivatedAt) {
      return {
        user: {
          id: target.id,
          name: target.name,
          email: target.email,
          role: target.role,
          isActive: true,
          deactivatedAt: null,
          sessionRevokedAt: target.sessionRevokedAt,
        },
        alreadyActive: true,
      };
    }

    // Unban in Supabase Auth before marking active in DB so failure never leaves DB active while banned
    try {
      await unbanAuthFn(targetUserId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new ApiError(
        502,
        "AUTH_REACTIVATION_FAILED",
        `Failed to restore Supabase Auth login access. Staff account remains deactivated: ${msg}`
      );
    }

    const txRunner = client.$transaction
      ? (fn: (tx: any) => Promise<any>) => client.$transaction(fn)
      : (fn: (tx: any) => Promise<any>) => fn(client);

    const updated = await txRunner(async (tx: any) => {
      const updatedUser = await tx.user.update({
        where: { id: targetUserId },
        data: {
          isActive: true,
          deactivatedAt: null,
          deactivatedById: null,
          // Keep sessionRevokedAt intact so previously revoked sessions stay invalid
        },
        select: USER_LIFECYCLE_SELECT,
      });

      await agencyAuditService.logEvent(
        {
          agencyId,
          actorUserId,
          targetUserId,
          action: "STAFF_REACTIVATED",
          entityType: "USER",
          entityId: targetUserId,
          previousState: {
            isActive: false,
            deactivatedAt: target.deactivatedAt,
          },
          newState: {
            isActive: true,
            deactivatedAt: null,
            sessionRevokedAt: updatedUser.sessionRevokedAt,
          },
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
        },
        tx
      );

      return updatedUser;
    });

    return {
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
        deactivatedAt: updated.deactivatedAt,
        sessionRevokedAt: updated.sessionRevokedAt,
      },
      alreadyActive: false,
    };
  },
};
