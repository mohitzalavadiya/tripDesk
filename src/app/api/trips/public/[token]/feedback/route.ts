import {
  getRateLimitHeaders,
  getTrustedClientIp,
  limitEndpoint,
} from "@/lib/security/rate-limiter";
import { feedbackService } from "@/lib/services/feedback-service";
import { customerPublicFeedbackSchema } from "@/lib/validation/feedback-schema";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

/**
 * GET /api/trips/public/[token]/feedback
 * Returns feedback eligibility, existing submission, and basic trip context.
 * Rate limited: 60 req/min per IP (fail-open).
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

    const clientIp = getTrustedClientIp(request);
    const rateLimitResult = await limitEndpoint("public-read", clientIp, request);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const data = await feedbackService.getPublicFeedbackStatus(token);
    if (!data.trip) {
      return NextResponse.json(
        { success: false, error: "Trip not found or travel link has expired." },
        { status: 404, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
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
 * Rate limited: 5 req/min per IP and token (fail-closed).
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

    const clientIp = getTrustedClientIp(request);
    const rateLimitId = `${clientIp}:${token.trim()}`;
    const rateLimitResult = await limitEndpoint("public-feedback", rateLimitId, request);

    if (!rateLimitResult.allowed) {
      if (rateLimitResult.isServiceUnavailable) {
        return NextResponse.json(
          {
            success: false,
            error: "Feedback submission is temporarily unavailable. Please try again shortly.",
          },
          { status: 503, headers: getRateLimitHeaders(rateLimitResult) }
        );
      }

      return NextResponse.json(
        { success: false, error: "Too many feedback submission attempts. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const rawBody = await request.json().catch(() => null);
    if (!rawBody) {
      return NextResponse.json(
        { success: false, error: "Request payload is required." },
        { status: 400, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const parseResult = customerPublicFeedbackSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json(
        { success: false, error: errorMessage || "Invalid feedback payload." },
        { status: 400, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const result = await feedbackService.submitPublicFeedback(token, parseResult.data);

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: "Thank you! Your feedback has been submitted successfully.",
      },
      {
        status: 201,
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error: any) {
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
      { success: false, error: "Unable to submit feedback. Please try again." },
      { status: 500 }
    );
  }
}
