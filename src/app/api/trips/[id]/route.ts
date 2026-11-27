import {
  apiSuccess,
  ForbiddenError,
  handleApiError,
  NotFoundError,
  enforceStaffPermission,
  requireMemberReadAccess,
  requireMemberWriteAccess,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import { tripService } from "@/lib/services/trip-service";
import {
  tripIdParamSchema,
  updateTripSchema,
} from "@/lib/validation/trip-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trips/[id]
 * Retrieves a single trip record by ID with related Customer, Travelers, and Itinerary items.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireMemberReadAccess();

    if (context.isAgencyStaff) {
      const canView = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "TRIPS",
        "VIEW"
      );
      if (!canView) {
        throw new ForbiddenError("You do not have permission to view trips.");
      }
    }

    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const trip = await tripService.getTripById(context.agencyId, id);

    if (!trip) {
      throw new NotFoundError("Trip");
    }

    return apiSuccess(trip);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/trips/[id]
 * Updates an existing trip record under the authenticated agency.
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireMemberWriteAccess();

    if (context.isAgencyStaff) {
      const canUpdate = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "TRIPS",
        "UPDATE"
      );
      if (!canUpdate) {
        throw new ForbiddenError("You do not have permission to update trips.");
      }
    }

    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(updateTripSchema, request);

    const updatedTrip = await tripService.updateTrip(context.agencyId, id, body);

    return apiSuccess(updatedTrip);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/trips/[id]
 * Soft-deletes (archives) a trip record by setting archivedAt.
 * Agency Owner only. Destructive deletion is restricted to Agency Owners.
 */
export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireMemberWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "TRIP_DETAIL", "DELETE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);

    const archivedTrip = await tripService.archiveTrip(context.agencyId, id);

    return apiSuccess({
      message: "Trip archived successfully.",
      trip: archivedTrip,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
