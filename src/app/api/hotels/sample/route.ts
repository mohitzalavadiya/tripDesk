import { NextRequest, NextResponse } from "next/server";
import { requireReadAccess, handleApiError } from "@/lib/api";
import { hotelExcelService } from "@/lib/excel/hotel-excel-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/hotels/sample
 * Generates and downloads the official sample Hotel Master Excel workbook (Hotels.xlsx).
 * Requires authenticated read access.
 */
export async function GET(request: NextRequest) {
  try {
    await requireReadAccess();

    const buffer = hotelExcelService.generateSampleWorkbook();

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="Hotels.xlsx"',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
