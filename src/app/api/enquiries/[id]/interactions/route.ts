import {
  apiCreated,
  ForbiddenError,
  handleApiError,
  requireMemberWriteAccess,
  validateJson,
} from "@/lib/api";
import { enquiryService } from "@/lib/services/enquiry-service";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import { quickLogInteractionSchema } from "@/lib/validation/enquiry-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/enquiries/[id]/interactions
 * Quick-log an interaction against an enquiry (Call, WhatsApp, Email, Meeting).
 * Supports completing an active pending follow-up task and scheduling the next follow-up.
 * Governed by FOLLOW_UPS.logInteraction permission for agency staff.
 * Enforces requireWriteAccess via requireMemberWriteAccess with staff permission validation.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireMemberWriteAccess();

    if (context.isAgencyStaff) {
      const canLog = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "FOLLOW_UPS",
        "LOGINTERACTION"
      );
      if (!canLog) {
        throw new ForbiddenError("You do not have permission to log interactions or complete follow-ups.");
      }
    }

    const { id: enquiryId } = await params;
    const body = await validateJson(quickLogInteractionSchema, request);

    const result = await enquiryService.logInteraction(
      context.agencyId,
      enquiryId,
      body,
      context.dbUser.id,
      {
        userId: context.dbUser.id,
        userName: context.dbUser.name || context.dbUser.email || (context.isAgencyOwner ? "Agency Owner" : "Staff Member"),
        role: context.dbUser.role,
      }
    );

    return apiCreated(result);
  } catch (error) {
    return handleApiError(error);
  }
}
