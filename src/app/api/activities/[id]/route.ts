import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
  NotFoundError,
} from "@/lib/api";
import { updateActivitySchema } from "@/lib/validation/activity-schema";
import { activityService } from "@/lib/services/activity-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/activities/[id]
 * Retrieves a single activity master record by ID.
 * Strictly enforces agency tenancy.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const activity = await activityService.getActivityById(context.agencyId, id);

    if (!activity) {
      throw new NotFoundError("Activity not found or does not belong to your agency.");
    }

    return apiSuccess(activity);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/activities/[id]
 * Updates an existing activity master record.
 * Enforces workspace write access.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(updateActivitySchema, request);

    const updatedActivity = await activityService.updateActivity(context.agencyId, id, body);

    return apiSuccess(updatedActivity);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/activities/[id]
 * Soft-deletes (archives) an existing activity master record.
 * Enforces workspace write access.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;

    const archivedActivity = await activityService.archiveActivity(context.agencyId, id);

    return apiSuccess({ message: "Activity archived successfully.", activity: archivedActivity });
  } catch (error) {
    return handleApiError(error);
  }
}
