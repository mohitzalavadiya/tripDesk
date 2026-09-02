import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
} from "@/lib/api";
import { bookingService } from "@/lib/services/booking-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/bookings/[id]/initialize-operations
 * Explicitly initializes or syncs the operations workspace for a booking.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;

    const result = await bookingService.initializeOperationsForBooking(
      context.agencyId,
      id
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
