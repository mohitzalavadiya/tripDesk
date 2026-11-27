import {
apiCreated,
apiSuccess,
handleApiError,
requireReadAccess,
requireWriteAccess,
  enforceStaffPermission,
validateJson,
validateQueryParams,
} from "@/lib/api";
import { destinationService } from "@/lib/services/destination-service";
import {
createDestinationSchema,
destinationListQuerySchema,
} from "@/lib/validation/destination-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/destinations
 * Retrieves paginated destination master records strictly scoped to the authenticated agency.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "DESTINATIONS", "VIEW");
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
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "DESTINATIONS", "CREATE");
    const body = await validateJson(createDestinationSchema, request);

    const newDestination = await destinationService.createDestination(context.agencyId, body);

    return apiCreated(newDestination);
  } catch (error) {
    return handleApiError(error);
  }
}
