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

    const [crmAnalytics, summary, topCustomers] = await Promise.all([
      dashboardService.getCRMAndFollowUpAnalytics(agencyId),
      dashboardService.getDashboardSummary(agencyId, parsedFilter),
      dashboardService.getTopDestinationsAndCustomers(agencyId, parsedFilter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        crmKPIs: summary.crm,
        communicationKPIs: summary.communication,
        followUps: crmAnalytics,
        topCustomers: topCustomers.customers,
      },
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/dashboard/crm error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load CRM dashboard metrics." },
      { status: 500 }
    );
  }
}
