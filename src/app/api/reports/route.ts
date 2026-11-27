import { requireMemberReadAccess } from "@/lib/api/context";
import { enforceStaffPermission } from "@/lib/api";
import { redactStaffFinancials } from "@/lib/auth/permissions";
import { reportingService } from "@/lib/services/reporting-service";
import { reportFilterSchema } from "@/lib/validation/reporting-schema";
import { NextRequest,NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports
 * Fetches server-authoritative agency BI and accounting report telemetry.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireMemberReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "REPORTS", "VIEW");
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

    const rawReport = await reportingService.getAgencyBIReport(agencyId, parsedFilter);
    const report = context.isAgencyStaff ? redactStaffFinancials(rawReport, context.dbUser.role) : rawReport;

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/reports error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate agency BI report." },
      { status: 500 }
    );
  }
}
