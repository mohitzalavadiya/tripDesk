import { NextRequest } from "next/server";
import {
  requireReadAccess,
  apiSuccess,
  handleApiError,
  validateQueryParams,
} from "@/lib/api";
import { checkDuplicateCustomerSchema } from "@/lib/validation/customer-schema";
import { customerService } from "@/lib/services/customer-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/customers/check-duplicate
 * Checks if a customer with the given phone or email already exists in the agency.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const query = validateQueryParams(checkDuplicateCustomerSchema, request.nextUrl.searchParams);

    const result = await customerService.checkDuplicateCustomer(context.agencyId, query);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
