import {
  apiSuccess,
  ForbiddenError,
  handleApiError,
  requireReadAccess,
  staffPermissionService,
} from "@/lib/api";
import { redactStaffFinancials } from "@/lib/auth/permissions";
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
    if (context.isAgencyStaff) {
      const [canViewBookings, canViewFinance] = await Promise.all([
        staffPermissionService.hasStaffPermission(
          context.dbUser.role,
          context.agencyId,
          context.dbUser.id,
          "BOOKINGS",
          "VIEW"
        ),
        staffPermissionService.hasStaffPermission(
          context.dbUser.role,
          context.agencyId,
          context.dbUser.id,
          "FINANCE",
          "VIEW"
        ),
      ]);
      if (!canViewBookings && !canViewFinance) {
        throw new ForbiddenError("You do not have permission to view booking financial details.");
      }
    }
    const { id } = await params;

    const breakdown = await financeService.getBookingFinanceBreakdown(
      context.agencyId,
      id
    );

    return apiSuccess(redactStaffFinancials(breakdown, context.dbUser.role));
  } catch (error) {
    return handleApiError(error);
  }
}
