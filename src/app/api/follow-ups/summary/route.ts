import { NextRequest } from "next/server";
import {
  requireReadAccess,
  apiSuccess,
  handleApiError,
} from "@/lib/api";
import { followUpService } from "@/lib/services/follow-up-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/follow-ups/summary
 * Telemetry summary counts for overdue, today, upcoming, completed follow-ups.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const summary = await followUpService.getFollowUpSummary(context.agencyId);

    return apiSuccess(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
