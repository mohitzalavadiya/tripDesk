import {
  apiSuccess,
  ForbiddenError,
  handleApiError,
  requireReadAccess,
} from "@/lib/api";
import { financeService } from "@/lib/services/finance-service";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import { NextRequest } from "next/server";

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

    if (context.dbUser.role === "AGENCY_STAFF") {
      const canViewBooking = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "BOOKINGS",
        "VIEW"
      );
      const canViewFinance = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "FINANCE",
        "VIEW"
      );
      if (!canViewBooking && !canViewFinance) {
        throw new ForbiddenError("You do not have permission to view payment milestones.");
      }
    }

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
