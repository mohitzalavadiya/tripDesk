import {
  enforceStaffPermission,
apiCreated,
apiSuccess,
handleApiError,
requireReadAccess,
requireWriteAccess,
validateJson,
} from "@/lib/api";
import { toStaffSafeQuotationDTO } from "@/lib/auth/permissions";
import { quotationService } from "@/lib/services/quotation-service";
import { createQuotationItemSchema } from "@/lib/validation/quotation-item-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/quotations/[id]/items
 * List line items for a quotation.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "QUOTATIONS", "VIEW");
    const { id } = await params;

    const quotation = await quotationService.getQuotation(context.agencyId, id);
    if (!quotation) {
      return handleApiError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Quotation not found.",
      });
    }

    const safeItems = context.isAgencyStaff
      ? toStaffSafeQuotationDTO(quotation).items
      : quotation.items;

    return apiSuccess(safeItems);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/quotations/[id]/items
 * Add a line item to a quotation and recalculate totals.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "QUOTATIONS", "UPDATE");
    const { id } = await params;
    const body = await validateJson(createQuotationItemSchema, request);

    const newItem = await quotationService.createQuotationItem(context.agencyId, id, body);

    return apiCreated(newItem);
  } catch (error) {
    return handleApiError(error);
  }
}
