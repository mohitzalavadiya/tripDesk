import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@/lib/api/context";
import { subscriptionService } from "@/lib/services/subscription-service";

export async function GET(_req: NextRequest) {
  try {
    await getRequestContext();
    const settings = await subscriptionService.getPublicBillingSettings();

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/subscription/billing-settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load billing payment details" },
      { status: 500 }
    );
  }
}
