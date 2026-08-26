import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  apiCreated,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { generateTripQuotationSchema } from "@/lib/validation/quotation-schema";
import { quotationService } from "@/lib/services/quotation-service";
import { tripCostingService } from "@/lib/services/trip-costing-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trips/[id]/quotation
 * Returns live trip costing and all existing quotations for the trip.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id: tripId } = await params;

    const [costing, quotations] = await Promise.all([
      tripCostingService.calculateTripCosting(context.agencyId, tripId),
      quotationService.getQuotations(context.agencyId, { tripId, limit: 50, page: 1, sortBy: "createdAt", sortOrder: "desc" }),
    ]);

    if (!costing) {
      return handleApiError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Trip not found.",
      });
    }

    return apiSuccess({
      costing,
      quotations: quotations.data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/trips/[id]/quotation
 * Generates a new quotation snapshot from the current trip resource assignments.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: tripId } = await params;
    const body = await validateJson(generateTripQuotationSchema, request);

    const quotation = await quotationService.generateQuotationFromTrip(context.agencyId, tripId, body);

    return apiCreated(quotation);
  } catch (error) {
    return handleApiError(error);
  }
}
