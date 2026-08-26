import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  apiCreated,
  handleApiError,
  validateJson,
  validateQueryParams,
} from "@/lib/api";
import {
  createActivitySchema,
  activityListQuerySchema,
} from "@/lib/validation/activity-schema";
import { activityService } from "@/lib/services/activity-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/activities
 * Retrieves paginated activity master records strictly scoped to the authenticated agency.
 * Enforces workspace read access.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const queryParams = validateQueryParams(activityListQuerySchema, request.nextUrl.searchParams);

    const result = await activityService.listActivities(context.agencyId, queryParams);

    return apiSuccess(result.items, 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/activities
 * Creates a new activity master record under the authenticated agency.
 * Enforces workspace write access (requires valid TRIAL or ACTIVE subscription).
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(createActivitySchema, request);

    const newActivity = await activityService.createActivity(context.agencyId, body);

    return apiCreated(newActivity);
  } catch (error) {
    return handleApiError(error);
  }
}
