import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { travelDocumentService } from "@/lib/services/travel-document-service";
import { generateBookingDocumentsSchema } from "@/lib/validation/document-schema";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/bookings/[id]/documents/generate
 * Generate travel documents for a booking.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id: bookingId } = await params;

    let body = {};
    try {
      body = await validateJson(generateBookingDocumentsSchema, request);
    } catch {
      body = {};
    }

    const result = await travelDocumentService.generateBookingDocuments(
      context.agencyId,
      bookingId,
      body
    );

    return apiSuccess(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
