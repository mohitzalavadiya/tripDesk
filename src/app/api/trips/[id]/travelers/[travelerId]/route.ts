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
  updateTravelerSchema,
  travelerRouteParamsSchema,
} from "@/lib/validation/traveler-schema";
import { travelerService } from "@/lib/services/traveler-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string; travelerId: string }>;
}

/**
 * GET /api/trips/[id]/travelers/[travelerId]
 * Retrieves a single traveler record by ID.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id, travelerId } = validateRouteParams(
      travelerRouteParamsSchema,
      await props.params
    );

    const traveler = await travelerService.getTravelerById(context.agencyId, id, travelerId);

    if (!traveler) {
      throw new NotFoundError("Traveler");
    }

    return apiSuccess(traveler);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/trips/[id]/travelers/[travelerId]
 * Updates an existing traveler record under a trip.
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, travelerId } = validateRouteParams(
      travelerRouteParamsSchema,
      await props.params
    );
    const body = await validateJson(updateTravelerSchema, request);

    const updatedTraveler = await travelerService.updateTraveler(
      context.agencyId,
      id,
      travelerId,
      body
    );

    return apiSuccess(updatedTraveler);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/trips/[id]/travelers/[travelerId]
 * Removes a traveler record from a trip.
 */
export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, travelerId } = validateRouteParams(
      travelerRouteParamsSchema,
      await props.params
    );

    const deletedTraveler = await travelerService.deleteTraveler(
      context.agencyId,
      id,
      travelerId
    );

    return apiSuccess({
      message: "Traveler removed successfully.",
      traveler: deletedTraveler,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
