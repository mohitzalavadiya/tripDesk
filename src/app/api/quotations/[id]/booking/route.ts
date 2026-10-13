import {
apiCreated,
handleApiError,
requireWriteAccess,
validateJson,
} from "@/lib/api";
import { bookingService } from "@/lib/services/booking-service";
import { convertQuotationToBookingSchema } from "@/lib/validation/booking-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/quotations/[id]/booking
 * Converts an accepted quotation proposal into a confirmed booking.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: quotationId } = await params;
    const body = await validateJson(convertQuotationToBookingSchema, request).catch(() => ({}));

    const newBooking = await bookingService.convertQuotationToBooking(
      context.agencyId,
      quotationId,
      body
    );

    return apiCreated(newBooking);
  } catch (error) {
    return handleApiError(error);
  }
}
