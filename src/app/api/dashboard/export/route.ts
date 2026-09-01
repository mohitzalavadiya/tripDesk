import { NextRequest, NextResponse } from "next/server";
import { requireReadAccess } from "@/lib/api/context";
import { dashboardService } from "@/lib/services/dashboard-service";
import { DashboardFilterSchema } from "@/lib/validation/dashboard-schema";

export async function GET(req: NextRequest) {
  try {
    const context = await requireReadAccess();
    const agencyId = context.agencyId;

    const { searchParams } = new URL(req.url);
    const parsedFilter = DashboardFilterSchema.parse({
      preset: searchParams.get("preset") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    });

    const { csv, filename } = await dashboardService.exportDashboardCSV(agencyId, parsedFilter);

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
    console.error("GET /api/dashboard/export error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export dashboard report." },
      { status: 500 }
    );
  }
}
