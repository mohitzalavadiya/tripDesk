import { NextRequest } from "next/server";
import {
  requireAgencyOwnerContext,
  apiSuccess,
  handleApiError,
  validateQueryParams,
} from "@/lib/api";
import { communicationService } from "@/lib/services/communication-service";
import { listCommunicationLogsSchema } from "@/lib/validation/communication-schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/communication/logs
 * List communication audit logs for the authenticated agency
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireAgencyOwnerContext();
    const queryParams = validateQueryParams(listCommunicationLogsSchema, request.nextUrl.searchParams);

    const result = await communicationService.listCommunicationLogs(context.agencyId, queryParams);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
