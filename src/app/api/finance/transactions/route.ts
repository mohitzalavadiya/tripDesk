import {
apiSuccess,
handleApiError,
requireReadAccess,
validateQueryParams,
} from "@/lib/api";
import { financeService } from "@/lib/services/finance-service";
import { transactionQuerySchema } from "@/lib/validation/finance-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/finance/transactions
 * Returns unified paginated financial transaction ledger.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const query = validateQueryParams(transactionQuerySchema, request.nextUrl.searchParams);

    const result = await financeService.getTransactions(context.agencyId, query);

    return apiSuccess(result.data, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}
