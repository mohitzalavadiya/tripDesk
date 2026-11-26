import {
  apiSuccess,
  enforceStaffPermission,
  handleApiError,
  requireReadAccess,
  requireWriteAccess,
  validateJson,
} from "@/lib/api";
import { toStaffSafeQuotationDTO } from "@/lib/auth/permissions";
import { quotationService } from "@/lib/services/quotation-service";
import { updateQuotationSchema } from "@/lib/validation/quotation-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/quotations/[id]
 * Get single quotation with line items and relations.
 * Strips markup, net costs, and internal notes for staff callers.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "QUOTATION_DETAIL", "VIEW");
    const { id } = await params;

    const quotation = await quotationService.getQuotation(context.agencyId, id);
    if (!quotation) {
      return handleApiError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Quotation not found.",
      });
    }

    const safeQuotation = context.isAgencyStaff
      ? toStaffSafeQuotationDTO(quotation)
      : quotation;

    return apiSuccess(safeQuotation);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/quotations/[id]
 * Update quotation fields, rules, or status.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "QUOTATION_DETAIL", "UPDATE");
    const { id } = await params;
    const body = await validateJson(updateQuotationSchema, request);

    const updated = await quotationService.updateQuotation(context.agencyId, id, body);

    const safeUpdated = context.isAgencyStaff
      ? toStaffSafeQuotationDTO(updated)
      : updated;

    return apiSuccess(safeUpdated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/quotations/[id]
 * Soft delete quotation.
 * Agency Owner only. Destructive deletion is strictly restricted to Agency Owners.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "QUOTATION_DETAIL", "DELETE");
    const { id } = await params;

    await quotationService.deleteQuotation(context.agencyId, id);

    return apiSuccess({ success: true, message: "Quotation archived successfully." });
  } catch (error) {
    return handleApiError(error);
  }
}
