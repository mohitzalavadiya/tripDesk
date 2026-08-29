import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  apiCreated,
  handleApiError,
  validateJson,
  validateQueryParams,
} from "@/lib/api";
import {
  createTripSchema,
  tripQuerySchema,
} from "@/lib/validation/trip-schema";
import { tripService } from "@/lib/services/trip-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/trips
 * Retrieves paginated trips strictly scoped to the authenticated agency.
 * Enforces workspace read access.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const queryParams = validateQueryParams(tripQuerySchema, request.nextUrl.searchParams);

    const result = await tripService.listTrips(context.agencyId, queryParams);

    return apiSuccess(result.items, 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/trips
 * Creates a new trip record under the authenticated agency.
 * Enforces workspace write access (requires valid TRIAL or ACTIVE subscription).
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(createTripSchema, request);

    const newTrip = await tripService.createTrip(context.agencyId, body);

    return apiCreated(newTrip);
  } catch (error) {
    return handleApiError(error);
  }
}
