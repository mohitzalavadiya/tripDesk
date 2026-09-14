import { NextRequest } from "next/server";
import {
  requireAgencyOwnerContext,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { taxProfileService } from "@/lib/services/tax-profile-service";
import { updateAgencyTaxProfileSchema } from "@/lib/validation/tax-schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/agency/tax-profile
 * Retrieve authenticated agency's tax & GST profile
 */
export async function GET() {
  try {
    const context = await requireAgencyOwnerContext();
    const profile = await taxProfileService.getAgencyTaxProfile(context.agencyId);

    return apiSuccess(profile);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/agency/tax-profile
 * Upsert authenticated agency's tax & GST profile defaults
 */
export async function PUT(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(updateAgencyTaxProfileSchema, request);

    const updated = await taxProfileService.updateAgencyTaxProfile(
      context.agencyId,
      body
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
