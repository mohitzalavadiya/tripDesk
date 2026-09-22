import { NextRequest, NextResponse } from "next/server";
import { requirePlatformOwnerContext } from "@/lib/api/context";
import { adminService } from "@/lib/services/admin-service";

export async function POST(req: NextRequest) {
  try {
    const context = await requirePlatformOwnerContext();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded. Please select an image file." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const updated = await adminService.uploadBillingQr(
      buffer,
      file.name,
      file.type,
      context.dbUser.id
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Billing QR Code uploaded successfully.",
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("POST /api/admin/billing-settings/qr error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to upload QR Code" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: NextRequest) {
  try {
    const context = await requirePlatformOwnerContext();
    const updated = await adminService.deleteBillingQr(context.dbUser.id);

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Billing QR Code removed successfully.",
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("DELETE /api/admin/billing-settings/qr error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove QR Code" },
      { status: 400 }
    );
  }
}
