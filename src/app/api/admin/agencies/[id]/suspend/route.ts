import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";
import { suspendAgencySchema } from "@/lib/validation/admin-schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const context = await requirePlatformOwnerContext();
    const { id } = await params;
    const body = await req.json();

    const parsed = suspendAgencySchema.parse(body);
    const agency = await adminService.suspendAgency(id, parsed.reason, context.dbUser.id);

    return NextResponse.json({
      success: true,
      data: agency,
      message: "Agency suspended successfully.",
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("POST /api/admin/agencies/[id]/suspend error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to suspend agency" },
      { status: 400 }
    );
  }
}
