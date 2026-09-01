import { NextRequest, NextResponse } from "next/server";
import { requireAgencyOwnerContext } from "@/lib/api/context";
import { feedbackService } from "@/lib/services/feedback-service";
import { feedbackUpdateRecoverySchema } from "@/lib/validation/feedback-schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/feedback/[id]
 * Fetch single feedback record with tenant isolation.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await requireAgencyOwnerContext();
    const { id } = await context.params;

    const feedback = await feedbackService.getFeedback(authContext.agencyId, id);
    if (!feedback) {
      return NextResponse.json(
        { success: false, error: "Feedback not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: feedback,
    });
  } catch (error: any) {
    console.error("GET /api/feedback/[id] error:", error);
    const status = error.statusCode || 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch feedback" },
      { status }
    );
  }
}

/**
 * PATCH /api/feedback/[id]
 * Update service recovery status and notes.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await requireAgencyOwnerContext();
    const { id } = await context.params;

    const body = await request.json();
    const validatedInput = feedbackUpdateRecoverySchema.parse(body);

    const updated = await feedbackService.updateServiceRecovery(
      authContext.agencyId,
      id,
      validatedInput
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Service recovery details updated.",
    });
  } catch (error: any) {
    console.error("PATCH /api/feedback/[id] error:", error);
    const status = error.statusCode || (error.name === "ZodError" ? 400 : 500);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update service recovery" },
      { status }
    );
  }
}
