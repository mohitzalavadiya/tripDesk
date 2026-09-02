import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";

export async function GET(req: NextRequest) {
  try {
    await requirePlatformOwnerContext();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status") || undefined;
    const planId = searchParams.get("planId") || undefined;

    const subscriptions = await adminService.listSubscriptions({ status, planId });

    return NextResponse.json({
      success: true,
      data: subscriptions,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/admin/subscriptions error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list subscriptions" },
      { status: 500 }
    );
  }
}
