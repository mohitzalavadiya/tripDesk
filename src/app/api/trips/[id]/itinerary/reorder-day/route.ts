import {
  enforceStaffPermission,
apiSuccess,
handleApiError,
requireWriteAccess,
validateJson,
validateRouteParams,
} from "@/lib/api";
import { itineraryService } from "@/lib/services/itinerary-service";
import { reorderDaySchema } from "@/lib/validation/itinerary-schema";
import { tripIdParamSchema } from "@/lib/validation/trip-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/trips/[id]/itinerary/reorder-day
 * Moves an entire day group UP or DOWN.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "UPDATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(reorderDaySchema, request);

    await itineraryService.reorderDay(
      context.agencyId,
      id,
      body.sourceDayNumber,
      body.targetDayNumber !== undefined ? body.targetDayNumber : body.direction!
    );

    return apiSuccess({
      message:
        body.targetDayNumber !== undefined
          ? `Day ${body.sourceDayNumber} moved to Day ${body.targetDayNumber} successfully.`
          : `Day ${body.sourceDayNumber} moved ${body.direction?.toLowerCase()} successfully.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
