import {
  apiSuccess,
  enforceStaffPermission,
  handleApiError,
  requireReadAccess,
  requireWriteAccess,
  validateJson,
} from "@/lib/api";
import { StaffPermissionsProfileMap } from "@/lib/auth/permissions";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import { NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updatePermissionsSchema = z.object({
  permissions: z.record(
    z.string(),
    z.record(z.string(), z.boolean().optional())
  ),
});

/**
 * GET /api/team/members/[id]/permissions
 * Retrieve a staff member's effective permission profile.
 * Requires Agency Owner or delegated TEAM: VIEW access.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TEAM", "VIEW");
    const { id: targetUserId } = await params;

    const permissions = await staffPermissionService.getStaffPermissions(
      context.agencyId,
      targetUserId
    );

    return apiSuccess({ permissions });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/team/members/[id]/permissions
 * Updates a staff member's permissions with audit log tracking.
 * Requires Agency Owner or delegated TEAM: UPDATE access (self-modification always blocked).
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TEAM", "UPDATE");
    const { id: targetUserId } = await params;
    const body = await validateJson(updatePermissionsSchema, request);

    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    const updated = await staffPermissionService.updateStaffPermissions(
      context.agencyId,
      targetUserId,
      context.dbUser.id,
      body.permissions as StaffPermissionsProfileMap,
      { ipAddress: clientIp, userAgent }
    );

    return apiSuccess({ permissions: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/team/members/[id]/permissions
 * Resets a staff member's permissions to default.
 * Requires Agency Owner or delegated TEAM: UPDATE access (self-modification always blocked).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TEAM", "UPDATE");
    const { id: targetUserId } = await params;

    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    const reset = await staffPermissionService.resetToDefaultPermissions(
      context.agencyId,
      targetUserId,
      context.dbUser.id,
      { ipAddress: clientIp, userAgent }
    );

    return apiSuccess({ permissions: reset, message: "Permissions reset to standard defaults." });
  } catch (error) {
    return handleApiError(error);
  }
}
