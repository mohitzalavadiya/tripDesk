import {
  apiCreated,
  apiSuccess,
  ForbiddenError,
  handleApiError,
  requireMemberReadAccess,
  requireMemberWriteAccess,
  validateJson,
  validateQueryParams,
} from "@/lib/api";
import { paymentService } from "@/lib/services/payment-service";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import {
  createPaymentSchema,
  paymentQuerySchema,
} from "@/lib/validation/payment-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments
 * List payments with filters and pagination.
 */
export async function GET(request: NextRequest) {
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

    const queryParams = validateQueryParams(paymentQuerySchema, request.nextUrl.searchParams);

    const result = await paymentService.getPayments(context.agencyId, queryParams);

    return apiSuccess(result.data, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/payments
 * Record a new customer payment against a booking.
 * If logged by staff, forces PENDING receipt status and requires RECORDRECEIPT permission.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireMemberWriteAccess();

    if (context.isAgencyStaff) {
      const canRecord = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "PAYMENTS",
        "RECORDRECEIPT"
      );
      if (!canRecord) {
        throw new ForbiddenError("You do not have permission to record payment receipts.");
      }
    }

    const body = await validateJson(createPaymentSchema, request);

    const newPayment = await paymentService.createPayment(context.agencyId, body, {
      role: context.dbUser.role,
      userId: context.dbUser.id,
    });

    return apiCreated(newPayment);
  } catch (error) {
    return handleApiError(error);
  }
}
