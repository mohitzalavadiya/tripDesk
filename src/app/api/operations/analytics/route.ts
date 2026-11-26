import { apiSuccess, enforceStaffPermission, handleApiError, requireReadAccess } from "@/lib/api";
import { redactStaffFinancials } from "@/lib/auth/permissions";
import { operationsAnalyticsService } from "@/lib/services/operations-analytics-service";
import { analyticsFilterSchema } from "@/lib/validation/operations-schema";
import { OperationStatus } from "@prisma/client";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/operations/analytics
 * Returns the full Operations Analytics Dashboard payload for the authenticated agency.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "OPERATIONS", "VIEW");
    const { searchParams } = new URL(request.url);

    const rawFilters = {
      preset: searchParams.get("preset") || "LAST_30_DAYS",
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      status: searchParams.get("status") ? (searchParams.get("status") as OperationStatus) : undefined,
      serviceType: searchParams.get("serviceType") || undefined,
      supplierId: searchParams.get("supplierId") || undefined,
      search: searchParams.get("search") || undefined,
    };

    const filters = analyticsFilterSchema.parse(rawFilters);
    const dashboard = await operationsAnalyticsService.getOperationsAnalyticsDashboard(
      context.agencyId,
      filters
    );

    return apiSuccess(redactStaffFinancials(dashboard, context.dbUser.role));
  } catch (error) {
    return handleApiError(error);
  }
}
