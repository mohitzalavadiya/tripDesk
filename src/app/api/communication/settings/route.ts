import {
  apiSuccess,
  handleApiError,
  requireReadAccess,
  requireWriteAccess,
  enforceStaffPermission,
  validateJson,
} from "@/lib/api";

import { communicationService } from "@/lib/services/communication-service";
import { updateCommunicationSettingsSchema } from "@/lib/validation/communication-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/communication/settings
 * Retrieve agency communication settings
 */
export async function GET() {
  try {
    const context = await requireReadAccess();
    if (context.dbUser.role === "AGENCY_STAFF") {
      await enforceStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "SETTINGS",
        "VIEW"
      );
    }
    const settings = await communicationService.getAgencySettings(context.agencyId);

    return apiSuccess(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/communication/settings
 * Update agency communication preferences & automation toggles
 */
export async function PATCH(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    if (context.dbUser.role === "AGENCY_STAFF") {
      await enforceStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "SETTINGS",
        "UPDATE"
      );
    }
    const body = await validateJson(updateCommunicationSettingsSchema, request);

    const updated = await communicationService.updateAgencySettings(
      context.agencyId,
      body
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
