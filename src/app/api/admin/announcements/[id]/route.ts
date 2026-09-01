import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";
import { announcementUpdateSchema } from "@/lib/validation/admin-schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const context = await requirePlatformOwnerContext();
    const { id } = await params;
    const body = await req.json();

    const parsed = announcementUpdateSchema.parse(body);
    const announcement = await adminService.updateAnnouncement(id, parsed, context.dbUser.id);

    return NextResponse.json({
      success: true,
      data: announcement,
      message: "Announcement updated successfully.",
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("PATCH /api/admin/announcements/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update announcement" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const context = await requirePlatformOwnerContext();
    const { id } = await params;

    const deleted = await adminService.deleteAnnouncement(id, context.dbUser.id);

    return NextResponse.json({
      success: true,
      data: deleted,
      message: "Announcement deleted successfully.",
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("DELETE /api/admin/announcements/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete announcement" },
      { status: 400 }
    );
  }
}
