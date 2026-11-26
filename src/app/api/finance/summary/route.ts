import {
  apiSuccess,
  handleApiError,
  requireReadAccess,
  enforceStaffPermission,
  validateQueryParams,
} from "@/lib/api";
import { ForbiddenError } from "@/lib/api/errors";
import { canAccessFinancialMargins, redactStaffFinancials } from "@/lib/auth/permissions";
import { financeService } from "@/lib/services/finance-service";
import { financeFilterSchema } from "@/lib/validation/finance-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/finance/summary
 * Returns executive finance KPIs, profitability, and outstanding balances.
 * Strictly restricted to Agency Owners and roles with FINANCIAL_MARGINS VIEW permission,
 * or Agency Staff with delegated FINANCE VIEW permission (with commercial margins redacted).
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    if (context.dbUser.role === "AGENCY_STAFF") {
      await enforceStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "FINANCE",
        "VIEW"
      );
    } else if (!canAccessFinancialMargins(context.dbUser.role)) {
      throw new ForbiddenError("You do not have permission to view agency financial metrics.");
    }
    const query = validateQueryParams(financeFilterSchema, request.nextUrl.searchParams);

    const summary = await financeService.getFinanceDashboard(context.agencyId, query);

    const safeSummary = redactStaffFinancials(summary, context.dbUser.role);
    return apiSuccess(safeSummary);
  } catch (error) {
    return handleApiError(error);
  }
}
