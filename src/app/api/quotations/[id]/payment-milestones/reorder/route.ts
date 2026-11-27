import {
  enforceStaffPermission,
  apiSuccess,
  handleApiError,
  requireWriteAccess,
  validateJson,
} from "@/lib/api";
import { quotationService } from "@/lib/services/quotation-service";
import { reorderPaymentMilestonesSchema } from "@/lib/validation/payment-milestone-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/quotations/[id]/payment-milestones/reorder
 * Batch updates sort order for payment milestones.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "QUOTATIONS", "UPDATE");
    const { id: quotationId } = await params;
    const body = await validateJson(reorderPaymentMilestonesSchema, request);

    const reordered = await quotationService.reorderPaymentMilestones(
      context.agencyId,
      quotationId,
      body.milestoneIds
    );

    return apiSuccess(reordered);
  } catch (error) {
    return handleApiError(error);
  }
}
