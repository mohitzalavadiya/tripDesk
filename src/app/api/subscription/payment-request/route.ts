import { NextRequest, NextResponse } from "next/server";
import { requireAgencyOwnerContext } from "@/lib/api/context";
import { subscriptionService } from "@/lib/services/subscription-service";
import { agencyPaymentRequestSchema } from "@/lib/validation/subscription-schema";

export async function POST(req: NextRequest) {
  try {
    const context = await requireAgencyOwnerContext();
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
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("POST /api/subscription/payment-request error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit subscription payment request" },
      { status: 400 }
    );
  }
}
