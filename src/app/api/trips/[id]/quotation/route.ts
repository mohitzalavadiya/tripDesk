import {
  enforceStaffPermission,
apiCreated,
apiSuccess,
handleApiError,
requireReadAccess,
requireWriteAccess,
validateJson,
} from "@/lib/api";
import {
  redactStaffFinancials,
  toStaffSafeQuotationListDTO,
} from "@/lib/auth/permissions";
import { quotationService } from "@/lib/services/quotation-service";
import { hasFinancialMarginsAccess, staffPermissionService } from "@/lib/services/staff-permission-service";
import { tripCostingService } from "@/lib/services/trip-costing-service";
import { generateTripQuotationSchema } from "@/lib/validation/quotation-schema";
import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/trips/[id]/quotation
 * Returns live trip costing and all existing quotations for the trip.
 * Supports ?includeCosting=false to bypass heavy rate-sheet costing when only previewing quotations.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "QUOTATIONS", "VIEW");
    const { id: tripId } = await params;
    const { searchParams } = new URL(request.url);
    const hasMarginAccess = await hasFinancialMarginsAccess(context.dbUser.role, context.agencyId, context.dbUser.id);
    const includeCosting = hasMarginAccess && searchParams.get("includeCosting") !== "false";

    if (!includeCosting) {
      // Lightweight path for Proposal Preview, quotation viewers, and AGENCY_STAFF:
      const [trip, quotations] = await Promise.all([
        prisma.trip.findFirst({
          where: { id: tripId, agencyId: context.agencyId, archivedAt: null },
          select: { id: true },
        }),
        quotationService.getQuotations(context.agencyId, {
          tripId,
          limit: 50,
          page: 1,
          sortBy: "createdAt",
          sortOrder: "desc",
        }),
      ]);

      if (!trip) {
        return handleApiError({
          statusCode: 404,
          code: "NOT_FOUND",
          message: "Trip not found.",
        });
      }

      const returnedQuotations = hasMarginAccess
        ? quotations.data
        : toStaffSafeQuotationListDTO(quotations.data);

      return apiSuccess({
        costing: null,
        quotations: returnedQuotations,
      });
    }

    // Full costing calculation path for Costing Editor:
    const [costing, quotations] = await Promise.all([
      tripCostingService.calculateTripCosting(context.agencyId, tripId),
      quotationService.getQuotations(context.agencyId, {
        tripId,
        limit: 50,
        page: 1,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
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
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "QUOTATIONS", "CREATE");
    const { id: tripId } = await params;
    const body = await validateJson(generateTripQuotationSchema, request);

    const quotation = await quotationService.generateQuotationFromTrip(context.agencyId, tripId, body);

    return apiCreated(quotation);
  } catch (error) {
    return handleApiError(error);
  }
}
