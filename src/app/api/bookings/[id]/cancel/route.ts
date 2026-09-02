import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { z } from "zod";
import { bookingService } from "@/lib/services/booking-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const cancelBookingSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required"),
});

/**
 * POST /api/bookings/[id]/cancel
 * Cancels a booking with reason, enforces finalization lock, and triggers audit event & notification.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(cancelBookingSchema, request);

    const cancelled = await bookingService.cancelBooking(
      context.agencyId,
      id,
      body.reason
    );

    return apiSuccess(cancelled);
  } catch (error) {
    return handleApiError(error);
  }
}
