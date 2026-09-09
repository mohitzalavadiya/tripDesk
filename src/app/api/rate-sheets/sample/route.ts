import { NextRequest, NextResponse } from "next/server";
import { requireReadAccess, handleApiError } from "@/lib/api";
import { rateExcelService } from "@/lib/excel/rate-excel-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/rate-sheets/sample
 * Generates and downloads the official sample Hotel Rate Excel workbook (Hotel_Rates.xlsx)
 * populated with the authenticated agency's real Hotel Codes in the reference sheet.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();

    const buffer = await rateExcelService.generateSampleWorkbook(context.agencyId);

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Hotel_Rates.xlsx"',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
