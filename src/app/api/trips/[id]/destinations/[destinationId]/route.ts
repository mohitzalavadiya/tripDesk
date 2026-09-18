import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateRouteParams,
  NotFoundError,
} from "@/lib/api";
import { tripDestinationRouteParamsSchema } from "@/lib/validation/trip-destination-schema";
import { tripDestinationService } from "@/lib/services/trip-destination-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string; destinationId: string }>;
}

/**
 * GET /api/trips/[id]/destinations/[destinationId]
 * Retrieves a single TripDestination by ID.
 */
export async function GET(_request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id, destinationId } = validateRouteParams(
      tripDestinationRouteParamsSchema,
      await props.params
    );

    const tripDestination = await tripDestinationService.getTripDestinationById(
      context.agencyId,
      id,
      destinationId
    );

    if (!tripDestination) {
      throw new NotFoundError("Trip destination assignment not found.");
    }

    return apiSuccess(tripDestination);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/trips/[id]/destinations/[destinationId]
 * Deletes a TripDestination from a trip and resequences remaining items.
 * Enforces workspace write permissions.
 */
export async function DELETE(_request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, destinationId } = validateRouteParams(
      tripDestinationRouteParamsSchema,
      await props.params
    );

    const deleted = await tripDestinationService.removeTripDestination(
      context.agencyId,
      id,
      destinationId
    );

    return apiSuccess({
      message: "Trip destination removed successfully.",
      tripDestination: deleted,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
