import {
apiSuccess,
handleApiError,
requireReadAccess,
validateQueryParams,
} from "@/lib/api";
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
    const query = validateQueryParams(rateLookupQuerySchema, request.nextUrl.searchParams);

    const result = await rateSheetService.getApplicableHotelRate(
      context.agencyId,
      query.inventoryId,
      query.date,
      query.roomType,
      query.mealPlan
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
