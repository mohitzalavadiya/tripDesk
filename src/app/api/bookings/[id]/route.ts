import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { updateBookingSchema } from "@/lib/validation/booking-schema";
import { bookingService } from "@/lib/services/booking-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bookings/[id]
 * Get single booking with customer, trip, quotation, and payments.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const booking = await bookingService.getBooking(context.agencyId, id);
    if (!booking) {
      return handleApiError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Booking not found.",
      });
    }

    return apiSuccess(booking);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/bookings/[id]
 * Update booking status, dates, financial total, or notes.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(updateBookingSchema, request);

    const updated = await bookingService.updateBooking(context.agencyId, id, body);

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/bookings/[id]
 * Soft delete / archive booking.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;

    await bookingService.archiveBooking(context.agencyId, id);

    return apiSuccess({ success: true, message: "Booking archived successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
