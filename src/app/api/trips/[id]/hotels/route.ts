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
import { createTripHotelSchema } from "@/lib/validation/trip-hotel-schema";
import { tripHotelService } from "@/lib/services/trip-hotel-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trips/[id]/hotels
 * Retrieves all hotel assignments for a specific trip, scoped to the authenticated agency.
 */
export async function GET(_request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);

    const hotels = await tripHotelService.listTripHotels(context.agencyId, id);

    return apiSuccess(hotels);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/trips/[id]/hotels
 * Adds a new hotel assignment to a trip.
 * Enforces workspace write permissions (requires active subscription).
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(createTripHotelSchema, request);

    const tripHotel = await tripHotelService.createTripHotel(context.agencyId, id, body);

    return apiCreated(tripHotel);
  } catch (error) {
    return handleApiError(error);
  }
}
