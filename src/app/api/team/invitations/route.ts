import { apiSuccess, handleApiError } from "@/lib/api";
import { enforceStaffPermission } from "@/lib/services/staff-permission-service";
import { requireWriteAccess } from "@/lib/api/context";
import { invitationService } from "@/lib/services/invitation-service";
import { createInvitationSchema } from "@/lib/validation/invitation-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/team/invitations
 * Creates a staff invitation for the authenticated agency.
 * Requires Agency Owner privileges and active subscription write access.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    if (context.dbUser.role !== "AGENCY_OWNER") {
      await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TEAM", "CREATE", "Only authorized users can invite new team members.");
    }
    const body = await request.json();

    const validated = createInvitationSchema.parse(body);

    const result = await invitationService.createInvitation(
      {
        userId: context.dbUser.id,
        role: context.dbUser.role,
        agencyId: context.agencyId,
      },
      validated
    );

    return apiSuccess(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
