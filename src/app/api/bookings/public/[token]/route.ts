import {
  getRateLimitHeaders,
  getTrustedClientIp,
  limitEndpoint,
} from "@/lib/security/rate-limiter";
import { bookingPublicService } from "@/lib/services/booking-public-service";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { success: false, error: "Booking token is required." },
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

    const data = await bookingPublicService.getPublicBookingByToken(token);
    if (!data) {
      return NextResponse.json(
        { success: false, error: "Booking not found or link has expired." },
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
    console.error("GET /api/bookings/public/[token] error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to retrieve booking details." },
      { status: 500 }
    );
  }
}
