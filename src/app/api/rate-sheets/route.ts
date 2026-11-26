import {
apiCreated,
apiSuccess,
ConflictError,
handleApiError,
requireReadAccess,
requireWriteAccess,
  enforceStaffPermission,
  requireAgencyOwnerContext,
validateJson,
validateQueryParams,
} from "@/lib/api";
import { redactStaffFinancials } from "@/lib/auth/permissions";
import { rateSheetService } from "@/lib/services/rate-sheet-service";
import {
createRateSheetSchema,
rateSheetQuerySchema,
} from "@/lib/validation/rate-sheet-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/rate-sheets
 * Retrieves paginated rate sheets strictly scoped to the authenticated agency.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "RATE_SHEETS", "VIEW");
    const queryParams = validateQueryParams(rateSheetQuerySchema, request.nextUrl.searchParams);

    const result = await rateSheetService.listRateSheets(context.agencyId, queryParams);

    const items = context.isAgencyStaff ? redactStaffFinancials(result.items, context.dbUser.role) : result.items;
    return apiSuccess(items, 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/rate-sheets
 * Creates a new rate sheet record under the authenticated agency with sequential RAT-YYYY-XXXXX number.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "RATE_SHEETS", "CREATE");
    const body = await validateJson(createRateSheetSchema, request);

    // Overlap validation check
    const overlapCheck = await rateSheetService.validateRateOverlap(context.agencyId, {
      inventoryType: "HOTEL",
      hotelId: body.hotelId,
      roomType: body.roomType,
      mealPlan: body.mealPlan,
      validFrom: new Date(body.validFrom),
      validTo: new Date(body.validTo),
      priority: body.priority,
    });

    if (overlapCheck.hasOverlap && body.priority === 0) {
      // If priority is default 0 and exact match overlap exists
      const conflictNames = overlapCheck.overlappingRates.map((r) => r.name).join(", ");
      throw new ConflictError(
        `Conflicting rate sheet (${conflictNames}) already active for this period. Please assign a different priority or adjust validity dates.`
      );
    }

    const newRateSheet = await rateSheetService.createRateSheet(context.agencyId, body);

    return apiCreated(newRateSheet);
  } catch (error) {
    return handleApiError(error);
  }
}
