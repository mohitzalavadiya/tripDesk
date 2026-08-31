import { NextRequest } from "next/server";
import {
  requireReadAccess,
  apiSuccess,
  handleApiError,
  validateQueryParams,
} from "@/lib/api";
import { financeFilterSchema } from "@/lib/validation/finance-schema";
import { financeService } from "@/lib/services/finance-service";

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
