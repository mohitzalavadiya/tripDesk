import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiCreated,
  handleApiError,
} from "@/lib/api";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/quotations/[id]/version
 * Clones the quotation to create a new version (v2, v3, etc.) while freezing the old version.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: quotationId } = await params;

    const newVersion = await quotationService.createQuotationVersion(
      context.agencyId,
      quotationId
    );

    return apiCreated(newVersion);
  } catch (error) {
    return handleApiError(error);
  }
}
