import { NextRequest, NextResponse } from "next/server";
import { requireAgencyOwnerContext } from "@/lib/api/context";
import { feedbackService } from "@/lib/services/feedback-service";
import {
  feedbackFilterSchema,
  feedbackCreateSchema,
} from "@/lib/validation/feedback-schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/feedback
 * List feedbacks and statistics for authenticated agency.
 */
export async function GET(request: NextRequest) {
  try {
    const authContext = await requireAgencyOwnerContext();
    const { searchParams } = new URL(request.url);

    const filter = feedbackFilterSchema.parse({
      search: searchParams.get("search") || undefined,
      tab: searchParams.get("tab") || "ALL",
      tripId: searchParams.get("tripId") || undefined,
      customerId: searchParams.get("customerId") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const result = await feedbackService.listFeedbacks(authContext.agencyId, filter);

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (error: any) {
    console.error("GET /api/feedback error:", error);
    const status = error.statusCode || (error.name === "ZodError" ? 400 : 500);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch feedback" },
      { status }
    );
  }
}

/**
 * POST /api/feedback
 * Record manual customer feedback.
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await requireAgencyOwnerContext();
    const body = await request.json();
    const validatedInput = feedbackCreateSchema.parse(body);

    const feedback = await feedbackService.createFeedback(
      authContext.agencyId,
      validatedInput
    );

    return NextResponse.json({
      success: true,
      data: feedback,
    });
  } catch (error: any) {
    console.error("POST /api/feedback error:", error);
    const status = error.statusCode || (error.name === "ZodError" ? 400 : 500);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create feedback" },
      { status }
    );
  }
}
