import {
  enforceStaffPermission,
apiSuccess,
handleApiError,
requireWriteAccess,
validateJson,
validateRouteParams,
} from "@/lib/api";
import { itineraryService } from "@/lib/services/itinerary-service";
import { applyDayTemplateInputSchema } from "@/lib/validation/itinerary-schema";
import { tripIdParamSchema } from "@/lib/validation/trip-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/trips/[id]/itinerary/apply-day-template
 * Applies a Day Template to a specific trip day.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "CREATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(applyDayTemplateInputSchema, request);

    const items = await itineraryService.applyDayTemplate(
      context.agencyId,
      id,
      body.targetDayNumber,
      body.templateId
    );

    return apiSuccess({
      message: `Day template applied successfully to Day ${body.targetDayNumber}.`,
      items,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
