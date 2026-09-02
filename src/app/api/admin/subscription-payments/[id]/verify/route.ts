import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";
import { subscriptionPaymentVerifySchema } from "@/lib/validation/admin-schema";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/subscription-payments/[id]/verify
 * Verify a pending subscription payment and activate/extend agency subscription.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await requirePlatformOwnerContext();
    const { id } = await context.params;

    const body = await request.json().catch(() => ({}));
    const validatedInput = subscriptionPaymentVerifySchema.parse(body);

    const updatedPayment = await adminService.verifySubscriptionPayment(
      id,
      validatedInput,
      authContext.dbUser.id
    );

    return NextResponse.json({
      success: true,
      data: updatedPayment,
      message: "Subscription payment verified and subscription activated.",
    });
  } catch (error: any) {
    console.error("POST /api/admin/subscription-payments/[id]/verify error:", error);
    const status = error.statusCode || (error.name === "ZodError" ? 400 : 500);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify subscription payment" },
      { status }
    );
  }
}
