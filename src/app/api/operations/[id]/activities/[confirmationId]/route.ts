import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { updateActivityConfirmationSchema } from "@/lib/validation/operations-schema";
import { operationsService } from "@/lib/services/operations-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().min(1, "Operation ID is required"),
  confirmationId: z.string().min(1, "Confirmation ID is required"),
});

interface RouteProps {
  params: Promise<{ id: string; confirmationId: string }>;
}

/**
 * GET /api/operations/[id]/activities/[confirmationId]
 * Retrieves single activity confirmation details.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id, confirmationId } = validateRouteParams(
      paramsSchema,
      await props.params
    );

    const confirmation = await operationsService.getActivityConfirmation(
      context.agencyId,
      id,
      confirmationId
    );

    return apiSuccess(confirmation);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/operations/[id]/activities/[confirmationId]
 * Updates activity confirmation details (status, voucher#, confirmation#).
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, confirmationId } = validateRouteParams(
      paramsSchema,
      await props.params
    );
    const body = await validateJson(updateActivityConfirmationSchema, request);

    const updated = await operationsService.updateActivityConfirmation(
      context.agencyId,
      id,
      confirmationId,
      body,
      context.dbUser.id
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
