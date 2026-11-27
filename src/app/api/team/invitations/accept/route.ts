import { apiSuccess, handleApiError } from "@/lib/api";
import { invitationService } from "@/lib/services/invitation-service";
import { createClient } from "@/lib/supabase/server";
import { acceptInvitationSchema } from "@/lib/validation/invitation-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/team/invitations/accept
 * Public single-use acceptance endpoint for staff onboarding.
 * Enforces atomic single-use conditional updates, anti-replay guards, and cross-tenant protection.
 * If caller is already authenticated via Supabase Auth, links their verified Supabase UUID.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = acceptInvitationSchema.parse(body);

    let authenticatedUserId: string | undefined;
    let authenticatedEmail: string | undefined;

    try {
      const supabase = await createClient();
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();

      if (sessionUser) {
        authenticatedUserId = sessionUser.id;
        authenticatedEmail = sessionUser.email;
      }
    } catch {
      // Unauthenticated caller path: service-role or provisioning fallback
    }

    const result = await invitationService.acceptInvitation(validated.token, {
      ...validated,
      authenticatedUserId,
      authenticatedEmail,
    });

    return apiSuccess(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
