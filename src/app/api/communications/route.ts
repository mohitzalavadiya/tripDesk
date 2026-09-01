import { NextRequest, NextResponse } from "next/server";
import {
  requireAgencyOwnerContext,
  apiSuccess,
  handleApiError,
  validateQueryParams,
  validateJson,
} from "@/lib/api";
import { communicationService } from "@/lib/services/communication-service";
import {
  listCommunicationLogsSchema,
  sendManualMessageSchema,
} from "@/lib/validation/communication-schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/communications
 * List communication audit logs & summary stats for the authenticated agency
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireAgencyOwnerContext();
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
    const context = await requireAgencyOwnerContext();
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
