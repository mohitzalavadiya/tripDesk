import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  apiCreated,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { createPaymentMilestoneSchema } from "@/lib/validation/payment-milestone-schema";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/quotations/[id]/payment-milestones
 * Lists payment milestones for a quotation.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const milestones = await quotationService.getPaymentMilestones(context.agencyId, id);

    return apiSuccess(milestones);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/quotations/[id]/payment-milestones
 * Creates a payment milestone on a quotation.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(createPaymentMilestoneSchema, request);

    const milestone = await quotationService.createPaymentMilestone(context.agencyId, id, body);

    return apiCreated(milestone);
  } catch (error) {
    return handleApiError(error);
  }
}
