import {
apiCreated,
apiSuccess,
handleApiError,
requireReadAccess,
requireWriteAccess,
validateJson,
validateRouteParams,
} from "@/lib/api";
import { tripVehicleService } from "@/lib/services/trip-vehicle-service";
import { tripIdParamSchema } from "@/lib/validation/trip-schema";
import { createTripVehicleSchema } from "@/lib/validation/trip-vehicle-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trips/[id]/vehicles
 * Retrieves all vehicle assignments for a specific trip, scoped to the authenticated agency.
 */
export async function GET(_request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);

    const vehicles = await tripVehicleService.listTripVehicles(context.agencyId, id);

    return apiSuccess(vehicles);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/trips/[id]/vehicles
 * Adds a new vehicle assignment to a trip.
 * Enforces workspace write permissions (requires active subscription).
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(createTripVehicleSchema, request);

    const tripVehicle = await tripVehicleService.createTripVehicle(context.agencyId, id, body);

    return apiCreated(tripVehicle);
  } catch (error) {
    return handleApiError(error);
  }
}
