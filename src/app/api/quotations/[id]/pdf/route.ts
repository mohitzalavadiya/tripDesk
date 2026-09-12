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
      discountAmount: Number(quotation.discountAmount || 0),
      taxableAmount: Number(quotation.taxableAmount || 0),
      taxRate: Number(quotation.taxRate || quotation.taxPercentage || 0),
      taxMode: quotation.taxMode || "EXCLUSIVE",
      gstTreatment: quotation.gstTreatment || "INTRA_STATE",
      cgstAmount: Number(quotation.cgstAmount || 0),
      sgstAmount: Number(quotation.sgstAmount || 0),
      igstAmount: Number(quotation.igstAmount || 0),
      taxAmount: Number(quotation.taxAmount || 0),
      finalAmount: Number(quotation.finalAmount || 0),
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
      packageOptions: quotation.packageOptions.map((opt) => ({
        id: opt.id,
        name: opt.name,
        subtitle: opt.subtitle,
        description: opt.description,
        isRecommended: opt.isRecommended,
        discountAmount: Number(opt.discountAmount || 0),
        taxableAmount: Number(opt.taxableAmount || 0),
        taxRate: Number(opt.taxRate || opt.taxPercentage || 0),
        taxMode: opt.taxMode || "EXCLUSIVE",
        gstTreatment: opt.gstTreatment || "INTRA_STATE",
        cgstAmount: Number(opt.cgstAmount || 0),
        sgstAmount: Number(opt.sgstAmount || 0),
        igstAmount: Number(opt.igstAmount || 0),
        taxAmount: Number(opt.taxAmount || 0),
        finalAmount: Number(opt.finalAmount || 0),
        hotelNotes: opt.hotelNotes,
        vehicleNotes: opt.vehicleNotes,
        activityNotes: opt.activityNotes,
        inclusions: opt.inclusions,
        exclusions: opt.exclusions,
      })),
      selectedPackageOptionId: quotation.selectedPackageOptionId,
      selectedPackageOption: quotation.selectedPackageOption
        ? {
            id: quotation.selectedPackageOption.id,
            name: quotation.selectedPackageOption.name,
            subtitle: quotation.selectedPackageOption.subtitle,
            description: quotation.selectedPackageOption.description,
            isRecommended: quotation.selectedPackageOption.isRecommended,
            discountAmount: Number(quotation.selectedPackageOption.discountAmount || 0),
            taxableAmount: Number(quotation.selectedPackageOption.taxableAmount || 0),
            taxRate: Number(quotation.selectedPackageOption.taxRate || quotation.selectedPackageOption.taxPercentage || 0),
            taxMode: quotation.selectedPackageOption.taxMode || "EXCLUSIVE",
            gstTreatment: quotation.selectedPackageOption.gstTreatment || "INTRA_STATE",
            cgstAmount: Number(quotation.selectedPackageOption.cgstAmount || 0),
            sgstAmount: Number(quotation.selectedPackageOption.sgstAmount || 0),
            igstAmount: Number(quotation.selectedPackageOption.igstAmount || 0),
            taxAmount: Number(quotation.selectedPackageOption.taxAmount || 0),
            finalAmount: Number(quotation.selectedPackageOption.finalAmount || 0),
            hotelNotes: quotation.selectedPackageOption.hotelNotes,
            vehicleNotes: quotation.selectedPackageOption.vehicleNotes,
            activityNotes: quotation.selectedPackageOption.activityNotes,
            inclusions: quotation.selectedPackageOption.inclusions,
            exclusions: quotation.selectedPackageOption.exclusions,
          }
        : null,
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

    const safeRef = quotation.quotationNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `TripDesk-Proposal-${safeRef}-v${quotation.version}.pdf`;

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
