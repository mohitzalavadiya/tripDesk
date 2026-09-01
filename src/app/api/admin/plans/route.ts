import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";
import { planCreateSchema } from "@/lib/validation/admin-schema";

export async function GET(_req: NextRequest) {
  try {
    await requirePlatformOwnerContext();
    const plans = await adminService.listPlans();

    return NextResponse.json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/admin/plans error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list plans" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requirePlatformOwnerContext();
    const body = await req.json();

    const parsed = planCreateSchema.parse(body);
    const plan = await adminService.createPlan(parsed, context.dbUser.id);

    return NextResponse.json({
      success: true,
      data: plan,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("POST /api/admin/plans error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create plan" },
      { status: 400 }
    );
  }
}
