import { NextRequest, NextResponse } from "next/server";
import { communicationService } from "@/lib/services/communication-service";
import { listPublicNotificationsSchema } from "@/lib/validation/communication-schema";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

/**
 * GET /api/trips/public/[token]/notifications
 * Returns customer-safe notifications, unread counts, and trip/agency context.
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

    const { searchParams } = new URL(request.url);
    const parsedQuery = listPublicNotificationsSchema.safeParse({
      unreadOnly: searchParams.get("unreadOnly"),
      type: searchParams.get("type") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const query = parsedQuery.success ? parsedQuery.data : {};
    const data = await communicationService.getPublicNotifications(token, query);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("GET /api/trips/public/[token]/notifications error:", error);
    const msg = error?.message || "";

    if (msg.startsWith("INVALID_TOKEN")) {
      return NextResponse.json(
        { success: false, error: "This trip link is invalid or expired." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Unable to retrieve notifications." },
      { status: 500 }
    );
  }
}
