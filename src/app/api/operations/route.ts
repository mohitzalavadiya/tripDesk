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
  createTripOperationSchema,
  tripOperationQuerySchema,
} from "@/lib/validation/operations-schema";
import { operationsService } from "@/lib/services/operations-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/operations
 * Lists operations for the authenticated agency with pagination and filters.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const queryParams = validateQueryParams(
      tripOperationQuerySchema,
      request.nextUrl.searchParams
    );

    const result = await operationsService.listOperations(
      context.agencyId,
      queryParams
    );

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
 * POST /api/operations
 * Initializes a new operation for a trip under the authenticated agency.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(createTripOperationSchema, request);

    const newOp = await operationsService.createOperation(
      context.agencyId,
      body,
      context.dbUser.id
    );

    return apiCreated(newOp);
  } catch (error) {
    return handleApiError(error);
  }
}
