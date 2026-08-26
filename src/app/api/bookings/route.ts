import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  apiCreated,
  handleApiError,
  validateJson,
  validateQueryParams,
} from "@/lib/api";
import {
  createBookingSchema,
  bookingQuerySchema,
} from "@/lib/validation/booking-schema";
import { bookingService } from "@/lib/services/booking-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/bookings
 * List bookings with filters and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
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
    const context = await requireWriteAccess();
    const body = await validateJson(createBookingSchema, request);

    const newBooking = await bookingService.createBooking(context.agencyId, body);

    return apiCreated(newBooking);
  } catch (error) {
    return handleApiError(error);
  }
}
