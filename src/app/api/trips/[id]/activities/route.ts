import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  apiCreated,
  handleApiError,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { tripIdParamSchema } from "@/lib/validation/trip-schema";
import { createTripActivitySchema } from "@/lib/validation/trip-activity-schema";
import { tripActivityService } from "@/lib/services/trip-activity-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trips/[id]/activities
 * Retrieves all activity assignments for a specific trip, scoped to the authenticated agency.
 */
export async function GET(_request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);

    const activities = await tripActivityService.listTripActivities(context.agencyId, id);

    return apiSuccess(activities);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/trips/[id]/activities
 * Adds a new activity assignment to a trip.
 * Enforces workspace write permissions (requires active subscription).
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(createTripActivitySchema, request);

    const tripActivity = await tripActivityService.createTripActivity(context.agencyId, id, body);

    return apiCreated(tripActivity);
  } catch (error) {
    return handleApiError(error);
  }
}
