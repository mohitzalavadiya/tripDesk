import { NextRequest } from "next/server";
import { requireReadAccess, apiSuccess, handleApiError } from "@/lib/api";
import { operationsAnalyticsService } from "@/lib/services/operations-analytics-service";
import { analyticsFilterSchema } from "@/lib/validation/operations-schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/operations/analytics/guest-satisfaction
 * Returns post-tour ratings, execution scores, and quality distribution.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const { searchParams } = new URL(request.url);

    const rawFilters = {
      preset: searchParams.get("preset") || "LAST_30_DAYS",
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    };

    const filters = analyticsFilterSchema.parse(rawFilters);
    const dashboard = await operationsAnalyticsService.getOperationsAnalyticsDashboard(
      context.agencyId,
      filters
    );

    return apiSuccess({
      guestSatisfaction: dashboard.guestSatisfaction,
      overview: dashboard.overview.guestSatisfactionOverview,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
