import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { tripIdParamSchema } from "@/lib/validation/trip-schema";
import { reorderTripDestinationsSchema } from "@/lib/validation/trip-destination-schema";
import { tripDestinationService } from "@/lib/services/trip-destination-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/trips/[id]/destinations/reorder
 * Reorders all destination legs for a specific trip.
 * Enforces workspace write permissions.
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(reorderTripDestinationsSchema, request);

    const reordered = await tripDestinationService.reorderTripDestinations(
      context.agencyId,
      id,
      body
    );

    return apiSuccess(reordered);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/trips/[id]/destinations/reorder
 * Fallback POST handler for reordering destinations.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  return PATCH(request, props);
}
