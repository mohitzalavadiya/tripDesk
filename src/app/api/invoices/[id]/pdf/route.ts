import { NextRequest, NextResponse } from "next/server";
import { requireReadAccess, handleApiError, NotFoundError } from "@/lib/api";
import { invoiceService } from "@/lib/services/invoice-service";
import { invoicePdfService } from "@/lib/services/invoice-pdf-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/[id]/pdf
 * Stream high-resolution PDF for an Invoice (Draft, Issued, or Cancelled)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const invoice = await invoiceService.getInvoice(context.agencyId, id);
    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    const pdfBuffer = await invoicePdfService.generateInvoicePdf(invoice);

    const filename = invoice.invoiceNumber
      ? `Invoice-${invoice.invoiceNumber}.pdf`
      : `Invoice-Draft-${invoice.booking?.bookingNumber || id}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
