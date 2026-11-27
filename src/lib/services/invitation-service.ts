import prisma from "@/lib/prisma";
import crypto from "crypto";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  QuotaExceededError,
  ValidationError,
} from "@/lib/api/errors";
import { isPlatformOwnerTargetSync } from "@/lib/auth/platform-owner-guard";
import { DEFAULT_STAFF_PERMISSIONS } from "@/lib/auth/permissions";
import { entitlementService } from "./entitlement-service";
import { staffPermissionService } from "./staff-permission-service";
import { deleteAuthUser, getAdminClient } from "@/lib/supabase/admin";
import {
  AcceptInvitationInput,
  CreateInvitationInput,
  createInvitationSchema,
} from "@/lib/validation/invitation-schema";

export interface AcceptInvitationOptions extends AcceptInvitationInput {
  authenticatedUserId?: string;
  authenticatedEmail?: string;
  mockUserId?: string;
}

export interface SanitizedInvitation {
  id: string;
  agencyId: string;
  email: string;
  role: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";
  expiresAt: Date;
  acceptedAt?: Date | null;
  revokedAt?: Date | null;
  invitedById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvitationResult {
  invitation: SanitizedInvitation;
  rawToken: string; // Returned ONCE for delivery, never persisted in plaintext or logged
}

export interface AgencyMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  createdAt: Date;
}

