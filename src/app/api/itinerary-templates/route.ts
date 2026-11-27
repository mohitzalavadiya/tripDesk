import {
apiCreated,
apiSuccess,
handleApiError,
requireReadAccess,
requireWriteAccess,
  enforceStaffPermission,
validateJson,
validateQueryParams,
} from "@/lib/api";
import { itineraryTemplateService } from "@/lib/services/itinerary-template-service";
import {
createItineraryTemplateSchema,
templateListQuerySchema,
} from "@/lib/validation/itinerary-template-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/itinerary-templates
 * Lists all reusable itinerary templates for the authenticated agency.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "VIEW");
    const query = validateQueryParams(
      templateListQuerySchema,
      request.nextUrl.searchParams
    );

    const templates = await itineraryTemplateService.listTemplates(
      context.agencyId,
      query
    );

    return apiSuccess(templates);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/itinerary-templates
 * Creates a new reusable itinerary template (DAY or PACKAGE).
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "CREATE");
    const body = await validateJson(createItineraryTemplateSchema, request);

    const template = await itineraryTemplateService.createTemplate(
      context.agencyId,
      body
    );

    return apiCreated(template);
  } catch (error) {
    return handleApiError(error);
  }
}
