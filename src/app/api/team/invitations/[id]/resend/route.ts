import { apiSuccess, handleApiError } from "@/lib/api";
import { enforceStaffPermission } from "@/lib/services/staff-permission-service";
import { requireWriteAccess } from "@/lib/api/context";
import { invitationService } from "@/lib/services/invitation-service";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/team/invitations/[id]/resend
 * Resends a staff invitation with a fresh cryptographic token.
 * Requires Agency Owner privileges and active subscription write access.
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await requireWriteAccess();
    if (authContext.dbUser.role !== "AGENCY_OWNER") {
      await enforceStaffPermission(authContext.dbUser.role, authContext.agencyId, authContext.dbUser.id, "TEAM", "UPDATE", "Only authorized users can resend invitations.");
    }
    const { id } = await context.params;

    const result = await invitationService.resendInvitation(
      {
        userId: authContext.dbUser.id,
        role: authContext.dbUser.role,
        agencyId: authContext.agencyId,
      },
      id
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
