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
import { customerService } from "@/lib/services/customer-service";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import {
  createCustomerSchema,
  customerQuerySchema,
} from "@/lib/validation/customer-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/customers
 * Retrieves paginated customers strictly scoped to the authenticated agency.
 * Enforces workspace read access and staff CUSTOMERS.view permission.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireMemberReadAccess();

    if (context.isAgencyStaff) {
      const canView = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "CUSTOMERS",
        "VIEW"
      );
      if (!canView) {
        throw new ForbiddenError("You do not have permission to view customer records.");
      }
    }

    const queryParams = validateQueryParams(customerQuerySchema, request.nextUrl.searchParams);
    const result = await customerService.listCustomers(context.agencyId, queryParams);

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
 * POST /api/customers
 * Creates a new customer record under the authenticated agency.
 * Enforces workspace write access and staff CUSTOMERS.create permission.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireMemberWriteAccess();

    if (context.isAgencyStaff) {
      const canCreate = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "CUSTOMERS",
        "CREATE"
      );
      if (!canCreate) {
        throw new ForbiddenError("You do not have permission to create customer records.");
      }
    }

    const body = await validateJson(createCustomerSchema, request);
    const newCustomer = await customerService.createCustomer(context.agencyId, body);

    return apiCreated(newCustomer);
  } catch (error) {
    return handleApiError(error);
  }
}
