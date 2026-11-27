import {
  apiSuccess,
  enforceStaffPermission,
  handleApiError,
  NotFoundError,
  requireReadAccess,
  requireWriteAccess,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { itineraryTemplateService } from "@/lib/services/itinerary-template-service";
import { updateItineraryTemplateSchema } from "@/lib/validation/itinerary-template-schema";
import { NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const templateIdParamSchema = z.object({
  id: z.string().trim().min(1, "Template ID is required."),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/itinerary-templates/[id]
 * Retrieves a single template by ID, verifying agency tenancy.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(
      context.dbUser.role,
      context.agencyId,
      context.dbUser.id,
      "ITINERARIES",
      "VIEW"
    );
    const { id } = validateRouteParams(templateIdParamSchema, await props.params);

    const template = await itineraryTemplateService.getTemplateById(
      context.agencyId,
      id
    );

    if (!template) {
      throw new NotFoundError("Itinerary template");
    }

    return apiSuccess(template);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/itinerary-templates/[id]
 * Updates an itinerary template under the authenticated agency.
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(
      context.dbUser.role,
      context.agencyId,
      context.dbUser.id,
      "ITINERARIES",
      "UPDATE"
    );
    const { id } = validateRouteParams(templateIdParamSchema, await props.params);
    const body = await validateJson(updateItineraryTemplateSchema, request);

    const updatedTemplate = await itineraryTemplateService.updateTemplate(
      context.agencyId,
      id,
      body
    );

    return apiSuccess(updatedTemplate);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/itinerary-templates/[id]
 * Soft-archives an itinerary template.
 */
export async function DELETE(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "ITINERARIES", "DELETE");
    const { id } = validateRouteParams(templateIdParamSchema, await props.params);

    const archivedTemplate = await itineraryTemplateService.archiveTemplate(
      context.agencyId,
      id
    );

    return apiSuccess({
      message: "Itinerary template archived successfully.",
      template: archivedTemplate,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
