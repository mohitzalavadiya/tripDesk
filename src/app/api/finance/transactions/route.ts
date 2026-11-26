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
