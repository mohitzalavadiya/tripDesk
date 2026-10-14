import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/communication
 *
 * Inbound communication delivery webhooks are explicitly disabled for the current production release.
 * External notification delivery (Email/WhatsApp/SMS) is currently simulated/deferred, and no
 * third-party webhook providers (Resend, SendGrid, Meta WhatsApp, Gupshup) are active or authorized.
 *
 * Immediately returns HTTP 404 without parsing the request body, inspecting headers, or querying the database.
 * Prevents unauthenticated forgery of notification delivery logs.
 */
export async function POST() {
  return NextResponse.json(
    { success: false, error: "Communication webhook receiver is disabled." },
    { status: 404 }
  );
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: "Communication webhook receiver is disabled." },
    { status: 404 }
  );
}
