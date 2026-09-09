import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { issueInvoiceSchema } from "@/lib/validation/invoice-schema";
import { invoiceService } from "@/lib/services/invoice-service";

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
    const { id } = await params;

    let body: any = {};
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
