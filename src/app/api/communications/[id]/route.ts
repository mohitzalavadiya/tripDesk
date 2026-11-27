import {
  apiSuccess,
  ForbiddenError,
  handleApiError,
  NotFoundError,
  requireReadAccess,
} from "@/lib/api";
import { communicationService } from "@/lib/services/communication-service";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import { NextRequest } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

/**
 * GET /api/communications/[id]
 * Get single communication details for the authenticated agency
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();

    if (context.isAgencyStaff) {
      const canView = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "COMMUNICATIONS",
        "VIEW"
      );
      if (!canView) {
        throw new ForbiddenError("You do not have permission to view communication details.");
      }
    }

    const { id } = await params;

    const result = await communicationService.getCommunicationDetails(
      context.agencyId,
      id
    );

    if (!result) {
      throw new NotFoundError("Communication record");
    }

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

