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
import { addTripDestinationSchema } from "@/lib/validation/trip-destination-schema";
import { tripDestinationService } from "@/lib/services/trip-destination-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trips/[id]/destinations
 * Retrieves all destination legs for a specific trip, ordered by sequence ascending.
 */
export async function GET(_request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);

    const destinations = await tripDestinationService.listTripDestinations(
      context.agencyId,
      id
    );

    return apiSuccess(destinations);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/trips/[id]/destinations
 * Adds a destination to a trip with next sequence.
 * Enforces workspace write permissions.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(addTripDestinationSchema, request);

    const tripDestination = await tripDestinationService.addTripDestination(
      context.agencyId,
      id,
      body
    );

    return apiCreated(tripDestination);
  } catch (error) {
    return handleApiError(error);
  }
}
