import { NextRequest, NextResponse } from "next/server";
import { requireAgencyOwnerContext } from "@/lib/api/context";
import { reportFilterSchema, ReportType } from "@/lib/validation/reporting-schema";
import { reportingService } from "@/lib/services/reporting-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/export
 * Downloads sanitized CSV report file for the specified report type and date range.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireAgencyOwnerContext();
    const agencyId = context.agencyId;

    const { searchParams } = new URL(request.url);
    const parsedFilter = reportFilterSchema.parse({
      preset: searchParams.get("preset") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      type: searchParams.get("type") || undefined,
      search: searchParams.get("search") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const reportType = (searchParams.get("type") as ReportType) || "OVERVIEW";
    const { csv, filename } = await reportingService.generateReportsCSV(agencyId, parsedFilter, reportType);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/reports/export error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to export report CSV." },
      { status: 500 }
    );
  }
}
