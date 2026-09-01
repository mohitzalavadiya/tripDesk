import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/subscription-payments/[id]
 * Fetch detailed subscription payment record.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformOwnerContext();
    const { id } = await context.params;

    const payment = await adminService.getSubscriptionPayment(id);
    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Subscription payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payment,
    });
  } catch (error: any) {
    console.error("GET /api/admin/subscription-payments/[id] error:", error);
    const status = error.statusCode || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch subscription payment" },
      { status }
    );
  }
}
