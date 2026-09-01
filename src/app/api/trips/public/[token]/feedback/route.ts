import { NextRequest, NextResponse } from "next/server";
import { feedbackService } from "@/lib/services/feedback-service";
import { customerPublicFeedbackSchema } from "@/lib/validation/feedback-schema";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

/**
 * GET /api/trips/public/[token]/feedback
 * Returns feedback eligibility, existing submission, and basic trip context.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Share token is required." },
        { status: 400 }
      );
    }

    const data = await feedbackService.getPublicFeedbackStatus(token);
    if (!data.trip) {
      return NextResponse.json(
        { success: false, error: "Trip not found or travel link has expired." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("GET /api/trips/public/[token]/feedback error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to check feedback status." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trips/public/[token]/feedback
 * Submits post-tour traveler feedback with ratings and comments.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Share token is required." },
        { status: 400 }
      );
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { success: false, error: "Request payload is required." },
        { status: 400 }
      );
    }

    const parseResult = customerPublicFeedbackSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json(
        { success: false, error: errorMessage || "Invalid feedback payload." },
        { status: 400 }
      );
    }

    const result = await feedbackService.submitPublicFeedback(token, parseResult.data);

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: "Thank you! Your feedback has been submitted successfully.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/trips/public/[token]/feedback error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    const msg = error?.message || "";

    if (msg.startsWith("INVALID_TOKEN")) {
      return NextResponse.json(
        { success: false, error: "This trip link is invalid or expired." },
        { status: 404 }
      );
    }

    if (msg.startsWith("TRIP_NOT_COMPLETED")) {
      return NextResponse.json(
        { success: false, error: "Feedback will be available after your tour is completed." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: msg || "Unable to submit feedback. Please try again." },
      { status: 500 }
    );
  }
}
