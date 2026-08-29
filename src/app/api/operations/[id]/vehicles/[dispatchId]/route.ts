import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { updateVehicleDispatchSchema } from "@/lib/validation/operations-schema";
import { operationsService } from "@/lib/services/operations-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().min(1, "Operation ID is required"),
  dispatchId: z.string().min(1, "Dispatch ID is required"),
});

interface RouteProps {
  params: Promise<{ id: string; dispatchId: string }>;
}

/**
 * PATCH /api/operations/[id]/vehicles/[dispatchId]
 * Updates vehicle dispatch details (driver, phone, status, timings).
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, dispatchId } = validateRouteParams(
      paramsSchema,
      await props.params
    );
    const body = await validateJson(updateVehicleDispatchSchema, request);

    const updated = await operationsService.updateVehicleDispatch(
      context.agencyId,
      id,
      dispatchId,
      body,
      context.dbUser.id
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
