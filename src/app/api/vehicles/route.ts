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
  createVehicleSchema,
  vehicleListQuerySchema,
} from "@/lib/validation/vehicle-schema";
import { vehicleService } from "@/lib/services/vehicle-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/vehicles
 * Retrieves paginated vehicle master records strictly scoped to the authenticated agency.
 * Enforces workspace read access.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const queryParams = validateQueryParams(vehicleListQuerySchema, request.nextUrl.searchParams);

    const result = await vehicleService.listVehicles(context.agencyId, queryParams);

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
 * POST /api/vehicles
 * Creates a new vehicle master record under the authenticated agency.
 * Enforces workspace write access (requires valid TRIAL or ACTIVE subscription).
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(createVehicleSchema, request);

    const newVehicle = await vehicleService.createVehicle(context.agencyId, body);

    return apiCreated(newVehicle);
  } catch (error) {
    return handleApiError(error);
  }
}
