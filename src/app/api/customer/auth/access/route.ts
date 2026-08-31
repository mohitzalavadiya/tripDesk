import { NextRequest, NextResponse } from "next/server";
import { customerPortalService } from "@/lib/services/customer-portal-service";
import { apiSuccess, handleApiError, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * POST /api/customer/auth/access
 * Validates booking reference & phone number to issue customer session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bookingNumberOrToken = body.bookingNumber || body.token || "";
    const phoneOrEmail = body.phone || body.email || "";

    if (!bookingNumberOrToken) {
      throw new ApiError(400, "MISSING_IDENTIFIER", "Booking reference, token, or trip number is required.");
    }

    const customer = await customerPortalService.lookupCustomerAccess(
      bookingNumberOrToken,
      phoneOrEmail || undefined
    );

    if (!customer) {
      throw new ApiError(401, "AUTHENTICATION_FAILED", "Could not find a booking matching the provided credentials.");
    }

    // Set cookie for session
    const response = apiSuccess({
      customerId: customer.customerId,
      agencyId: customer.agencyId,
      customerName: customer.customerName,
      message: "Portal access authorized.",
    });

    response.cookies.set("tripdesk_customer_session", JSON.stringify({
      customerId: customer.customerId,
      agencyId: customer.agencyId,
    }), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
