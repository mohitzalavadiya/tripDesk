import {
  apiSuccess,
  ForbiddenError,
  handleApiError,
  requireAgencyOwnerContext,
  requireMemberReadAccess,
  validateJson,
} from "@/lib/api";
import { paymentService } from "@/lib/services/payment-service";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import { updatePaymentSchema } from "@/lib/validation/payment-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/payments/[id]
 * Get single payment record with booking and customer info.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireMemberReadAccess();

    if (context.isAgencyStaff) {
      const canView = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "PAYMENTS",
        "VIEW"
      );
      if (!canView) {
        throw new ForbiddenError("You do not have permission to view payments.");
      }
    }

    const { id } = await params;

    const payment = await paymentService.getPayment(context.agencyId, id);
    if (!payment) {
      return handleApiError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Payment record not found.",
      });
    }

    return apiSuccess(payment);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/payments/[id]
 * Update payment status, notes, or refund amount.
 * Agency Owner only. Staff cannot modify existing payment records.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireAgencyOwnerContext();
    const { id } = await params;
    const body = await validateJson(updatePaymentSchema, request);

    const updated = await paymentService.updatePayment(context.agencyId, id, body);

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/payments/[id]
 * Soft delete / archive payment and recalculate booking totals.
 * Agency Owner only. Destructive deletion is restricted to Agency Owners.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireAgencyOwnerContext();
    const { id } = await params;

    await paymentService.archivePayment(context.agencyId, id);

    return apiSuccess({ success: true, message: "Payment archived successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
