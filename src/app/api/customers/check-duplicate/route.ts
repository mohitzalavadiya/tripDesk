import {
apiSuccess,
handleApiError,
requireReadAccess,
validateQueryParams,
} from "@/lib/api";
import { customerService } from "@/lib/services/customer-service";
import { checkDuplicateCustomerSchema } from "@/lib/validation/customer-schema";
import { NextRequest } from "next/server";

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
