import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/api";
import { quotationService } from "@/lib/services/quotation-service";
import { quotationPdfService } from "@/lib/services/quotation-pdf-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/quotations/public/[token]/pdf
 * Public customer endpoint to download a PDF proposal using the shareToken.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;

    const quotation = await quotationService.getPublicQuotationByToken(token);

    if (!quotation) {
      return handleApiError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Quotation proposal not found or link has expired.",
      });
    }

    // Generate sanitized PDF
    const pdfBuffer = await quotationPdfService.generateQuotationPdf({
      quotationNumber: quotation.quotationNumber,
      version: quotation.version,
      title: quotation.title,
      proposalSubtitle: quotation.proposalSubtitle,
      currency: quotation.currency,
      finalAmount: quotation.finalAmount,
      validUntil: quotation.validUntil,
      customerMessage: quotation.customerMessage,
      inclusionsIntro: quotation.inclusionsIntro,
      exclusionsIntro: quotation.exclusionsIntro,
      paymentTerms: quotation.paymentTerms,
      cancellationPolicy: quotation.cancellationPolicy,
      importantNotes: quotation.importantNotes,
      terms: quotation.terms,
      agency: quotation.agency,
      customer: quotation.customer,
      trip: quotation.trip,
      packageOptions: quotation.packageOptions,
      selectedPackageOptionId: quotation.selectedPackageOptionId,
      selectedPackageOption: quotation.selectedPackageOption,
      proposalItems: quotation.proposalItems as any,
      paymentMilestones: quotation.paymentMilestones,
    });

    const filename = `${quotation.quotationNumber}-v${quotation.version}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
