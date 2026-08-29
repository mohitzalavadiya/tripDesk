import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { updateTripOperationSchema } from "@/lib/validation/operations-schema";
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
 * GET /api/operations/[id]
 * Retrieves single operation details with related components, issues, and timeline.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id } = validateRouteParams(idParamSchema, await props.params);

    const operation = await operationsService.getOperationById(
      context.agencyId,
      id
    );

    return apiSuccess(operation);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/operations/[id]
 * Updates operational metadata, status, or coordinator.
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(idParamSchema, await props.params);
    const body = await validateJson(updateTripOperationSchema, request);

    const updated = await operationsService.updateOperation(
      context.agencyId,
      id,
      body,
      context.dbUser.id
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
