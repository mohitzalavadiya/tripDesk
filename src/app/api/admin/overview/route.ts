import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";

export async function GET(_req: NextRequest) {
  try {
    await requirePlatformOwnerContext();
    const stats = await adminService.getPlatformOverview();

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/admin/overview error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load platform overview" },
      { status: 500 }
    );
  }
}
