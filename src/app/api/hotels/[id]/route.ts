import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
  NotFoundError,
} from "@/lib/api";
import { updateHotelSchema } from "@/lib/validation/hotel-schema";
import { hotelService } from "@/lib/services/hotel-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/hotels/[id]
 * Retrieves a single hotel master record by ID.
 * Strictly enforces agency tenancy.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const hotel = await hotelService.getHotelById(context.agencyId, id);

    if (!hotel) {
      throw new NotFoundError("Hotel not found or does not belong to your agency.");
    }

    return apiSuccess(hotel);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/hotels/[id]
 * Updates an existing hotel master record.
 * Enforces workspace write access.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(updateHotelSchema, request);

    const updatedHotel = await hotelService.updateHotel(context.agencyId, id, body);

    return apiSuccess(updatedHotel);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/hotels/[id]
 * Soft-deletes (archives) an existing hotel master record.
 * Enforces workspace write access.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;

    const archivedHotel = await hotelService.archiveHotel(context.agencyId, id);

    return apiSuccess({ message: "Hotel archived successfully.", hotel: archivedHotel });
  } catch (error) {
    return handleApiError(error);
  }
}
