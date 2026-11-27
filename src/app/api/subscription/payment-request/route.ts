import { requireBillingRenewalAccess } from "@/lib/api/context";
import { subscriptionRetiredResponse } from "@/lib/api/errors";
import { enforceStaffPermission } from "@/lib/services/staff-permission-service";
import { subscriptionService } from "@/lib/services/subscription-service";
import { agencyPaymentRequestSchema } from "@/lib/validation/subscription-schema";
import { NextRequest,NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const context = await requireBillingRenewalAccess();
    return subscriptionRetiredResponse();
    await enforceStaffPermission(
      context.dbUser.role,
      context.agencyId,
      context.dbUser.id,
      "SUBSCRIPTION",
      "manage"
    );
    const body = await req.json();

    const parsed = agencyPaymentRequestSchema.parse(body);
    const result = await subscriptionService.createPaymentRequest(
      context.agencyId,
      context.dbUser.id,
      parsed
    );

    return NextResponse.json({
      success: true,
      data: result,
      message: "Subscription payment request submitted for verification.",
    });
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    if (err.statusCode) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }
    console.error("POST /api/subscription/payment-request error:", error);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to submit subscription payment request" },
      { status: 400 }
    );
  }
}
