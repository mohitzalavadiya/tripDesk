import {
apiSuccess,
handleApiError,
requireReadAccess,
  enforceStaffPermission,
validateQueryParams,
} from "@/lib/api";
import { followUpService } from "@/lib/services/follow-up-service";
import { followUpSummaryQuerySchema } from "@/lib/validation/follow-up-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/follow-ups/summary
 * Telemetry summary counts for overdue, today, upcoming, completed follow-ups.
 * Supports active filters across the full authorized dataset.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "FOLLOW_UPS", "VIEW");
    const queryParams = validateQueryParams(followUpSummaryQuerySchema, request.nextUrl.searchParams);
    const summary = await followUpService.getFollowUpSummary(context.agencyId, queryParams);

    return apiSuccess(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
