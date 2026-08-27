import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/logout
 * Server-side logout endpoint to explicitly sign out Supabase and invalidate auth cookies.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (err: any) {
    console.error("Error in /api/auth/logout:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "LOGOUT_FAILED",
          message: "Failed to sign out cleanly.",
        },
      },
      { status: 500 }
    );
  }
}
