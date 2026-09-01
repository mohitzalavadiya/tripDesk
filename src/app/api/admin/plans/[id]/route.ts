import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";
import { planUpdateSchema } from "@/lib/validation/admin-schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const context = await requirePlatformOwnerContext();
    const { id } = await params;
    const body = await req.json();

    const parsed = planUpdateSchema.parse(body);
    const plan = await adminService.updatePlan(id, parsed, context.dbUser.id);

    return NextResponse.json({
      success: true,
      data: plan,
      message: "Plan updated successfully.",
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("PATCH /api/admin/plans/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update plan" },
      { status: 400 }
    );
  }
}
