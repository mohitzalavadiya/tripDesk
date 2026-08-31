import { NextRequest, NextResponse } from "next/server";
import { requireReadAccess, handleApiError } from "@/lib/api";
import { operationsDocumentService } from "@/lib/services/operations-document-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/operations/[id]/documents/travel-kit/pdf
 * Generates and returns a comprehensive Final Travel Kit & Itinerary Pack PDF.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const { buffer, filename } =
      await operationsDocumentService.generateTravelKit(
        context.agencyId,
        id,
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
