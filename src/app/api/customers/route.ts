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
  createCustomerSchema,
  customerQuerySchema,
} from "@/lib/validation/customer-schema";
import { customerService } from "@/lib/services/customer-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/customers
 * Retrieves paginated customers strictly scoped to the authenticated agency.
 * Enforces workspace read access.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
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
 * Enforces workspace write access (requires valid TRIAL or ACTIVE subscription).
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(createCustomerSchema, request);

    const newCustomer = await customerService.createCustomer(context.agencyId, body);

    return apiCreated(newCustomer);
  } catch (error) {
    return handleApiError(error);
  }
}
