import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
  NotFoundError,
} from "@/lib/api";
import { updateVehicleSchema } from "@/lib/validation/vehicle-schema";
import { vehicleService } from "@/lib/services/vehicle-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/vehicles/[id]
 * Retrieves a single vehicle master record by ID.
 * Strictly enforces agency tenancy.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const vehicle = await vehicleService.getVehicleById(context.agencyId, id);

    if (!vehicle) {
      throw new NotFoundError("Vehicle not found or does not belong to your agency.");
    }

    return apiSuccess(vehicle);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/vehicles/[id]
 * Updates an existing vehicle master record.
 * Enforces workspace write access.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(updateVehicleSchema, request);

    const updatedVehicle = await vehicleService.updateVehicle(context.agencyId, id, body);

    return apiSuccess(updatedVehicle);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/vehicles/[id]
 * Soft-deletes (archives) an existing vehicle master record.
 * Enforces workspace write access.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;

    const archivedVehicle = await vehicleService.archiveVehicle(context.agencyId, id);

    return apiSuccess({ message: "Vehicle archived successfully.", vehicle: archivedVehicle });
  } catch (error) {
    return handleApiError(error);
  }
}
