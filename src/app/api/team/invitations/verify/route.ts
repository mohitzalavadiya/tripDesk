import { apiSuccess, handleApiError } from "@/lib/api";
import { invitationService } from "@/lib/services/invitation-service";
import { verifyInvitationSchema } from "@/lib/validation/invitation-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/team/invitations/verify
 * Public verification endpoint for staff invitation tokens.
 * Returns safe validity status, agency display name, and invited email without leaking secrets.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = verifyInvitationSchema.parse(body);

    const verification = await invitationService.verifyInvitationToken(validated.token);

    return apiSuccess(verification);
  } catch (error) {
    return handleApiError(error);
  }
}
