import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  apiCreated,
  handleApiError,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { createOperationEventSchema } from "@/lib/validation/operations-schema";
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
 * GET /api/operations/[id]/timeline
 * Retrieves the event history/timeline for the operation.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id } = validateRouteParams(idParamSchema, await props.params);

    const timeline = await operationsService.getTimeline(
      context.agencyId,
      id
    );

    return apiSuccess(timeline);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/operations/[id]/timeline
 * Adds a custom event/note to the operation timeline.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(idParamSchema, await props.params);
    const body = await validateJson(createOperationEventSchema, request);

    const newEvent = await operationsService.logEvent(
      context.agencyId,
      id,
      {
        ...body,
        createdBy: body.createdBy || context.dbUser.id,
      }
    );

    return apiCreated(newEvent);
  } catch (error) {
    return handleApiError(error);
  }
}
