import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
  validateRouteParams,
  NotFoundError,
} from "@/lib/api";
import {
  updateRateSheetSchema,
  rateSheetIdParamSchema,
} from "@/lib/validation/rate-sheet-schema";
import { rateSheetService } from "@/lib/services/rate-sheet-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/rate-sheets/[id]
 * Retrieves single rate sheet with inventory and supplier relations.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id } = validateRouteParams(rateSheetIdParamSchema, await props.params);

    const rateSheet = await rateSheetService.getRateSheetById(context.agencyId, id);

    if (!rateSheet) {
      throw new NotFoundError("Rate Sheet");
    }

    return apiSuccess(rateSheet);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/rate-sheets/[id]
 * Updates an existing rate sheet record under the authenticated agency.
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(rateSheetIdParamSchema, await props.params);
    const body = await validateJson(updateRateSheetSchema, request);

    const updatedRateSheet = await rateSheetService.updateRateSheet(context.agencyId, id, body);

    return apiSuccess(updatedRateSheet);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/rate-sheets/[id]
 * Soft-deletes (archives) a rate sheet record.
 */
export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(rateSheetIdParamSchema, await props.params);

    const archivedRateSheet = await rateSheetService.archiveRateSheet(context.agencyId, id);

    return apiSuccess({
      message: "Rate sheet archived successfully.",
      rateSheet: archivedRateSheet,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
