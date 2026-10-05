import { NextRequest, NextResponse } from "next/server";
import { requireWriteAccess } from "@/lib/api/context";
import { entitlementService } from "@/lib/services/entitlement-service";
import { agencyLogoService } from "@/lib/services/agency-logo-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/agency/logo
 * Multipart file upload for custom agency logo.
 * Server-side gated by requireWriteAccess and CUSTOM_AGENCY_LOGO entitlement.
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await requireWriteAccess();
    const agencyId = authContext.agencyId;

    // Enforce CUSTOM_AGENCY_LOGO entitlement server-side
    await entitlementService.checkFeatureAllowed(agencyId, "CUSTOM_AGENCY_LOGO");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded. Please select an image file (PNG, JPEG, or WEBP)." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const updatedAgency = await agencyLogoService.uploadLogo(
      agencyId,
      fileBuffer,
      file.name,
      file.type
    );

    return NextResponse.json({
      success: true,
      data: updatedAgency,
      message: "Agency logo uploaded successfully.",
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error("POST /api/agency/logo error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to upload agency logo" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agency/logo
 * Remove custom agency logo from database and storage.
 * Server-side gated by requireWriteAccess and CUSTOM_AGENCY_LOGO entitlement.
 */
export async function DELETE(_request: NextRequest) {
  try {
    const authContext = await requireWriteAccess();
    const agencyId = authContext.agencyId;

    // Enforce CUSTOM_AGENCY_LOGO entitlement server-side
    await entitlementService.checkFeatureAllowed(agencyId, "CUSTOM_AGENCY_LOGO");

    const updatedAgency = await agencyLogoService.deleteLogo(agencyId);

    return NextResponse.json({
      success: true,
      data: updatedAgency,
      message: "Agency logo removed successfully.",
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }
    console.error("DELETE /api/agency/logo error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove agency logo" },
      { status: 500 }
    );
  }
}
