import { NextRequest, NextResponse } from "next/server";
import { requireAgencyOwnerContext } from "@/lib/api/context";
import { customerInsightsService } from "@/lib/services/customer-insights-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/customer-insights
 * Real-time analytics aggregated across tenant database records.
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await requireAgencyOwnerContext();

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
