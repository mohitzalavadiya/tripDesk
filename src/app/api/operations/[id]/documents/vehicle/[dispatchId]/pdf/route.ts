import { NextRequest, NextResponse } from "next/server";
import { requireReadAccess, handleApiError } from "@/lib/api";
import { operationsDocumentService } from "@/lib/services/operations-document-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string; dispatchId: string }>;
}

/**
 * GET /api/operations/[id]/documents/vehicle/[dispatchId]/pdf
 * Generates and returns a professional Vehicle / Transport Voucher PDF.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id, dispatchId } = await params;

    const { buffer, filename } =
      await operationsDocumentService.generateVehicleVoucher(
        context.agencyId,
        id,
        dispatchId,
        context.dbUser?.name || "Operations Lead"
      );

    return new NextResponse(new Uint8Array(buffer), {
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
