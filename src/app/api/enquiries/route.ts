import {
  apiCreated,
  apiSuccess,
  ForbiddenError,
  handleApiError,
  requireMemberReadAccess,
  requireMemberWriteAccess,
  validateJson,
  validateQueryParams,
} from "@/lib/api";
import { enquiryService } from "@/lib/services/enquiry-service";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import {
  createEnquirySchema,
  enquiryQuerySchema,
} from "@/lib/validation/enquiry-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/enquiries
 * List enquiries with search, status/priority/source filters, and pagination.
 * Agency staff can access all agency enquiries if granted ENQUIRIES.view.
 * Evaluates requireReadAccess() and requireWriteAccess() via member access guards.
 */
export async function GET(request: NextRequest) {
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

    const queryParams = validateQueryParams(enquiryQuerySchema, request.nextUrl.searchParams);
    const authenticatedUser = {
      userId: context.dbUser.id,
      userName: context.dbUser.name || null,
    };
    const result = await enquiryService.getEnquiries(context.agencyId, queryParams, authenticatedUser);

    return apiSuccess(result.data, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/enquiries
 * Create a new customer travel enquiry.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireMemberWriteAccess();

    if (context.isAgencyStaff) {
      const canCreate = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "ENQUIRIES",
        "CREATE"
      );
      if (!canCreate) {
        throw new ForbiddenError("You do not have permission to create enquiries.");
      }
    }

    const body = await validateJson(createEnquirySchema, request);

    const actor = {
      userId: context.dbUser.id,
      userName: context.dbUser.name || context.dbUser.email || (context.isAgencyOwner ? "Agency Owner" : "Staff Member"),
      role: context.dbUser.role,
    };
    const newEnquiry = await enquiryService.createEnquiry(context.agencyId, body, actor);

    return apiCreated(newEnquiry);
  } catch (error) {
    return handleApiError(error);
  }
}
