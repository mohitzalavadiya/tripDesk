import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";
import { announcementCreateSchema } from "@/lib/validation/admin-schema";

export async function GET(_req: NextRequest) {
  try {
    await requirePlatformOwnerContext();
    const announcements = await adminService.listAnnouncements();

    return NextResponse.json({
      success: true,
      data: announcements,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/admin/announcements error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list announcements" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requirePlatformOwnerContext();
    const body = await req.json();

    const parsed = announcementCreateSchema.parse(body);
    const announcement = await adminService.createAnnouncement(parsed, context.dbUser.id);

    return NextResponse.json({
      success: true,
      data: announcement,
      message: "Announcement created successfully.",
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("POST /api/admin/announcements error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create announcement" },
      { status: 400 }
    );
  }
}
