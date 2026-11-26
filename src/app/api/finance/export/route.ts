import {
handleApiError,
requireReadAccess,
validateQueryParams,
} from "@/lib/api";
import { ForbiddenError } from "@/lib/api/errors";
import { canAccessFinancialMargins } from "@/lib/auth/permissions";
import { financeService } from "@/lib/services/finance-service";
import { financeFilterSchema } from "@/lib/validation/finance-schema";
import { NextRequest,NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/finance/export
 * Downloads sanitized financial CSV report.
 * Strictly restricted to Agency Owners and roles with FINANCIAL_MARGINS EXPORT permission.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    if (!canAccessFinancialMargins(context.dbUser.role)) {
      throw new ForbiddenError("You do not have permission to export financial data.");
    }
    const query = validateQueryParams(financeFilterSchema, request.nextUrl.searchParams);

    const csvData = await financeService.generateFinanceCsv(context.agencyId, query);

    const filename = `yourtraveldesk-finance-report-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
