import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
  validateRouteParams,
  NotFoundError,
} from "@/lib/api";
import {
  tripActivityRouteParamsSchema,
  updateTripActivitySchema,
} from "@/lib/validation/trip-activity-schema";
import { tripActivityService } from "@/lib/services/trip-activity-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string; activityId: string }>;
}

/**
 * GET /api/trips/[id]/activities/[activityId]
 * Retrieves a single Trip-Activity assignment by ID.
 */
export async function GET(_request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id, activityId } = validateRouteParams(tripActivityRouteParamsSchema, await props.params);

    const tripActivity = await tripActivityService.getTripActivityById(context.agencyId, id, activityId);

    if (!tripActivity) {
      throw new NotFoundError("Trip activity assignment not found.");
    }

    return apiSuccess(tripActivity);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/trips/[id]/activities/[activityId]
 * Updates an existing Trip-Activity assignment.
 * Enforces workspace write permissions.
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, activityId } = validateRouteParams(tripActivityRouteParamsSchema, await props.params);
    const body = await validateJson(updateTripActivitySchema, request);

    const updated = await tripActivityService.updateTripActivity(
      context.agencyId,
      id,
      activityId,
      body
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/trips/[id]/activities/[activityId]
 * Deletes a Trip-Activity assignment from a trip.
 * Enforces workspace write permissions.
 */
export async function DELETE(_request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, activityId } = validateRouteParams(tripActivityRouteParamsSchema, await props.params);

    const deleted = await tripActivityService.deleteTripActivity(context.agencyId, id, activityId);

    return apiSuccess({ message: "Trip activity assignment deleted successfully.", tripActivity: deleted });
  } catch (error) {
    return handleApiError(error);
  }
}
