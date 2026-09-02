import { NextRequest, NextResponse } from "next/server";
import { subscriptionService } from "@/lib/services/subscription-service";

export async function GET(_req: NextRequest) {
  try {
    const plans = await subscriptionService.listActivePlans();

    return NextResponse.json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    console.error("GET /api/subscription/plans error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list active plans" },
      { status: 500 }
    );
  }
}
