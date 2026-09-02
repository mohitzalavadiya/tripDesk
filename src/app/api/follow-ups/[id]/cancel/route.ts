import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { cancelFollowUpSchema } from "@/lib/validation/follow-up-schema";
import { followUpService } from "@/lib/services/follow-up-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/follow-ups/[id]/cancel
 * Cancel a follow-up with reason.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(cancelFollowUpSchema, request);

    const result = await followUpService.cancelFollowUp(context.agencyId, id, body);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
