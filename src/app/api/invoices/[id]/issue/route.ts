import {
apiSuccess,
handleApiError,
requireWriteAccess,
validateJson,
} from "@/lib/api";
import { invoiceService } from "@/lib/services/invoice-service";
import { issueInvoiceSchema } from "@/lib/validation/invoice-schema";
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
