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
      title: quotation.title || `Proposal for ${quotation.trip.title}`,
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
      trip: {
        title: quotation.trip.title,
        tripNumber: quotation.trip.tripNumber,
        startDate: quotation.trip.startDate,
        endDate: quotation.trip.endDate,
        travelers: quotation.trip.travelers,
        itineraryItems: quotation.trip.itineraryItems,
        hotels: quotation.trip.tripHotels?.map((th) => ({
          id: th.id,
          name: th.hotel?.name || "Selected Hotel",
          city: th.hotel?.city || null,
          roomType: th.roomType,
          mealPlan: th.mealPlan || null,
          checkIn: th.checkIn,
          checkOut: th.checkOut,
          nights: Math.max(1, Math.round((new Date(th.checkOut).getTime() - new Date(th.checkIn).getTime()) / (1000 * 60 * 60 * 24))),
          rooms: th.rooms || 1,
          notes: th.notes || null,
        })),
        vehicles: quotation.trip.tripVehicles?.map((tv) => ({
          id: tv.id,
          name: tv.vehicleName || tv.vehicle?.name || "Private Transport",
          type: tv.vehicleType || tv.vehicle?.type || null,
          capacity: tv.vehicle?.capacity || null,
          startDate: tv.startDate || null,
          endDate: tv.endDate || null,
          notes: tv.notes || null,
        })),
        activities: quotation.trip.tripActivities?.map((ta) => ({
          id: ta.id,
          name: ta.name || ta.activity?.name || "Sightseeing Excursion",
          city: ta.activity?.location || null,
          date: ta.date || null,
          description: ta.description || null,
          notes: ta.notes || null,
        })),
      },
      packageOptions: quotation.packageOptions,
      selectedPackageOptionId: quotation.selectedPackageOptionId,
      selectedPackageOption: quotation.selectedPackageOption,
      proposalItems: quotation.proposalItems as any,
      paymentMilestones: quotation.paymentMilestones,
    });

    const safeRef = quotation.quotationNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `TripDesk-Proposal-${safeRef}-v${quotation.version}.pdf`;

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
