import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedCustomer } from "@/lib/auth/customer-auth";
import { customerPortalService } from "@/lib/services/customer-portal-service";
import { handleApiError, ApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/customer/trips/[tripId]/documents/[type]/[docId]/pdf
 * Streams customer travel document PDF with strict IDOR verification.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string; type: string; docId: string }> }
) {
  try {
    const auth = await getAuthenticatedCustomer(request);
    if (!auth) {
      throw new ApiError(401, "CUSTOMER_UNAUTHORIZED", "Please sign in or provide a valid portal session.");
    }

    const { tripId, type, docId } = await params;

    const res = await customerPortalService.downloadCustomerDocument(
      auth.customerId,
      auth.agencyId,
      tripId,
      type,
      docId
    );

    return new NextResponse(new Uint8Array(res.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${res.filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
