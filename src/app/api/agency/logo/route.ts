import { NextRequest, NextResponse } from "next/server";
import { requireAgencyOwnerContext } from "@/lib/api/context";
import { entitlementService } from "@/lib/services/entitlement-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/agency/logo
 * Update custom agency logo. Server-side gated by CUSTOM_AGENCY_LOGO entitlement.
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await requireAgencyOwnerContext();
    const agencyId = authContext.agencyId;

    // Enforce CUSTOM_AGENCY_LOGO entitlement server-side
    await entitlementService.checkFeatureAllowed(agencyId, "CUSTOM_AGENCY_LOGO");

    const body = await request.json();
    const { logoUrl } = body;

    if (typeof logoUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "logoUrl must be a valid string." },
        { status: 400 }
      );
    }

    const updatedAgency = await prisma.agency.update({
      where: { id: agencyId },
      data: { logo: logoUrl },
      select: { id: true, name: true, logo: true },
    });

    return NextResponse.json({
      success: true,
      data: updatedAgency,
      message: "Agency logo updated successfully.",
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
      { success: false, error: error.message || "Failed to update agency logo" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agency/logo
 * Remove custom agency logo. Server-side gated by CUSTOM_AGENCY_LOGO entitlement.
 */
export async function DELETE(_request: NextRequest) {
  try {
    const authContext = await requireAgencyOwnerContext();
    const agencyId = authContext.agencyId;

    // Enforce CUSTOM_AGENCY_LOGO entitlement server-side
    await entitlementService.checkFeatureAllowed(agencyId, "CUSTOM_AGENCY_LOGO");

    const updatedAgency = await prisma.agency.update({
      where: { id: agencyId },
      data: { logo: null },
      select: { id: true, name: true, logo: true },
    });

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
