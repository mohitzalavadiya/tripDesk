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
  tripVehicleRouteParamsSchema,
  updateTripVehicleSchema,
} from "@/lib/validation/trip-vehicle-schema";
import { tripVehicleService } from "@/lib/services/trip-vehicle-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string; vehicleId: string }>;
}

/**
 * GET /api/trips/[id]/vehicles/[vehicleId]
 * Retrieves a single Trip-Vehicle assignment by ID.
 */
export async function GET(_request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id, vehicleId } = validateRouteParams(tripVehicleRouteParamsSchema, await props.params);

    const tripVehicle = await tripVehicleService.getTripVehicleById(context.agencyId, id, vehicleId);

    if (!tripVehicle) {
      throw new NotFoundError("Trip vehicle assignment not found.");
    }

    return apiSuccess(tripVehicle);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/trips/[id]/vehicles/[vehicleId]
 * Updates an existing Trip-Vehicle assignment.
 * Enforces workspace write permissions.
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, vehicleId } = validateRouteParams(tripVehicleRouteParamsSchema, await props.params);
    const body = await validateJson(updateTripVehicleSchema, request);

    const updated = await tripVehicleService.updateTripVehicle(
      context.agencyId,
      id,
      vehicleId,
      body
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/trips/[id]/vehicles/[vehicleId]
 * Deletes a Trip-Vehicle assignment from a trip.
 * Enforces workspace write permissions.
 */
export async function DELETE(_request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, vehicleId } = validateRouteParams(tripVehicleRouteParamsSchema, await props.params);

    const deleted = await tripVehicleService.deleteTripVehicle(context.agencyId, id, vehicleId);

    return apiSuccess({ message: "Trip vehicle assignment deleted successfully.", tripVehicle: deleted });
  } catch (error) {
    return handleApiError(error);
  }
}
