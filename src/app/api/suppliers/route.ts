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
import { redactStaffFinancials } from "@/lib/auth/permissions";
import { supplierService } from "@/lib/services/supplier-service";
import {
createSupplierSchema,
supplierQuerySchema,
} from "@/lib/validation/supplier-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/suppliers
 * Retrieves paginated suppliers strictly scoped to the authenticated agency.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "SUPPLIERS", "VIEW");
    const queryParams = validateQueryParams(supplierQuerySchema, request.nextUrl.searchParams);

    const result = await supplierService.listSuppliers(context.agencyId, queryParams);

    const items = context.isAgencyStaff ? redactStaffFinancials(result.items, context.dbUser.role) : result.items;
    return apiSuccess(items, 200, {
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
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "SUPPLIERS", "CREATE");
    const body = await validateJson(createSupplierSchema, request);

    const newSupplier = await supplierService.createSupplier(context.agencyId, body);

    return apiCreated(newSupplier);
  } catch (error) {
    return handleApiError(error);
  }
}
