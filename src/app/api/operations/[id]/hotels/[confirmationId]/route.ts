import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { updateHotelConfirmationSchema } from "@/lib/validation/operations-schema";
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
 * PATCH /api/operations/[id]/hotels/[confirmationId]
 * Updates a hotel confirmation (status, voucher/confirmation#, dates, room details).
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, confirmationId } = validateRouteParams(
      paramsSchema,
      await props.params
    );
    const body = await validateJson(updateHotelConfirmationSchema, request);

    const updated = await operationsService.updateHotelConfirmation(
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
