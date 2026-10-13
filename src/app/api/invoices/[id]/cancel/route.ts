import {
apiSuccess,
handleApiError,
requireWriteAccess,
validateJson,
} from "@/lib/api";
import { invoiceService } from "@/lib/services/invoice-service";
import { cancelInvoiceSchema } from "@/lib/validation/invoice-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoices/[id]/cancel
 * Cancel an issued or partially paid invoice with mandatory reason
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(cancelInvoiceSchema, request);

    const cancelled = await invoiceService.cancelInvoice(
      context.agencyId,
      id,
      context.dbUser.id,
      body.reason
    );

    return apiSuccess(cancelled);
  } catch (error) {
    return handleApiError(error);
  }
}
