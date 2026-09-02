import { NextRequest } from "next/server";
import {
  requireReadAccess,
  apiSuccess,
  handleApiError,
  validateQueryParams,
} from "@/lib/api";
import { checkDuplicateSupplierSchema } from "@/lib/validation/supplier-schema";
import { supplierService } from "@/lib/services/supplier-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/suppliers/check-duplicate
 * Checks if a supplier with matching name, phone, or email already exists for this agency.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const queryParams = validateQueryParams(checkDuplicateSupplierSchema, request.nextUrl.searchParams);

    const result = await supplierService.checkDuplicateSupplier(context.agencyId, queryParams);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
