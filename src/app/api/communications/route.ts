import {
  apiSuccess,
  ForbiddenError,
  handleApiError,
  requireReadAccess,
  requireWriteAccess,
  validateJson,
  validateQueryParams,
} from "@/lib/api";
import { communicationService } from "@/lib/services/communication-service";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import {
  listCommunicationLogsSchema,
  sendManualMessageSchema,
} from "@/lib/validation/communication-schema";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/communications
 * List communication audit logs & summary stats for the authenticated agency
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
        throw new ForbiddenError("You do not have permission to view communications.");
      }
    }

    const queryParams = validateQueryParams(
      listCommunicationLogsSchema,
      request.nextUrl.searchParams
    );

    const [result, summary] = await Promise.all([
      communicationService.listCommunicationLogs(context.agencyId, queryParams),
      communicationService.getCommunicationSummary(context.agencyId),
    ]);

    return apiSuccess({
      ...result,
      summary,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/communications
 * Create and dispatch a manual customer communication
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();

    if (context.isAgencyStaff) {
      const canCreate = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "COMMUNICATIONS",
        "CREATE"
      );
      if (!canCreate) {
        throw new ForbiddenError("You do not have permission to send communications.");
      }
    }

    const body = await validateJson(sendManualMessageSchema, request);

    const result = await communicationService.sendManualMessage(
      context.agencyId,
      body
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: "Customer communication dispatched successfully.",
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
