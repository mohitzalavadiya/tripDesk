import { getRequestContext } from "@/lib/api/context";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 * Returns trusted server-side user, role, agency, subscription access, and staff permissions.
 * Never trusts client headers or query parameters for identity.
 */
export async function GET() {
  try {
    const context = await getRequestContext();

    if (!context) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          },
        },
        { status: 401 }
      );
    }

    const staffPermissions = (context.isAgencyStaff && context.dbUser.agencyId)
      ? await staffPermissionService.getStaffPermissions(context.dbUser.agencyId, context.dbUser.id)
      : null;

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: context.dbUser.id,
          email: context.dbUser.email,
          name: context.dbUser.name,
          role: context.dbUser.role,
          agencyId: context.dbUser.agencyId,
        },
        agency: context.agency
          ? {
              id: context.agency.id,
              name: context.agency.name,
              email: context.agency.email,
              phone: context.agency.phone,
              address: context.agency.address,
              status: context.agency.status,
            }
          : null,
        subscriptionAccess: context.subscriptionAccess,
        isPlatformOwner: context.isPlatformOwner,
        isAgencyOwner: context.isAgencyOwner,
        staffPermissions,
      },
    });
  } catch (err: any) {
    console.error("Error in /api/auth/me:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to resolve session context.",
        },
      },
      { status: 500 }
    );
  }
}
