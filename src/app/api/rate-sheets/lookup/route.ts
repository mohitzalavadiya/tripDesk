import { NextRequest } from "next/server";
import {
  requireReadAccess,
  apiSuccess,
  handleApiError,
  validateQueryParams,
} from "@/lib/api";
import { rateLookupQuerySchema } from "@/lib/validation/rate-sheet-schema";
import { rateSheetService } from "@/lib/services/rate-sheet-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/rate-sheets/lookup
 * Dynamic rate resolution engine endpoint: resolves applicable purchase rate for a travel date.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const query = validateQueryParams(rateLookupQuerySchema, request.nextUrl.searchParams);

    let result;
    if (query.inventoryType === "HOTEL") {
      result = await rateSheetService.getApplicableHotelRate(
        context.agencyId,
        query.inventoryId,
        query.date,
        query.roomType,
        query.mealPlan
      );
    } else if (query.inventoryType === "VEHICLE") {
      result = await rateSheetService.getApplicableVehicleRate(
        context.agencyId,
        query.inventoryId,
        query.date,
        query.pricingType
      );
    } else if (query.inventoryType === "ACTIVITY") {
      result = await rateSheetService.getApplicableActivityRate(
        context.agencyId,
        query.inventoryId,
        query.date
      );
    }

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
