import {
  enforceStaffPermission,
apiSuccess,
handleApiError,
requireWriteAccess,
validateJson,
validateRouteParams,
} from "@/lib/api";
import { itineraryService } from "@/lib/services/itinerary-service";
import { applyPackageTemplateInputSchema } from "@/lib/validation/itinerary-schema";
import { tripIdParamSchema } from "@/lib/validation/trip-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/trips/[id]/itinerary/apply-package-template
 * Applies a Package Template via APPEND or REPLACE mode.
 * Preserves all operational and financial records.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "CREATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(applyPackageTemplateInputSchema, request);

    const result = await itineraryService.applyPackageTemplate(
      context.agencyId,
      id,
      body.templateId,
      body.mode
    );

    return apiSuccess({
      message:
        body.mode === "REPLACE"
          ? `Package template applied: itinerary replaced with ${result.addedCount} items.`
          : `Package template applied: ${result.addedCount} items appended to itinerary.`,
      result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
