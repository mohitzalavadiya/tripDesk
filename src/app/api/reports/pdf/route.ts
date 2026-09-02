import { NextRequest, NextResponse } from "next/server";
import { requireAgencyOwnerContext } from "@/lib/api/context";
import { reportFilterSchema } from "@/lib/validation/reporting-schema";
import { reportingService } from "@/lib/services/reporting-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/pdf
 * Generates and downloads a server-rendered PDF BI report with agency branding.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireAgencyOwnerContext();
    const agencyId = context.agencyId;

    const { searchParams } = new URL(request.url);
    const parsedFilter = reportFilterSchema.parse({
      preset: searchParams.get("preset") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      type: searchParams.get("type") || undefined,
      search: searchParams.get("search") || undefined,
      limit: searchParams.get("limit") || undefined,
    });

    const { buffer, filename } = await reportingService.generateReportsPDF(agencyId, parsedFilter);

    const pdfArrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer;

    return new NextResponse(pdfArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    if (error.statusCode) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("GET /api/reports/pdf error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate report PDF." },
      { status: 500 }
    );
  }
}
