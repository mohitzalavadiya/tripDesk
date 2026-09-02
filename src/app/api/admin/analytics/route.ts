import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";

export async function GET(_req: NextRequest) {
  try {
    await requirePlatformOwnerContext();
    const analytics = await adminService.getPlatformUsageAnalytics();

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/admin/analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load platform analytics" },
      { status: 500 }
    );
  }
}
