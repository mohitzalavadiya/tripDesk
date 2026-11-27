import {
  apiCreated,
  apiSuccess,
  enforceStaffPermission,
  handleApiError,
  requireReadAccess,
  requireWriteAccess,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { operationsService } from "@/lib/services/operations-service";
import { createActivityConfirmationSchema } from "@/lib/validation/operations-schema";
import { NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const idParamSchema = z.object({
  id: z.string().min(1, "Operation ID is required"),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/operations/[id]/activities
 * Lists all activity confirmations for an operation.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "OPERATIONS", "VIEW");
    const { id } = validateRouteParams(idParamSchema, await props.params);

    const list = await operationsService.listActivityConfirmations(
      context.agencyId,
      id
    );

    return apiSuccess(list);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/operations/[id]/activities
 * Adds an activity confirmation to the operation.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "OPERATIONS", "UPDATE");
    const { id } = validateRouteParams(idParamSchema, await props.params);
    const body = await validateJson(createActivityConfirmationSchema, request);

    const confirmation = await operationsService.upsertActivityConfirmation(
      context.agencyId,
      id,
      body,
      context.dbUser.id
    );

    return apiCreated(confirmation);
  } catch (error) {
    return handleApiError(error);
  }
}
