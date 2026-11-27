import {
apiCreated,
apiSuccess,
handleApiError,
requireReadAccess,
requireWriteAccess,
  enforceStaffPermission,
validateJson,
validateQueryParams,
} from "@/lib/api";
import { invoiceService } from "@/lib/services/invoice-service";
import {
createInvoiceSchema,
invoiceQuerySchema,
} from "@/lib/validation/invoice-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/invoices
 * List invoices with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "VIEW");
    const queryParams = validateQueryParams(invoiceQuerySchema, request.nextUrl.searchParams);

    const result = await invoiceService.listInvoices(context.agencyId, queryParams);

    return apiSuccess(result.data, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/invoices
 * Get or create a persistent invoice for a confirmed booking (Decision #18)
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "CREATE");
    const body = await validateJson(createInvoiceSchema, request);

    const invoice = await invoiceService.getOrCreateInvoiceForBooking(context.agencyId, body.bookingId);

    return apiCreated(invoice);
  } catch (error) {
    return handleApiError(error);
  }
}
