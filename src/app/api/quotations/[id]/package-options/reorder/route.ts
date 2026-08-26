import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { reorderPackageOptionsSchema } from "@/lib/validation/package-option-schema";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/quotations/[id]/package-options/reorder
 * Batch updates sort order for package options.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: quotationId } = await params;
    const body = await validateJson(reorderPackageOptionsSchema, request);

    await quotationService.reorderPackageOptions(context.agencyId, quotationId, body);

    return apiSuccess({ success: true, message: "Package options reordered successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
