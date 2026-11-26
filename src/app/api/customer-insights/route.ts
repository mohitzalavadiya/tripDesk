import { requireMemberReadAccess, enforceStaffPermission } from "@/lib/api";
import { customerInsightsService } from "@/lib/services/customer-insights-service";
import { NextRequest,NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/customer-insights
 * Real-time analytics aggregated across tenant database records.
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await requireMemberReadAccess();
    await enforceStaffPermission(authContext.dbUser.role, authContext.agencyId, authContext.dbUser.id, "CUSTOMER_INSIGHTS", "VIEW");

    const data = await customerInsightsService.getCustomerInsights(authContext.agencyId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("GET /api/customer-insights error:", error);
    const status = error.statusCode || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch customer insights" },
      { status }
    );
  }
}
