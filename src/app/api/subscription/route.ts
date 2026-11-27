import { requireReadAccess } from "@/lib/api/context";
import { subscriptionRetiredResponse } from "@/lib/api/errors";
import { subscriptionService } from "@/lib/services/subscription-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const context = await requireReadAccess();
    return subscriptionRetiredResponse();
    const overview = await subscriptionService.getAgencySubscription(context.agencyId);

    return NextResponse.json({
      success: true,
      data: context.isAgencyStaff && overview
        ? {
            ...overview,
            subscription: overview.subscription
              ? {
                  ...overview.subscription,
                  planPrice: 0,
                  planYearlyPrice: null,
                  planDescription: null,
                }
              : overview.subscription,
            latestPendingPayment: null,
            paymentHistory: [],
            availablePlans: [],
          }
        : overview,
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("GET /api/subscription error:", error);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to retrieve agency subscription" },
      { status: 500 }
    );
  }
}
