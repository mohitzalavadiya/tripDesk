import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";
import { platformSettingsUpdateSchema } from "@/lib/validation/admin-schema";

export async function GET(_req: NextRequest) {
  try {
    await requirePlatformOwnerContext();
    const settings = await adminService.getPlatformSettings();

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/admin/settings error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load platform settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const context = await requirePlatformOwnerContext();
    const body = await req.json();

    const parsed = platformSettingsUpdateSchema.parse(body);
    const updated = await adminService.updatePlatformSettings(parsed.settings, context.dbUser.id);

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Platform settings updated successfully.",
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("PATCH /api/admin/settings error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update settings" },
      { status: 400 }
    );
  }
}
