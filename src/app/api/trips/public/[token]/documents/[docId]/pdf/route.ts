import {
  getRateLimitHeaders,
  getTrustedClientIp,
  limitEndpoint,
} from "@/lib/security/rate-limiter";
import { tripPublicService } from "@/lib/services/trip-public-service";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ token: string; docId: string }>;
}

export const dynamic = "force-dynamic";

/**
 * GET /api/trips/public/[token]/documents/[docId]/pdf
 * Public customer endpoint to download an issued travel document PDF strictly authorized by the trip share token.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token, docId } = await params;
    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { success: false, error: "Trip token is required." },
        { status: 400 }
      );
    }

    if (!docId || typeof docId !== "string" || !docId.trim()) {
      return NextResponse.json(
        { success: false, error: "Document ID is required." },
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

    const documentResult = await tripPublicService.getPublicTripDocumentPdf(token, docId);
    if (!documentResult) {
      return NextResponse.json(
        { success: false, error: "Document not found or link has expired." },
        { status: 404, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const safeFilename = documentResult.filename.replace(/[^a-zA-Z0-9_.-]/g, "_");

    return new NextResponse(new Uint8Array(documentResult.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error: any) {
    console.error("GET /api/trips/public/[token]/documents/[docId]/pdf error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to generate travel document PDF." },
      { status: 500 }
    );
  }
}
