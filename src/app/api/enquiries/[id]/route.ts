import {
  apiSuccess,
  ForbiddenError,
  handleApiError,
  requireAgencyOwnerContext,
  enforceStaffPermission,
  requireMemberReadAccess,
  requireMemberWriteAccess,
  validateJson,
} from "@/lib/api";
import { enquiryService } from "@/lib/services/enquiry-service";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import { updateEnquirySchema } from "@/lib/validation/enquiry-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/enquiries/[id]
 * Get single enquiry with customer, trip, quotation, and follow-ups.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireMemberReadAccess();

    if (context.isAgencyStaff) {
      const canView = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "ENQUIRIES",
        "VIEW"
      );
      if (!canView) {
        throw new ForbiddenError("You do not have permission to view enquiries.");
      }
    }

    const { id } = await params;

    const enquiry = await enquiryService.getEnquiry(context.agencyId, id);
    if (!enquiry) {
      return handleApiError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Enquiry record not found.",
      });
    }

    return apiSuccess(enquiry);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/enquiries/[id]
 * Update enquiry status, requirements, dates, passenger count, or priority.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireMemberWriteAccess();

    if (context.isAgencyStaff) {
      const canUpdate = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "ENQUIRIES",
        "UPDATE"
      );
      if (!canUpdate) {
        throw new ForbiddenError("You do not have permission to update enquiries.");
      }
    }

    const { id } = await params;
    const body = await validateJson(updateEnquirySchema, request);

    const actor = {
      userId: context.dbUser.id,
      userName: context.dbUser.name || context.dbUser.email || (context.isAgencyOwner ? "Agency Owner" : "Staff Member"),
      role: context.dbUser.role,
    };
    const updated = await enquiryService.updateEnquiry(context.agencyId, id, body, actor);

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/enquiries/[id]
 * Soft delete / archive enquiry. Agency Owner only.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireMemberWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ENQUIRY_DETAIL", "DELETE");
    const { id } = await params;

    await enquiryService.archiveEnquiry(context.agencyId, id);

    return apiSuccess({ success: true, message: "Enquiry archived successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
