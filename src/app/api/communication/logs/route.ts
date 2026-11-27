import {
  apiSuccess,
  ForbiddenError,
  handleApiError,
  requireReadAccess,
  validateQueryParams,
} from "@/lib/api";
import { communicationService } from "@/lib/services/communication-service";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import { listCommunicationLogsSchema } from "@/lib/validation/communication-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/communication/logs
 * List communication audit logs for the authenticated agency
 */
export async function GET(request: NextRequest) {
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
        throw new ForbiddenError("You do not have permission to view communication logs.");
      }
    }

    const queryParams = validateQueryParams(listCommunicationLogsSchema, request.nextUrl.searchParams);

    const result = await communicationService.listCommunicationLogs(context.agencyId, queryParams);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
