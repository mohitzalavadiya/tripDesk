import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
  NotFoundError,
} from "@/lib/api";
import { updateDestinationSchema } from "@/lib/validation/destination-schema";
import { destinationService } from "@/lib/services/destination-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/destinations/[id]
 * Retrieves a single destination master record by ID.
 * Strictly enforces agency tenancy.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const destination = await destinationService.getDestinationById(context.agencyId, id);

    if (!destination) {
      throw new NotFoundError("Destination not found or does not belong to your agency.");
    }

    return apiSuccess(destination);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/destinations/[id]
 * Updates an existing destination master record.
 * Enforces workspace write access.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(updateDestinationSchema, request);

    const updatedDestination = await destinationService.updateDestination(context.agencyId, id, body);

    return apiSuccess(updatedDestination);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/destinations/[id]
 * Deletes a destination record only if not referenced by Hotels, Activities, or TripDestinations.
 * Enforces workspace write access.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;

    const deleted = await destinationService.deleteDestination(context.agencyId, id);

    return apiSuccess({ message: "Destination deleted successfully.", destination: deleted });
  } catch (error) {
    return handleApiError(error);
  }
}
