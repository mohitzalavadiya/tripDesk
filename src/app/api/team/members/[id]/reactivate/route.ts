import { apiSuccess, handleApiError, requireAgencyOwnerContext } from "@/lib/api";
import { staffLifecycleService } from "@/lib/services/staff-lifecycle-service";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/team/members/[id]/reactivate
 * Restores access for a previously deactivated AGENCY_STAFF member with their existing permissions.
 * Old revoked sessions remain invalid and require a fresh login.
 * Strictly Agency Owner only.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireAgencyOwnerContext();
    const { id: targetUserId } = await params;

    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip");
    const userAgent = request.headers.get("user-agent");

    const result = await staffLifecycleService.reactivateStaffMember(
      context.agencyId,
      targetUserId,
      context.dbUser.id,
      { ipAddress: clientIp, userAgent }
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
