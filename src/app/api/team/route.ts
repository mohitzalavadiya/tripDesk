import { apiSuccess, handleApiError, requireReadAccess } from "@/lib/api";
import { enforceStaffPermission } from "@/lib/services/staff-permission-service";
import { invitationService } from "@/lib/services/invitation-service";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/team
 * Lists active agency team members and pending/historical invitations.
 * Enforces Agency Owner authorization or delegated staff TEAM: VIEW capability.
 */
export async function GET(_request: NextRequest) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TEAM", "VIEW");
    const agencyId = context.agencyId;

    const [members, invitations] = await Promise.all([
      invitationService.listAgencyMembers(agencyId),
      invitationService.listAgencyInvitations(agencyId),
    ]);

    return apiSuccess({
      members,
      invitations,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
