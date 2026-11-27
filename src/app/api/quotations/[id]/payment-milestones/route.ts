import {
  enforceStaffPermission,
apiCreated,
apiSuccess,
handleApiError,
requireReadAccess,
requireWriteAccess,
validateJson,
} from "@/lib/api";
import { quotationService } from "@/lib/services/quotation-service";
import { createPaymentMilestoneSchema } from "@/lib/validation/payment-milestone-schema";
import { NextRequest } from "next/server";

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
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "QUOTATIONS", "VIEW");
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
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "QUOTATIONS", "UPDATE");
    const { id } = await params;
    const body = await validateJson(createPaymentMilestoneSchema, request);

    const milestone = await quotationService.createPaymentMilestone(context.agencyId, id, body);

    return apiCreated(milestone);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/quotations/[id]/payment-milestones
 * Atomically synchronizes payment schedule (terms + milestones).
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "QUOTATIONS", "UPDATE");
    const { id } = await params;
    const { syncPaymentScheduleSchema } = await import("@/lib/validation/payment-milestone-schema");
    const body = await validateJson(syncPaymentScheduleSchema, request);

    const result = await quotationService.syncPaymentSchedule(context.agencyId, id, body);

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
