import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requirePlatformOwnerContext();
    const { id } = await params;

    const details = await adminService.getAgency360(id);
    if (!details) {
      return NextResponse.json(
        { success: false, error: "Agency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: details,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/admin/agencies/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load agency details" },
      { status: 500 }
    );
  }
}
