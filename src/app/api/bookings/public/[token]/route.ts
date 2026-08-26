import { NextRequest, NextResponse } from "next/server";
import { bookingPublicService } from "@/lib/services/booking-public-service";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Booking token is required." },
        { status: 400 }
      );
    }

    const data = await bookingPublicService.getPublicBookingByToken(token);
    if (!data) {
      return NextResponse.json(
        { success: false, error: "Booking not found or link has expired." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("GET /api/bookings/public/[token] error:", error);
    return NextResponse.json(
      { success: false, error: "Unable to retrieve booking details." },
      { status: 500 }
    );
  }
}
