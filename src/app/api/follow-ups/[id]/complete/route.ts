import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { completeFollowUpSchema } from "@/lib/validation/follow-up-schema";
import { followUpService } from "@/lib/services/follow-up-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/follow-ups/[id]/complete
 * Complete a follow-up with outcome notes and optionally schedule the next follow-up.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(completeFollowUpSchema, request);

    const result = await followUpService.completeFollowUp(context.agencyId, id, body, context.dbUser.id);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
