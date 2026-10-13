import {
apiSuccess,
handleApiError,
requireWriteAccess,
validateJson,
} from "@/lib/api";
import { followUpService } from "@/lib/services/follow-up-service";
import { rescheduleFollowUpSchema } from "@/lib/validation/follow-up-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/follow-ups/[id]/reschedule
 * Reschedule a follow-up to a new date/time.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(rescheduleFollowUpSchema, request);

    const result = await followUpService.rescheduleFollowUp(context.agencyId, id, body);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
