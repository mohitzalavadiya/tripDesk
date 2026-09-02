import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const context = await requirePlatformOwnerContext();
    const { id } = await params;

    const agency = await adminService.reactivateAgency(id, context.dbUser.id);

    return NextResponse.json({
      success: true,
      data: agency,
      message: "Agency reactivated successfully.",
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("POST /api/admin/agencies/[id]/reactivate error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reactivate agency" },
      { status: 400 }
    );
  }
}
