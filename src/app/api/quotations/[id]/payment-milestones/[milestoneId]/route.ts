import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { updatePaymentMilestoneSchema } from "@/lib/validation/payment-milestone-schema";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; milestoneId: string }>;
}

/**
 * PATCH /api/quotations/[id]/payment-milestones/[milestoneId]
 * Updates a payment milestone.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: quotationId, milestoneId } = await params;
    const body = await validateJson(updatePaymentMilestoneSchema, request);

    const updated = await quotationService.updatePaymentMilestone(
      context.agencyId,
      quotationId,
      milestoneId,
      body
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/quotations/[id]/payment-milestones/[milestoneId]
 * Deletes a payment milestone.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: quotationId, milestoneId } = await params;

    const deleted = await quotationService.deletePaymentMilestone(
      context.agencyId,
      quotationId,
      milestoneId
    );

    return apiSuccess(deleted);
  } catch (error) {
    return handleApiError(error);
  }
}
