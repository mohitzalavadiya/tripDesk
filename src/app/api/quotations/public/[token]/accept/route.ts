import { apiSuccess, handleApiError, validateJson } from "@/lib/api";
import {
  getRateLimitHeaders,
  getTrustedClientIp,
  limitEndpoint,
} from "@/lib/security/rate-limiter";
import { quotationService } from "@/lib/services/quotation-service";
import { acceptQuotationSchema } from "@/lib/validation/quotation-schema";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/quotations/public/[token]/accept
 * Public customer endpoint to accept a quotation proposal.
 * Rate limited: 10 req/min per IP and token (fail-closed).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Quotation token is required." },
        { status: 400 }
      );
    }

    const clientIp = getTrustedClientIp(request);
    const rateLimitResult = await limitEndpoint(
      "public-quotation-mutation",
      `${clientIp}:${token.trim()}`,
      request
    );

    if (!rateLimitResult.allowed) {
      if (rateLimitResult.isServiceUnavailable) {
        return NextResponse.json(
          {
            success: false,
            error: "Quotation acceptance is temporarily unavailable. Please try again shortly.",
          },
          { status: 503, headers: getRateLimitHeaders(rateLimitResult) }
        );
      }

      return NextResponse.json(
        { success: false, error: "Too many acceptance attempts. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await validateJson(acceptQuotationSchema, request);

    const result = await quotationService.acceptPublicQuotation(token, body);

    const response = apiSuccess(result);
    for (const [header, value] of Object.entries(getRateLimitHeaders(rateLimitResult))) {
      response.headers.set(header, value);
    }
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
