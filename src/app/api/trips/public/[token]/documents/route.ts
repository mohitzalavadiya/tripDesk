import {
  getRateLimitHeaders,
  getTrustedClientIp,
  limitEndpoint,
} from "@/lib/security/rate-limiter";
import { tripPublicService } from "@/lib/services/trip-public-service";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

/**
 * GET /api/trips/public/[token]/documents
 * Public customer endpoint to list issued travel documents/vouchers for an authorized trip.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { success: false, error: "Trip token is required." },
        { status: 400 }
      );
    }

    // Rate limiting: 60 requests per minute per IP (fail-open)
    const clientIp = getTrustedClientIp(request);
    const rateLimitResult = await limitEndpoint("public-read", clientIp, request);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const documents = await tripPublicService.getPublicTripDocumentsByToken(token);
    if (!documents) {
      return NextResponse.json(
        { success: false, error: "Trip not found or link has expired." },
        { status: 404, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: documents,
      },
      {
        headers: {
          ...getRateLimitHeaders(rateLimitResult),
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    console.error("GET /api/trips/public/[token]/documents error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to retrieve trip documents." },
      { status: 500 }
    );
  }
}
