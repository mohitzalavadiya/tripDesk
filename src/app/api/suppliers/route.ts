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
  createSupplierSchema,
  supplierQuerySchema,
} from "@/lib/validation/supplier-schema";
import { supplierService } from "@/lib/services/supplier-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/suppliers
 * Retrieves paginated suppliers strictly scoped to the authenticated agency.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const queryParams = validateQueryParams(supplierQuerySchema, request.nextUrl.searchParams);

    const result = await supplierService.listSuppliers(context.agencyId, queryParams);

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
 * POST /api/suppliers
 * Creates a new supplier record under the authenticated agency with sequential SUP-YYYY-XXXXX code.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(createSupplierSchema, request);

    const newSupplier = await supplierService.createSupplier(context.agencyId, body);

    return apiCreated(newSupplier);
  } catch (error) {
    return handleApiError(error);
  }
}
