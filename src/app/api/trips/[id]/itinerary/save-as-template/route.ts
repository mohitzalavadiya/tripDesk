import {
  enforceStaffPermission,
apiCreated,
handleApiError,
requireWriteAccess,
validateJson,
validateRouteParams,
} from "@/lib/api";
import { itineraryService } from "@/lib/services/itinerary-service";
import { saveAsTemplateInputSchema } from "@/lib/validation/itinerary-schema";
import { tripIdParamSchema } from "@/lib/validation/trip-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/trips/[id]/itinerary/save-as-template
 * Saves content from current trip as a reusable DAY or PACKAGE template.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "CREATE");
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);
    const body = await validateJson(saveAsTemplateInputSchema, request);

    const template = await itineraryService.saveAsTemplate(
      context.agencyId,
      id,
      body
    );

    return apiCreated(template);
  } catch (error) {
    return handleApiError(error);
  }
}
