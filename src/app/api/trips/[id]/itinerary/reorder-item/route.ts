import {
  enforceStaffPermission,
apiSuccess,
handleApiError,
requireWriteAccess,
validateJson,
validateRouteParams,
} from "@/lib/api";
import { itineraryService } from "@/lib/services/itinerary-service";
import { reorderItemSchema } from "@/lib/validation/itinerary-schema";
import { tripIdParamSchema } from "@/lib/validation/trip-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/trips/[id]/itinerary/reorder-item
 * Moves an itinerary item UP or DOWN within its day.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "UPDATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(reorderItemSchema, request);

    await itineraryService.reorderItem(context.agencyId, id, body.itemId, {
      direction: body.direction,
      targetIndex: body.targetIndex,
      targetDayNumber: body.targetDayNumber,
    });

    return apiSuccess({
      message: "Itinerary item reordered successfully.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
