import { requireReadAccess } from "@/lib/api/context";
import { subscriptionService } from "@/lib/services/subscription-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await requireReadAccess();
    const settings = await subscriptionService.getPublicBillingSettings();

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("GET /api/subscription/billing-settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load billing payment details" },
      { status: 500 }
    );
  }
}
