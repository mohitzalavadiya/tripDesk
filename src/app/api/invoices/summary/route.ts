import { NextRequest } from "next/server";
import {
  requireReadAccess,
  apiSuccess,
  handleApiError,
} from "@/lib/api";
import { invoiceService } from "@/lib/services/invoice-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/summary
 * Operational invoice summary metrics
 */
export async function GET(_request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const summary = await invoiceService.getInvoiceSummary(context.agencyId);

    return apiSuccess(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
