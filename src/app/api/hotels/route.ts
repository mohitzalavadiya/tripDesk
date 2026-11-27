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
import { hotelService } from "@/lib/services/hotel-service";
import {
createHotelSchema,
hotelListQuerySchema,
} from "@/lib/validation/hotel-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/hotels
 * Retrieves paginated hotel master records strictly scoped to the authenticated agency.
 * Enforces workspace read access.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "HOTELS", "VIEW");
    const queryParams = validateQueryParams(hotelListQuerySchema, request.nextUrl.searchParams);

    const result = await hotelService.listHotels(context.agencyId, queryParams);

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
 * POST /api/hotels
 * Creates a new hotel master record under the authenticated agency.
 * Enforces workspace write access (requires valid TRIAL or ACTIVE subscription).
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "HOTELS", "CREATE");
    const body = await validateJson(createHotelSchema, request);

    const newHotel = await hotelService.createHotel(context.agencyId, body);

    return apiCreated(newHotel);
  } catch (error) {
    return handleApiError(error);
  }
}
