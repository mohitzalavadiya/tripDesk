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
  createDestinationSchema,
  destinationListQuerySchema,
} from "@/lib/validation/destination-schema";
import { destinationService } from "@/lib/services/destination-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/destinations
 * Retrieves paginated destination master records strictly scoped to the authenticated agency.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const queryParams = validateQueryParams(destinationListQuerySchema, request.nextUrl.searchParams);

    const result = await destinationService.listDestinations(context.agencyId, queryParams);

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
 * POST /api/destinations
 * Creates a new destination master record under the authenticated agency.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(createDestinationSchema, request);

    const newDestination = await destinationService.createDestination(context.agencyId, body);

    return apiCreated(newDestination);
  } catch (error) {
    return handleApiError(error);
  }
}
