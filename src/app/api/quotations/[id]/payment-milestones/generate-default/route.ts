import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { generatePaymentScheduleSchema } from "@/lib/validation/payment-milestone-schema";
import { quotationService } from "@/lib/services/quotation-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/quotations/[id]/payment-milestones/generate-default
 * Auto-generates a milestone payment schedule according to chosen template.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: quotationId } = await params;
    const body = await validateJson(generatePaymentScheduleSchema, request).catch(() => ({ template: "STANDARD_3_TIER" as const }));

    const milestones = await quotationService.generateDefaultPaymentSchedule(
      context.agencyId,
      quotationId,
      body.template
    );

    return apiSuccess(milestones);
  } catch (error) {
    return handleApiError(error);
  }
}
