import { NextRequest, NextResponse } from "next/server";
import { requireAgencyOwnerContext } from "@/lib/api/context";
import { referralService } from "@/lib/services/referral-service";
import { referralStatusUpdateSchema } from "@/lib/validation/referral-schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/referrals/[id]
 * Fetch single referral record with tenant isolation.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await requireAgencyOwnerContext();
    const { id } = await context.params;

    const referral = await referralService.getReferral(authContext.agencyId, id);
    if (!referral) {
      return NextResponse.json(
        { success: false, error: "Referral not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: referral,
    });
  } catch (error: any) {
    console.error("GET /api/referrals/[id] error:", error);
    const status = error.statusCode || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch referral" },
      { status }
    );
  }
}

/**
 * PATCH /api/referrals/[id]
 * Update referral status, reward amount, or conversion.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await requireAgencyOwnerContext();
    const { id } = await context.params;

    const body = await request.json();
    const validatedInput = referralStatusUpdateSchema.parse(body);

    const updated = await referralService.updateReferralStatus(
      authContext.agencyId,
      id,
      validatedInput
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Referral status updated.",
    });
  } catch (error: any) {
    console.error("PATCH /api/referrals/[id] error:", error);
    const status = error.statusCode || (error.name === "ZodError" ? 400 : 500);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update referral" },
      { status }
    );
  }
}
