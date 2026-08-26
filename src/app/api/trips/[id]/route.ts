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
  updateTripSchema,
  tripIdParamSchema,
} from "@/lib/validation/trip-schema";
import { tripService } from "@/lib/services/trip-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trips/[id]
 * Retrieves a single trip record by ID with related Customer, Travelers, and Itinerary items.
 * Returns 404 if not found or belongs to another agency.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);

    const trip = await tripService.getTripById(context.agencyId, id);

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    return apiSuccess(trip);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/trips/[id]
 * Updates an existing trip record under the authenticated agency.
 * Enforces write permissions (TRIAL / ACTIVE subscription required).
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(updateTripSchema, request);

    const updatedTrip = await tripService.updateTrip(context.agencyId, id, body);

    return apiSuccess(updatedTrip);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/trips/[id]
 * Soft-deletes (archives) a trip record by setting archivedAt.
 * Preserves historical references for quotations, bookings, and operations.
 */
export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);

    const archivedTrip = await tripService.archiveTrip(context.agencyId, id);

    return apiSuccess({
      message: "Trip archived successfully.",
      trip: archivedTrip,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
