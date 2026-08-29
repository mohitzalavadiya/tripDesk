import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { selectPackageOptionSchema } from "@/lib/validation/package-option-schema";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/quotations/[id]/package-options/select
 * Selects a package option on a quotation.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: quotationId } = await params;
    const body = await validateJson(selectPackageOptionSchema, request);

    const updated = await quotationService.selectPackageOption(
      context.agencyId,
      quotationId,
      body.optionId
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
