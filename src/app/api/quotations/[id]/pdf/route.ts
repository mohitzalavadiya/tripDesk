import { NextRequest, NextResponse } from "next/server";
import { requireReadAccess, handleApiError } from "@/lib/api";
import { quotationService } from "@/lib/services/quotation-service";
import { quotationPdfService } from "@/lib/services/quotation-pdf-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/quotations/[id]/pdf
 * Authenticated endpoint to download a customer-facing PDF travel proposal.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const quotation = await quotationService.getQuotation(context.agencyId, id);

    if (!quotation) {
      return handleApiError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Quotation proposal not found or has been archived.",
      });
    }

    // Generate sanitized PDF
    const pdfBuffer = await quotationPdfService.generateQuotationPdf({
      quotationNumber: quotation.quotationNumber,
      version: quotation.version,
      title: quotation.title || `Proposal for ${quotation.trip.title}`,
      proposalSubtitle: quotation.proposalSubtitle,
      currency: quotation.currency,
      finalAmount: Number(quotation.finalAmount),
      validUntil: quotation.validUntil,
      customerMessage: quotation.customerMessage,
      inclusionsIntro: quotation.inclusionsIntro,
      exclusionsIntro: quotation.exclusionsIntro,
      paymentTerms: quotation.paymentTerms,
      cancellationPolicy: quotation.cancellationPolicy,
      importantNotes: quotation.importantNotes,
      terms: quotation.terms,
      agency: quotation.agency
        ? {
            name: quotation.agency.name,
            email: quotation.agency.email,
            phone: quotation.agency.phone,
            logo: quotation.agency.logo,
            address: quotation.agency.address,
          }
        : undefined,
      customer: {
        name: quotation.customer.name,
        email: quotation.customer.email,
        phone: quotation.customer.phone,
      },
      trip: {
        title: quotation.trip.title,
        tripNumber: quotation.trip.tripNumber,
        startDate: quotation.trip.startDate,
        endDate: quotation.trip.endDate,
        travelers: quotation.trip.travelers,
        itineraryItems: quotation.trip.itineraryItems,
      },
      packageOptions: quotation.packageOptions.map((opt) => ({
        id: opt.id,
        name: opt.name,
        subtitle: opt.subtitle,
        description: opt.description,
        isRecommended: opt.isRecommended,
        finalAmount: Number(opt.finalAmount),
        hotelNotes: opt.hotelNotes,
        vehicleNotes: opt.vehicleNotes,
        activityNotes: opt.activityNotes,
        inclusions: opt.inclusions,
        exclusions: opt.exclusions,
      })),
      selectedPackageOptionId: quotation.selectedPackageOptionId,
      selectedPackageOption: quotation.selectedPackageOption ? {
        id: quotation.selectedPackageOption.id,
        name: quotation.selectedPackageOption.name,
        subtitle: quotation.selectedPackageOption.subtitle,
        description: quotation.selectedPackageOption.description,
        isRecommended: quotation.selectedPackageOption.isRecommended,
        finalAmount: Number(quotation.selectedPackageOption.finalAmount),
        hotelNotes: quotation.selectedPackageOption.hotelNotes,
        vehicleNotes: quotation.selectedPackageOption.vehicleNotes,
        activityNotes: quotation.selectedPackageOption.activityNotes,
        inclusions: quotation.selectedPackageOption.inclusions,
        exclusions: quotation.selectedPackageOption.exclusions,
      } : null,
      proposalItems: quotation.proposalItems.map((p) => ({
        id: p.id,
        type: p.type as any,
        title: p.title,
        description: p.description,
      })),
      paymentMilestones: quotation.paymentMilestones.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        percentage: m.percentage ? Number(m.percentage) : null,
        amount: m.amount ? Number(m.amount) : null,
        dueDate: m.dueDate,
      })),
    });

    const filename = `${quotation.quotationNumber}-v${quotation.version}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