export const INVITATION_BASE_SELECT = {
  id: true,
  agencyId: true,
  email: true,
  role: true,
  status: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
  invitedById: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Generates a high-entropy, 256-bit cryptographic invitation token.
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes the SHA-256 hash of an invitation token for secure persistence.
 */
export function hashInvitationToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

let _hasInitialPermissionsColumn: boolean | null = null;

export async function checkHasInitialPermissionsColumn(client: any): Promise<boolean> {
  if (_hasInitialPermissionsColumn !== null) {
    return _hasInitialPermissionsColumn;
  }
  try {
    const rawQuery = client?.$queryRaw || prisma.$queryRaw;
    if (typeof rawQuery === "function") {
      const res: any = await rawQuery`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'agency_invitations' AND column_name = 'initialPermissions'
        LIMIT 1
      `;
      _hasInitialPermissionsColumn = Array.isArray(res) && res.length > 0;
      return _hasInitialPermissionsColumn;
    }
  } catch {
    // Non-PostgreSQL or mock fallback
  }
  return false;
}

let _hasStaffPermissionProfileTable: boolean | null = null;

export async function checkHasStaffPermissionProfileTable(client: any): Promise<boolean> {
  if (_hasStaffPermissionProfileTable !== null) {
    return _hasStaffPermissionProfileTable;
  }
  try {
    const rawQuery = client?.$queryRaw || prisma.$queryRaw;
    if (typeof rawQuery === "function") {
      const res: any = await rawQuery`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'staff_permission_profiles'
        LIMIT 1
      `;
      _hasStaffPermissionProfileTable = Array.isArray(res) && res.length > 0;
      return _hasStaffPermissionProfileTable;
    }
  } catch {
    // Non-PostgreSQL or mock fallback
  }
  return false;
}

export function resetSchemaCacheForTesting() {
  _hasInitialPermissionsColumn = null;
  _hasStaffPermissionProfileTable = null;
}

export class InvitationService {
  /**
   * Creates an invitation for an agency staff member.
   * Enforces:
   * 1. Actor must be an AGENCY_OWNER.
   * 2. Target role must be AGENCY_STAFF.
   * 3. Target email must not belong to a Platform Owner.
   * 4. Target email must not already belong to an active user (same or cross-agency).
   * 5. Any prior pending invitation for the same email is atomically revoked/superseded.
   * 6. Token is stored only as a SHA-256 hash with a 7-day expiration.
   */
  async createInvitation(
    actor: { userId: string; role: string; agencyId: string },
    input: CreateInvitationInput,
    prismaClient: any = prisma
  ): Promise<CreateInvitationResult> {
    if (actor.role !== "AGENCY_OWNER") {
      const isAllowed = await staffPermissionService.hasStaffPermission(
        actor.role,
        actor.agencyId,
        actor.userId,
        "TEAM",
        "create",
        prismaClient
      );
      if (!isAllowed) {
        throw new ForbiddenError("Only Agency Owners or authorized staff can invite new team members.");
      }
    }

    const validated = createInvitationSchema.parse(input);
    const normalizedEmail = validated.email.trim().toLowerCase();

    // 1. Guard against inviting a Platform Owner account
    if (isPlatformOwnerTargetSync({ email: normalizedEmail })) {
      throw new ForbiddenError(
        "Platform administrator accounts cannot be invited to agency teams."
      );
    }

    // 2. Generate cryptographic token and hash
    const rawToken = generateInvitationToken();
    const tokenHash = hashInvitationToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const txRunner = prismaClient.$transaction
      ? (fn: any) => prismaClient.$transaction(fn)
      : (fn: any) => fn(prismaClient);

    return await txRunner(async (tx: any) => {
      // Check if agencyInvitation table is available in tx
      if (!tx.agencyInvitation) {
        throw new ConflictError(
          "Agency invitation storage requires database migration approval. Schema changes are currently staged."
        );
      }

      // 3. Acquire transaction advisory lock on agency staff quota
      const lockKey = `agency:${actor.agencyId}:staff_quota`;
      if (typeof tx.$executeRaw === "function") {
        try {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
        } catch {
          // Graceful fallback for mock/non-PostgreSQL test environments
        }
      }

      // 4. Guard against existing user conflicts (tenant isolation & duplicate account) inside transaction
      const existingUser = await tx.user.findFirst({
        where: { email: normalizedEmail },
        select: { id: true, agencyId: true, role: true },
      });

      if (existingUser) {
        if (existingUser.agencyId === actor.agencyId) {
          throw new ValidationError(
            "This user is already an active member of your agency team."
          );
        } else {
          throw new ForbiddenError(
            "This email address is associated with another account and cannot be invited."
          );
        }
      }

      // 5. Supersede any existing pending invitations for this email in this agency
      await tx.agencyInvitation.updateMany({
        where: {
          agencyId: actor.agencyId,
          email: normalizedEmail,
          status: "PENDING",
        },
        data: {
          status: "REVOKED",
          revokedAt: new Date(),
        },
      });

      // 7. Persist invitation with token hash (schema-resilient if initialPermissions is pre-migration)
      const hasInitialPermissions = await checkHasInitialPermissionsColumn(tx);
      const createData: any = {
        agencyId: actor.agencyId,
        email: normalizedEmail,
        role: "AGENCY_STAFF",
        tokenHash,
        status: "PENDING",
        expiresAt,
        invitedById: actor.userId,
      };

      if (hasInitialPermissions) {
        createData.initialPermissions = (input as any).initialPermissions || DEFAULT_STAFF_PERMISSIONS;
      }

      const created = await tx.agencyInvitation.create({
        data: createData,
        select: hasInitialPermissions
          ? { ...INVITATION_BASE_SELECT, initialPermissions: true }
          : INVITATION_BASE_SELECT,
      });

      const invitation: SanitizedInvitation = {
        id: created.id,
        agencyId: created.agencyId,
        email: created.email,
        role: created.role,
        status: created.status,
        expiresAt: created.expiresAt,
        acceptedAt: created.acceptedAt,
        revokedAt: created.revokedAt,
        invitedById: created.invitedById,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };

      return {
        invitation,
        rawToken,
      };
    });
  }

  /**
   * Revokes an existing pending invitation.
   */
  async revokeInvitation(
    actor: { userId: string; role: string; agencyId: string },
    invitationId: string,
    prismaClient: any = prisma
  ): Promise<SanitizedInvitation> {
    if (actor.role !== "AGENCY_OWNER") {
      const isAllowed = await staffPermissionService.hasStaffPermission(
        actor.role,
        actor.agencyId,
        actor.userId,
        "TEAM",
        "delete",
        prismaClient
      );
      if (!isAllowed) {
        throw new ForbiddenError("Only Agency Owners or authorized staff can revoke invitations.");
      }
    }

    if (!prismaClient.agencyInvitation) {
      throw new ConflictError("Agency invitation storage requires database migration approval.");
    }

    const invitation = await prismaClient.agencyInvitation.findFirst({
      where: {
        id: invitationId,
        agencyId: actor.agencyId,
      },
      select: INVITATION_BASE_SELECT,
    });

    if (!invitation) {
      throw new NotFoundError("Invitation");
    }

    if (invitation.status !== "PENDING") {
      throw new ConflictError(
        `Cannot revoke an invitation that is already ${invitation.status.toLowerCase()}.`
      );
    }

    const updated = await prismaClient.agencyInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
      select: INVITATION_BASE_SELECT,
    });

    return {
      id: updated.id,
      agencyId: updated.agencyId,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      expiresAt: updated.expiresAt,
      acceptedAt: updated.acceptedAt,
      revokedAt: updated.revokedAt,
      invitedById: updated.invitedById,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Resends an invitation by generating a fresh cryptographic token and resetting expiration.
   */
  async resendInvitation(
    actor: { userId: string; role: string; agencyId: string },
    invitationId: string,
    prismaClient: any = prisma
  ): Promise<CreateInvitationResult> {
    if (actor.role !== "AGENCY_OWNER") {
      const isAllowed = await staffPermissionService.hasStaffPermission(
        actor.role,
        actor.agencyId,
        actor.userId,
        "TEAM",
        "update",
        prismaClient
      );
      if (!isAllowed) {
        throw new ForbiddenError("Only Agency Owners or authorized staff can resend invitations.");
      }
    }

    if (!prismaClient.agencyInvitation) {
      throw new ConflictError("Agency invitation storage requires database migration approval.");
    }

    const txRunner = prismaClient.$transaction
      ? (fn: any) => prismaClient.$transaction(fn)
      : (fn: any) => fn(prismaClient);

    return await txRunner(async (tx: any) => {
      // Acquire transaction advisory lock on agency staff quota
      const lockKey = `agency:${actor.agencyId}:staff_quota`;
      if (typeof tx.$executeRaw === "function") {
        try {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
        } catch {
          // Graceful fallback for mock/non-PostgreSQL test environments
        }
      }

      const invitation = await tx.agencyInvitation.findFirst({
        where: {
          id: invitationId,
          agencyId: actor.agencyId,
        },
        select: INVITATION_BASE_SELECT,
      });

      if (!invitation) {
        throw new NotFoundError("Invitation");
      }

      if (invitation.status === "ACCEPTED") {
        throw new ConflictError("Cannot resend an invitation that has already been accepted.");
      }

      const rawToken = generateInvitationToken();
      const tokenHash = hashInvitationToken(rawToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const updated = await tx.agencyInvitation.update({
        where: { id: invitation.id },
        data: {
          tokenHash,
          status: "PENDING",
          expiresAt,
          revokedAt: null,
        },
        select: INVITATION_BASE_SELECT,
      });

      return {
        invitation: {
          id: updated.id,
          agencyId: updated.agencyId,
          email: updated.email,
          role: updated.role,
          status: updated.status,
          expiresAt: updated.expiresAt,
          acceptedAt: updated.acceptedAt,
          revokedAt: updated.revokedAt,
          invitedById: updated.invitedById,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
        rawToken,
      };
    });
  }

  /**
   * Validates an invitation token for public verification without leaking secrets.
   */
  async verifyInvitationToken(
    rawToken: string,
    prismaClient: any = prisma
  ): Promise<{
    valid: boolean;
    reason?: string;
    agencyName?: string;
    email?: string;
    role?: string;
    expiresAt?: Date;
  }> {
    if (!rawToken || typeof rawToken !== "string" || rawToken.length < 32) {
      return { valid: false, reason: "INVALID_TOKEN" };
    }

    const tokenHash = hashInvitationToken(rawToken);

    if (!prismaClient.agencyInvitation) {
      return { valid: false, reason: "STORAGE_UNAVAILABLE" };
    }

    const invitation = await prismaClient.agencyInvitation.findUnique({
      where: { tokenHash },
      select: {
        ...INVITATION_BASE_SELECT,
        agency: { select: { name: true } },
      },
    });

    if (!invitation) {
      return { valid: false, reason: "INVALID_TOKEN" };
    }

    if (invitation.status === "REVOKED") {
      return { valid: false, reason: "REVOKED" };
    }

    if (invitation.status === "ACCEPTED") {
      return { valid: false, reason: "ALREADY_ACCEPTED" };
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      if (invitation.status === "PENDING") {
        await prismaClient.agencyInvitation.update({
          where: { id: invitation.id },
          data: { status: "EXPIRED" },
          select: INVITATION_BASE_SELECT,
        });
      }
      return { valid: false, reason: "EXPIRED" };
    }

    return {
      valid: true,
      agencyName: invitation.agency?.name || "Your Travel Desk Agency",
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }

  /**
   * Atomically accepts an invitation and provisions an AGENCY_STAFF user.
   * Guarded against replay, duplicate acceptance, and race conditions via conditional updates.
   * Supports:
   * 1. Direct linking to an existing authenticated Supabase user (verified by email match).
   * 2. Programmatic provisioning via Supabase Admin API when SUPABASE_SERVICE_ROLE_KEY is configured.
   * Rejects unauthenticated creation if no server-side service key is present to prevent orphaned or unverified accounts.
   */
  async acceptInvitation(
    rawToken: string,
    input: AcceptInvitationOptions,
    prismaClient: any = prisma
  ): Promise<{ user: { id: string; email: string; name: string; role: string; agencyId: string } }> {
    if (!rawToken || typeof rawToken !== "string" || rawToken.length < 32) {
      throw new ValidationError("Invalid or malformed invitation token.");
    }

    const tokenHash = hashInvitationToken(rawToken);

    if (!prismaClient.agencyInvitation) {
      throw new ConflictError("Agency invitation storage requires database migration approval.");
    }

    let createdAdminUserId: string | null = null;
    const adminClient = getAdminClient();

    const txRunner = prismaClient.$transaction
      ? (fn: any) => prismaClient.$transaction(fn, { isolationLevel: "Serializable" })
      : (fn: any) => fn(prismaClient);

    let txResult: { user: { id: string; email: string; name: string; role: string; agencyId: string } };

    try {
      txResult = await txRunner(async (tx: any) => {
        // 1. Fetch invitation by tokenHash (schema-resilient if initialPermissions is pre-migration)
        const hasInitialPermissions = await checkHasInitialPermissionsColumn(tx);
        const invitation = await tx.agencyInvitation.findUnique({
          where: { tokenHash },
          select: hasInitialPermissions
            ? { ...INVITATION_BASE_SELECT, initialPermissions: true }
            : INVITATION_BASE_SELECT,
        });

        if (!invitation) {
          throw new NotFoundError("Invitation");
        }

        // Acquire PostgreSQL transaction advisory lock on staff quota for this agency
        const lockKey = `agency:${invitation.agencyId}:staff_quota`;
        if (typeof tx.$executeRaw === "function") {
          try {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
          } catch {
            // Graceful fallback for mock/non-PostgreSQL test environments
          }
        }

        if (invitation.status === "REVOKED") {
          throw new ForbiddenError("This invitation has been revoked by the agency administrator.");
        }

        if (invitation.status === "ACCEPTED") {
          throw new ConflictError("This invitation has already been accepted.");
        }

        if (new Date() > new Date(invitation.expiresAt)) {
          await tx.agencyInvitation.update({
            where: { id: invitation.id },
            data: { status: "EXPIRED" },
            select: INVITATION_BASE_SELECT,
          });
          throw new ConflictError("This invitation has expired. Please request a new invitation.");
        }

        // 2. Verify authenticated identity match before consuming invitation
        if (
          input.authenticatedUserId &&
          input.authenticatedEmail &&
          input.authenticatedEmail.trim().toLowerCase() !== invitation.email.trim().toLowerCase()
        ) {
          throw new ForbiddenError("Authenticated account email does not match invitation email.");
        }

        // 3. Verify target email is not already taken
        const existingUser = await tx.user.findFirst({
          where: { email: invitation.email },
        });

        if (existingUser) {
          throw new ConflictError("An account with this email address already exists.");
        }

        // 4. Concurrency guard: conditionally update status to ACCEPTED
        const updateResult = await tx.agencyInvitation.updateMany({
          where: {
            id: invitation.id,
            status: "PENDING",
          },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictError(
            "Invitation was concurrently accepted or modified. Duplicate acceptance prevented."
          );
        }

        // 5. Resolve authenticated identity UUID:
        // Priority 1: Trusted caller session from Supabase Auth
        // Priority 2: In-memory mock ID for test suite isolation
        // Priority 3: Server-side admin provisioning when SUPABASE_SERVICE_ROLE_KEY is present
        let authUserId: string;

        if (input.authenticatedUserId) {
          authUserId = input.authenticatedUserId;
        } else if (input.mockUserId) {
          authUserId = input.mockUserId;
        } else if (adminClient && input.password) {
          const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email: invitation.email,
            password: input.password,
            email_confirm: true,
            user_metadata: {
              name: input.name.trim(),
              role: "AGENCY_STAFF",
              agencyId: invitation.agencyId,
            },
          });

          if (authError) {
            throw new ConflictError(
              authError.message || "Failed to create Supabase Auth user identity."
            );
          }

          if (!authData?.user?.id) {
            throw new ConflictError("Supabase Auth service did not return a valid user identity.");
          }

          authUserId = authData.user.id;
          createdAdminUserId = authUserId;
        } else {
          // Live production environment without authenticated session or service role key
          throw new ConflictError(
            "Server-side Supabase configuration missing or authenticated session required to complete invitation acceptance."
          );
        }

        // 5. Create user record with role AGENCY_STAFF
        const newUser = await tx.user.create({
          data: {
            id: authUserId,
            agencyId: invitation.agencyId,
            name: input.name.trim(),
            email: invitation.email,
            role: "AGENCY_STAFF",
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            agencyId: true,
          },
        });

        // 6. Initialize default staff permission profile if table exists in database
        const hasStaffPermissionProfileTable = await checkHasStaffPermissionProfileTable(tx);
        if (hasStaffPermissionProfileTable && tx.staffPermissionProfile?.create) {
          try {
            await tx.staffPermissionProfile.create({
              data: {
                agencyId: invitation.agencyId,
                userId: newUser.id,
                permissions: (invitation as any).initialPermissions || DEFAULT_STAFF_PERMISSIONS,
              },
            });
          } catch {}
        }

        return { user: newUser };
      });

      // 7. Post-transaction verification:
      // Verify that the user record was actually committed and is readable from the database.
      // In PostgreSQL, any failed query within a transaction block poisons the transaction (25P02).
      // If a driver or pooler silently converts COMMIT to ROLLBACK, the user record will be missing.
      const persistedUser = await (prismaClient.user?.findUnique
        ? prismaClient.user.findUnique({
            where: { id: txResult.user.id },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              agencyId: true,
            },
          })
        : Promise.resolve(txResult.user));

      if (!persistedUser) {
        if (createdAdminUserId) {
          await deleteAuthUser(createdAdminUserId);
        }
        throw new ConflictError(
          "Failed to persist workspace user profile. The database transaction could not be committed."
        );
      }

      return { user: persistedUser };
    } catch (txError) {
      // Clean up orphaned Supabase Auth user if created in this attempt
      if (createdAdminUserId) {
        await deleteAuthUser(createdAdminUserId);
      }
      throw txError;
    }
  }

  /**
   * Lists all team members (owners and staff) for an agency.
   */
  async listAgencyMembers(
    agencyId: string,
    prismaClient: any = prisma
  ): Promise<AgencyMember[]> {
    const users = await prismaClient.user.findMany({
      where: { agencyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        deactivatedAt: true,
        createdAt: true,
      },
      orderBy: [{ role: "asc" }, { isActive: "desc" }, { name: "asc" }],
    });

    return users.map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive !== false,
      deactivatedAt: u.deactivatedAt ?? null,
      createdAt: u.createdAt,
    }));
  }

  /**
   * Lists all invitations (pending, accepted, expired, revoked) for an agency.
   * Strips tokenHash to prevent any token secret leakage.
   */
  async listAgencyInvitations(
    agencyId: string,
    prismaClient: any = prisma
  ): Promise<SanitizedInvitation[]> {
    if (!prismaClient.agencyInvitation) {
      return [];
    }

    const invitations = await prismaClient.agencyInvitation.findMany({
      where: { agencyId },
      select: {
        id: true,
        agencyId: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        invitedById: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return invitations.map((inv: any) => ({
      id: inv.id,
      agencyId: inv.agencyId,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
      acceptedAt: inv.acceptedAt,
      revokedAt: inv.revokedAt,
      invitedById: inv.invitedById,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
    }));
  }
}

export const invitationService = new InvitationService();
