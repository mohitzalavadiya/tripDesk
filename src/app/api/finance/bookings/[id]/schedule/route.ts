import { NextRequest } from "next/server";
import {
  requireReadAccess,
  apiSuccess,
  handleApiError,
} from "@/lib/api";
import { financeService } from "@/lib/services/finance-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/finance/bookings/[id]/schedule
 * Get live payment milestone schedule and waterfall allocation for a booking.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const schedule = await financeService.getBookingPaymentSchedule(
      context.agencyId,
      id
    );

    return apiSuccess(schedule);
  } catch (error) {
    return handleApiError(error);
  }
}
