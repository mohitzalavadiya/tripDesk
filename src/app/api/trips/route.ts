import {
  apiCreated,
  apiSuccess,
  ForbiddenError,
  handleApiError,
  requireMemberReadAccess,
  requireMemberWriteAccess,
  validateJson,
  validateQueryParams,
} from "@/lib/api";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import { tripService } from "@/lib/services/trip-service";
import {
  createTripSchema,
  tripQuerySchema,
} from "@/lib/validation/trip-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/trips
 * Retrieves paginated trips strictly scoped to the authenticated agency.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireMemberReadAccess();

    if (context.isAgencyStaff) {
      const canView = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "TRIPS",
        "VIEW"
      );
      if (!canView) {
        throw new ForbiddenError("You do not have permission to view trips.");
      }
    }

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
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireMemberWriteAccess();

    if (context.isAgencyStaff) {
      const canCreate = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "TRIPS",
        "CREATE"
      );
      if (!canCreate) {
        throw new ForbiddenError("You do not have permission to create trips.");
      }
    }

    const body = await validateJson(createTripSchema, request);
    const newTrip = await tripService.createTrip(context.agencyId, body);

    return apiCreated(newTrip);
  } catch (error) {
    return handleApiError(error);
  }
}
