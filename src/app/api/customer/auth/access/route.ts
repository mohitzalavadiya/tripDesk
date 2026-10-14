import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/customer/auth/access
 * Retired: Customer login is not part of the Your Travel Desk experience.
 * Travelers access quotations, itineraries, and booking documents directly
 * via secure, stateless public share links (/q/[token], /trip/[token], /b/[token]).
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "FEATURE_RETIRED",
        message:
          "Customer account login is not supported. Please access your trip details directly via the secure link sent to you by your travel agency.",
      },
    },
    { status: 410 }
  );
}
