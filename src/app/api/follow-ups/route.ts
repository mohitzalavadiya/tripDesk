import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  apiCreated,
  handleApiError,
  validateJson,
  validateQueryParams,
} from "@/lib/api";
import {
  globalFollowUpQuerySchema,
  createGlobalFollowUpSchema,
} from "@/lib/validation/follow-up-schema";
import { followUpService } from "@/lib/services/follow-up-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/follow-ups
 * List global follow-ups across all agency enquiries with scopes (overdue, today, upcoming, completed, all).
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const queryParams = validateQueryParams(globalFollowUpQuerySchema, request.nextUrl.searchParams);

    const result = await followUpService.getGlobalFollowUps(context.agencyId, queryParams);

    return apiSuccess(result.data, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/follow-ups
 * Create a new follow-up interaction for an enquiry.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(createGlobalFollowUpSchema, request);

    const newFollowUp = await followUpService.createFollowUp(context.agencyId, body);

    return apiCreated(newFollowUp);
  } catch (error) {
    return handleApiError(error);
  }
}
