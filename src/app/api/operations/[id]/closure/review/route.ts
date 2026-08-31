import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { postTourReviewSchema } from "@/lib/validation/operations-schema";
import { operationsService } from "@/lib/services/operations-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const idParamSchema = z.object({
  id: z.string().min(1, "Operation ID is required"),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/operations/[id]/closure/review
 * Records or updates the post-tour quality review.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(idParamSchema, await props.params);
    const body = await validateJson(postTourReviewSchema, request);

    const event = await operationsService.savePostTourReview(
      context.agencyId,
      id,
      body,
      context.dbUser.id
    );

    return apiSuccess(event);
  } catch (error) {
    return handleApiError(error);
  }
}
