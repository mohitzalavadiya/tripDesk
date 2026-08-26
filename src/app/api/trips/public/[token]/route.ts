import { NextRequest, NextResponse } from "next/server";
import { tripPublicService } from "@/lib/services/trip-public-service";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Share token is required." },
        { status: 400 }
      );
    }

    const data = await tripPublicService.getPublicTripByToken(token);
    if (!data) {
      return NextResponse.json(
        { success: false, error: "Trip not found or link has expired." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("GET /api/trips/public/[token] error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to retrieve trip details." },
      { status: 500 }
    );
  }
}
