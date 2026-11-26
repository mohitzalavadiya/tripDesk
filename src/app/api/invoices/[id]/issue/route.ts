import {
  apiSuccess,
  enforceStaffPermission,
  handleApiError,
  requireWriteAccess,
  validateJson,
} from "@/lib/api";
import { invoiceService } from "@/lib/services/invoice-service";
import { issueInvoiceSchema, IssueInvoiceInput } from "@/lib/validation/invoice-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoices/[id]/issue
 * Concurrency-safe atomic invoice issuance
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "INVOICES", "UPDATE");
    const { id } = await params;

    let body: IssueInvoiceInput = {};
    try {
      body = await validateJson(issueInvoiceSchema, request);
    } catch {
      // Body is optional
    }

    const issued = await invoiceService.issueInvoice(context.agencyId, id, context.dbUser.id, body);

    return apiSuccess(issued);
  } catch (error) {
    return handleApiError(error);
  }
}
