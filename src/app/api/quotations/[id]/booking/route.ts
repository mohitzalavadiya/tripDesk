import {
  apiCreated,
  ForbiddenError,
  handleApiError,
  requireWriteAccess,
  validateJson,
} from "@/lib/api";
import { bookingService } from "@/lib/services/booking-service";
import { staffPermissionService } from "@/lib/services/staff-permission-service";
import { convertQuotationToBookingSchema } from "@/lib/validation/booking-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/quotations/[id]/booking
 * Converts an accepted quotation proposal into a booking (draft status).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();

    if (context.isAgencyStaff) {
      const canCreate = await staffPermissionService.hasStaffPermission(
        context.dbUser.role,
        context.agencyId,
        context.dbUser.id,
        "BOOKINGS",
        "CREATE"
      );
      if (!canCreate) {
        throw new ForbiddenError("You do not have permission to create bookings.");
      }
    }

    const { id: quotationId } = await params;
    const body = await validateJson(convertQuotationToBookingSchema, request).catch(() => ({}));

    const newBooking = await bookingService.convertQuotationToBooking(
      context.agencyId,
      quotationId,
      {
        ...body,
        userId: context.dbUser.id,
      } as any
    );

    return apiCreated(newBooking);
  } catch (error) {
    return handleApiError(error);
  }
}
