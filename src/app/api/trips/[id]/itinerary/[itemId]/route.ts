import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
  validateRouteParams,
  NotFoundError,
} from "@/lib/api";
import {
  updateItineraryItemSchema,
  itineraryRouteParamsSchema,
} from "@/lib/validation/itinerary-schema";
import { itineraryService } from "@/lib/services/itinerary-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string; itemId: string }>;
}

/**
 * GET /api/trips/[id]/itinerary/[itemId]
 * Retrieves a single itinerary item record by ID.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id, itemId } = validateRouteParams(
      itineraryRouteParamsSchema,
      await props.params
    );

    const item = await itineraryService.getItineraryItemById(context.agencyId, id, itemId);

    if (!item) {
      throw new NotFoundError("Itinerary item");
    }

    return apiSuccess(item);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/trips/[id]/itinerary/[itemId]
 * Updates an existing itinerary item under a trip.
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, itemId } = validateRouteParams(
      itineraryRouteParamsSchema,
      await props.params
    );
    const body = await validateJson(updateItineraryItemSchema, request);

    const updatedItem = await itineraryService.updateItineraryItem(
      context.agencyId,
      id,
      itemId,
      body
    );

    return apiSuccess(updatedItem);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/trips/[id]/itinerary/[itemId]
 * Removes an itinerary item from a trip.
 */
export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id, itemId } = validateRouteParams(
      itineraryRouteParamsSchema,
      await props.params
    );

    const deletedItem = await itineraryService.deleteItineraryItem(
      context.agencyId,
      id,
      itemId
    );

    return apiSuccess({
      message: "Itinerary item deleted successfully.",
      item: deletedItem,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
