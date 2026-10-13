import {
apiSuccess,
handleApiError,
requireReadAccess,
validateQueryParams,
} from "@/lib/api";
import { financeService } from "@/lib/services/finance-service";
import { financeFilterSchema } from "@/lib/validation/finance-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/finance/summary
 * Returns executive finance KPIs, profitability, and outstanding balances.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const query = validateQueryParams(financeFilterSchema, request.nextUrl.searchParams);

    const summary = await financeService.getFinanceDashboard(context.agencyId, query);

    return apiSuccess(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
