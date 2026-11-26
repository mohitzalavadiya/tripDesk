import {
  apiSuccess,
  enforceStaffPermission,
  handleApiError,
  requireReadAccess,
} from "@/lib/api";
import { invoiceService } from "@/lib/services/invoice-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/summary
 * Operational invoice summary metrics
 */
export async function GET() {
  try {
    const context = await requireReadAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "VIEW");
    const summary = await invoiceService.getInvoiceSummary(context.agencyId);

    return apiSuccess(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
