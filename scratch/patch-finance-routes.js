const fs = require('fs');

const summaryFile = 'src/app/api/finance/summary/route.ts';
const summaryContent = `import {
  apiSuccess,
  handleApiError,
  requireReadAccess,
  validateQueryParams,
} from "@/lib/api";
import { ForbiddenError } from "@/lib/api/errors";
import { canAccessFinancialMargins, enforceStaffPermission, redactStaffFinancials } from "@/lib/auth/permissions";
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
`;
fs.writeFileSync(summaryFile, summaryContent);
console.log('Successfully updated src/app/api/finance/summary/route.ts');

const txFile = 'src/app/api/finance/transactions/route.ts';
const txContent = `import {
  apiSuccess,
  handleApiError,
  requireReadAccess,
  validateQueryParams,
} from "@/lib/api";
import { ForbiddenError } from "@/lib/api/errors";
import { canAccessFinancialMargins, enforceStaffPermission, redactStaffFinancials } from "@/lib/auth/permissions";
import { financeService } from "@/lib/services/finance-service";
import { transactionQuerySchema } from "@/lib/validation/finance-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/finance/transactions
 * Returns unified paginated financial transaction ledger.
 * Accessible to Agency Owners or Agency Staff with delegated FINANCE VIEW permission (with sensitive supplier fields redacted).
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
      throw new ForbiddenError("You do not have permission to view financial transactions.");
    }
    const query = validateQueryParams(transactionQuerySchema, request.nextUrl.searchParams);

    const result = await financeService.getTransactions(context.agencyId, query);

    const safeData = redactStaffFinancials(result.data, context.dbUser.role);
    return apiSuccess(safeData, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}
`;
fs.writeFileSync(txFile, txContent);
console.log('Successfully updated src/app/api/finance/transactions/route.ts');

