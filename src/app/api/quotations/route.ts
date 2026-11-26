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
import { toStaffSafeQuotationDTO, toStaffSafeQuotationListDTO } from "@/lib/auth/permissions";
import { quotationService } from "@/lib/services/quotation-service";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import {
  createQuotationSchema,
  quotationQuerySchema,
} from "@/lib/validation/quotation-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/quotations
 * List quotations with search, status filters, and pagination.
 * Strips markup, net costs, and internal notes for staff callers.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireMemberReadAccess();

    if (context.isAgencyStaff) {
      const canView = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "QUOTATIONS",
        "VIEW"
      );
      if (!canView) {
        throw new ForbiddenError("You do not have permission to view quotations.");
      }
    }

    const queryParams = validateQueryParams(quotationQuerySchema, request.nextUrl.searchParams);
    const result = await quotationService.getQuotations(context.agencyId, queryParams);

    const safeData = context.isAgencyStaff
      ? toStaffSafeQuotationListDTO(result.data)
      : result.data;

    return apiSuccess(safeData, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/quotations
 * Create a new quotation record under the authenticated agency.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireMemberWriteAccess();

    if (context.isAgencyStaff) {
      const canCreate = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "QUOTATIONS",
        "CREATE"
      );
      if (!canCreate) {
        throw new ForbiddenError("You do not have permission to create quotations.");
      }
    }

    const body = await validateJson(createQuotationSchema, request);
    const newQuotation = await quotationService.createQuotation(context.agencyId, body);

    const safeQuotation = context.isAgencyStaff
      ? toStaffSafeQuotationDTO(newQuotation)
      : newQuotation;

    return apiCreated(safeQuotation);
  } catch (error) {
    return handleApiError(error);
  }
}
