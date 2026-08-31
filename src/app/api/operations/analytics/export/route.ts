import { NextRequest, NextResponse } from "next/server";
import { requireReadAccess, handleApiError } from "@/lib/api";
import { operationsAnalyticsService } from "@/lib/services/operations-analytics-service";
import { analyticsFilterSchema } from "@/lib/validation/operations-schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/operations/analytics/export
 * Downloads sanitized operations analytics CSV report.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const { searchParams } = new URL(request.url);

    const rawFilters = {
      preset: searchParams.get("preset") || "LAST_30_DAYS",
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    };

    const filters = analyticsFilterSchema.parse(rawFilters);
    const csvContent = await operationsAnalyticsService.generateAnalyticsCsv(
      context.agencyId,
      filters
    );

    const filename = `tripdesk-operations-analytics-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
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
