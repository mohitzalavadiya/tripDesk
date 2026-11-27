import {
  apiCreated,
  apiSuccess,
  ForbiddenError,
  handleApiError,
  requireMemberReadAccess,
  requireMemberWriteAccess,
  validateJson,
  validateQueryParams,
} from "@/lib/api";
import { bookingService } from "@/lib/services/booking-service";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import {
  bookingQuerySchema,
  createBookingSchema,
} from "@/lib/validation/booking-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/bookings
 * List bookings with filters and pagination.
 * Evaluates requireReadAccess() and requireWriteAccess() via member access guards.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireMemberReadAccess();

    if (context.isAgencyStaff) {
      const canView = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "BOOKINGS",
        "VIEW"
      );
      if (!canView) {
        throw new ForbiddenError("You do not have permission to view bookings.");
      }
    }

    const queryParams = validateQueryParams(bookingQuerySchema, request.nextUrl.searchParams);
    const result = await bookingService.getBookings(context.agencyId, queryParams);

    return apiSuccess(result.data, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/bookings
 * Create a new manual booking.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireMemberWriteAccess();

    if (context.isAgencyStaff) {
      const canCreate = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "BOOKINGS",
        "CREATE"
      );
      if (!canCreate) {
        throw new ForbiddenError("You do not have permission to create bookings.");
      }
    }

    const body = await validateJson(createBookingSchema, request);
    const newBooking = await bookingService.createBooking(context.agencyId, body);

    return apiCreated(newBooking);
  } catch (error) {
    return handleApiError(error);
  }
}
