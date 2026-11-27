import {
  enforceStaffPermission,
apiSuccess,
handleApiError,
requireWriteAccess,
validateJson,
validateRouteParams,
} from "@/lib/api";
import { itineraryService } from "@/lib/services/itinerary-service";
import { duplicateDaySchema } from "@/lib/validation/itinerary-schema";
import { tripIdParamSchema } from "@/lib/validation/trip-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/trips/[id]/itinerary/duplicate-day
 * Duplicates a complete day schedule (ItineraryItems only).
 * Hard-rejects if resulting day count exceeds trip duration.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "CREATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(duplicateDaySchema, request);

    const duplicatedItems = await itineraryService.duplicateDay(
      context.agencyId,
      id,
      body.sourceDayNumber
    );

    return apiSuccess({
      message: `Day ${body.sourceDayNumber} duplicated successfully as Day ${body.sourceDayNumber + 1}.`,
      items: duplicatedItems,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
