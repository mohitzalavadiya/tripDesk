import {
apiSuccess,
handleApiError,
requireReadAccess,
} from "@/lib/api";
import { financeService } from "@/lib/services/finance-service";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/finance/bookings/[id]
 * Get detailed booking-level financial breakdown (profit, payments, supplier costs, expenses).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const breakdown = await financeService.getBookingFinanceBreakdown(
      context.agencyId,
      id
    );

    return apiSuccess(breakdown);
  } catch (error) {
    return handleApiError(error);
  }
}
