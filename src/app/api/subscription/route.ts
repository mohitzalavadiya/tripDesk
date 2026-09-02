import { NextRequest, NextResponse } from "next/server";
import { requireAgencyOwnerContext } from "@/lib/api/context";
import { subscriptionService } from "@/lib/services/subscription-service";

export async function GET(_req: NextRequest) {
  try {
    const context = await requireAgencyOwnerContext();
    const overview = await subscriptionService.getAgencySubscription(context.agencyId);

    return NextResponse.json({
      success: true,
      data: overview,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/subscription error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve agency subscription" },
      { status: 500 }
    );
  }
}
