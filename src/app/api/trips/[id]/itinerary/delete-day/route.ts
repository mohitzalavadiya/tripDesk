import {
  apiSuccess,
  enforceStaffPermission,
  handleApiError,
  requireWriteAccess,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { itineraryService } from "@/lib/services/itinerary-service";
import { deleteDaySchema } from "@/lib/validation/itinerary-schema";
import { tripIdParamSchema } from "@/lib/validation/trip-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/trips/[id]/itinerary/delete-day
 * Deletes all itinerary items on a specified day and shifts subsequent days down by 1.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "DELETE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(deleteDaySchema, request);

    const result = await itineraryService.deleteDay(
      context.agencyId,
      id,
      body.dayNumber
    );

    return apiSuccess({
      message: `Day ${body.dayNumber} deleted and schedule resequenced.`,
      ...result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
