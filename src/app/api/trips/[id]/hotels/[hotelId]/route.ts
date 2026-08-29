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
  tripHotelRouteParamsSchema,
  updateTripHotelSchema,
} from "@/lib/validation/trip-hotel-schema";
import { tripHotelService } from "@/lib/services/trip-hotel-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string; hotelId: string }>;
}

/**
 * GET /api/trips/[id]/hotels/[hotelId]
 * Retrieves a single Trip-Hotel assignment by ID.
 */
export async function GET(_request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id, hotelId } = validateRouteParams(tripHotelRouteParamsSchema, await props.params);

    const tripHotel = await tripHotelService.getTripHotelById(context.agencyId, id, hotelId);

    if (!tripHotel) {
      throw new NotFoundError("Trip hotel assignment not found.");
    }

    return apiSuccess(tripHotel);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/trips/[id]/hotels/[hotelId]
 * Updates an existing Trip-Hotel assignment.
 * Enforces workspace write permissions.
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, hotelId } = validateRouteParams(tripHotelRouteParamsSchema, await props.params);
    const body = await validateJson(updateTripHotelSchema, request);

    const updated = await tripHotelService.updateTripHotel(
      context.agencyId,
      id,
      hotelId,
      body
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/trips/[id]/hotels/[hotelId]
 * Deletes a Trip-Hotel assignment from a trip.
 * Enforces workspace write permissions.
 */
export async function DELETE(_request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, hotelId } = validateRouteParams(tripHotelRouteParamsSchema, await props.params);

    const deleted = await tripHotelService.deleteTripHotel(context.agencyId, id, hotelId);

    return apiSuccess({ message: "Trip hotel assignment deleted successfully.", tripHotel: deleted });
  } catch (error) {
    return handleApiError(error);
  }
}
