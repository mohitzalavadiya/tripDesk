import { NextRequest, NextResponse } from "next/server";
import { communicationService } from "@/lib/services/communication-service";

interface RouteParams {
  params: Promise<{ token: string; id: string }>;
}

export const dynamic = "force-dynamic";

/**
 * POST /api/trips/public/[token]/notifications/[id]/read
 * Marks a customer notification as read securely scoped to token.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token, id } = await params;
    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Share token is required." },
        { status: 400 }
      );
    }

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Notification ID is required." },
        { status: 400 }
      );
    }

    const data = await communicationService.markPublicNotificationRead(token, id);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("POST /api/trips/public/[token]/notifications/[id]/read error:", error);
    const msg = error?.message || "";

    if (msg.startsWith("INVALID_TOKEN")) {
      return NextResponse.json(
        { success: false, error: "This trip link is invalid or expired." },
        { status: 404 }
      );
    }

    if (msg.startsWith("NOTIFICATION_NOT_FOUND")) {
      return NextResponse.json(
        { success: false, error: "Notification not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Unable to update notification read state." },
      { status: 500 }
    );
  }
}
