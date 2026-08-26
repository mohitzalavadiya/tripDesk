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
  createTravelerSchema,
} from "@/lib/validation/traveler-schema";
import { travelerService } from "@/lib/services/traveler-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trips/[id]/travelers
 * Retrieves all travelers for a trip, scoped to the authenticated agency.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);

    const travelers = await travelerService.listTravelers(context.agencyId, id);

    return apiSuccess(travelers);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/trips/[id]/travelers
 * Adds a new traveler to a trip under the authenticated agency.
 * Enforces workspace write permissions.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(createTravelerSchema, request);

    const traveler = await travelerService.createTraveler(context.agencyId, id, body);

    return apiCreated(traveler);
  } catch (error) {
    return handleApiError(error);
  }
}
