import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiCreated,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { z } from "zod";
import { bookingService } from "@/lib/services/booking-service";

export const dynamic = "force-dynamic";

const convertQuotationSchema = z.object({
  quotationId: z.string().min(1, "Quotation ID is required"),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

/**
 * POST /api/bookings/from-quotation
 * Converts an accepted quotation proposal into a booking idempotently.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(convertQuotationSchema, request);

    const booking = await bookingService.convertQuotationToBooking(
      context.agencyId,
      body.quotationId,
      {
        notes: body.notes,
        internalNotes: body.internalNotes,
      }
    );

    return apiCreated(booking);
  } catch (error) {
    return handleApiError(error);
  }
}
