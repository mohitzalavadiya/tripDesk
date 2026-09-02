import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";
import { extendTrialSchema } from "@/lib/validation/admin-schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const context = await requirePlatformOwnerContext();
    const { id } = await params;
    const body = await req.json();

    const parsed = extendTrialSchema.parse(body);
    const subscription = await adminService.extendAgencyTrial(
      id,
      parsed.daysToAdd,
      parsed.reason,
      context.dbUser.id
    );

    return NextResponse.json({
      success: true,
      data: subscription,
      message: `Trial extended by ${parsed.daysToAdd} days.`,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("POST /api/admin/agencies/[id]/extend-trial error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to extend trial" },
      { status: 400 }
    );
  }
}
