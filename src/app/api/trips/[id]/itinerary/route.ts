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
import {
  createItineraryItemSchema,
} from "@/lib/validation/itinerary-schema";
import { itineraryService } from "@/lib/services/itinerary-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trips/[id]/itinerary
 * Retrieves all itinerary items for a trip, scoped to the authenticated agency.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);

    const items = await itineraryService.listItineraryItems(context.agencyId, id);

    return apiSuccess(items);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/trips/[id]/itinerary
 * Adds a new itinerary item to a trip under the authenticated agency.
 * Enforces workspace write permissions.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(createItineraryItemSchema, request);

    const item = await itineraryService.createItineraryItem(context.agencyId, id, body);

    return apiCreated(item);
  } catch (error) {
    return handleApiError(error);
  }
}
