import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { updatePackageOptionSchema } from "@/lib/validation/package-option-schema";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; optionId: string }>;
}

/**
 * PATCH /api/quotations/[id]/package-options/[optionId]
 * Updates a package option.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: quotationId, optionId } = await params;
    const body = await validateJson(updatePackageOptionSchema, request);

    const updated = await quotationService.updatePackageOption(
      context.agencyId,
      quotationId,
      optionId,
      body
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/quotations/[id]/package-options/[optionId]
 * Deletes a package option.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: quotationId, optionId } = await params;

    const deleted = await quotationService.deletePackageOption(
      context.agencyId,
      quotationId,
      optionId
    );

    return apiSuccess(deleted);
  } catch (error) {
    return handleApiError(error);
  }
}
