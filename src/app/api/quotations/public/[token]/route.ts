import { ApiError, apiSuccess, handleApiError } from "@/lib/api";
import {
  getRateLimitHeaders,
  getTrustedClientIp,
  limitEndpoint,
} from "@/lib/security/rate-limiter";
import { quotationService } from "@/lib/services/quotation-service";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/quotations/public/[token]
 * Public endpoint to retrieve sanitized quotation proposal by shareToken.
 * Rate limited: 60 requests per minute per IP (fail-open).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { success: false, error: "Quotation token is required." },
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

    const quotation = await quotationService.getPublicQuotationByToken(token);
    if (!quotation) {
      return NextResponse.json(
        { success: false, error: "Quotation proposal not found or link has expired." },
        { status: 404, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: quotation,
      },
      {
        headers: {
          ...getRateLimitHeaders(rateLimitResult),
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/quotations/public/[token]
 * Public endpoint to mark quotation as viewed.
 * Rate limited: 60 requests per minute per IP (fail-open).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { success: false, error: "Quotation token is required." },
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

    await quotationService.markQuotationViewed(token);

    return NextResponse.json(
      {
        success: true,
        data: { success: true, message: "View recorded." },
      },
      { headers: getRateLimitHeaders(rateLimitResult) }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
