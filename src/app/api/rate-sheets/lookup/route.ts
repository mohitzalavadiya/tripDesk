import {
  apiSuccess,
  ForbiddenError,
  handleApiError,
  requireReadAccess,
  staffPermissionService,
  validateQueryParams,
} from "@/lib/api";
import { redactStaffFinancials } from "@/lib/auth/permissions";
import { rateSheetService } from "@/lib/services/rate-sheet-service";
import { rateLookupQuerySchema } from "@/lib/validation/rate-sheet-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/rate-sheets/lookup
 * Dynamic rate resolution engine endpoint: resolves applicable hotel purchase rate for a travel date.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    if (context.isAgencyStaff) {
      const [canViewRates, canViewCosting] = await Promise.all([
        staffPermissionService.hasStaffPermission(
          context.dbUser.role,
          context.agencyId,
          context.dbUser.id,
          "RATE_SHEETS",
          "VIEW"
        ),
        staffPermissionService.hasStaffPermission(
          context.dbUser.role,
          context.agencyId,
          context.dbUser.id,
          "TRIP_COSTING",
          "VIEW"
        ),
      ]);
      if (!canViewRates && !canViewCosting) {
        throw new ForbiddenError("You do not have permission to look up rate sheets.");
      }
    }
    const query = validateQueryParams(rateLookupQuerySchema, request.nextUrl.searchParams);

    const result = await rateSheetService.getApplicableHotelRate(
      context.agencyId,
      query.inventoryId,
      query.date,
      query.roomType,
      query.mealPlan
    );

    return apiSuccess(redactStaffFinancials(result, context.dbUser.role));
  } catch (error) {
    return handleApiError(error);
  }
}
