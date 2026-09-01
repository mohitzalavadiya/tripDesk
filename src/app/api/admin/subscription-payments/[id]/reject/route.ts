import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";
import { subscriptionPaymentRejectSchema } from "@/lib/validation/admin-schema";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/subscription-payments/[id]/reject
 * Reject a pending subscription payment with an audit reason.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await requirePlatformOwnerContext();
    const { id } = await context.params;

    const body = await request.json();
    const validatedInput = subscriptionPaymentRejectSchema.parse(body);

    const updatedPayment = await adminService.rejectSubscriptionPayment(
      id,
      validatedInput,
      authContext.dbUser.id
    );

    return NextResponse.json({
      success: true,
      data: updatedPayment,
      message: "Subscription payment rejected.",
    });
  } catch (error: any) {
    console.error("POST /api/admin/subscription-payments/[id]/reject error:", error);
    const status = error.statusCode || (error.name === "ZodError" ? 400 : 500);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reject subscription payment" },
      { status }
    );
  }
}
