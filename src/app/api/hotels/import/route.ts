import { NextRequest } from "next/server";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  ValidationError,
} from "@/lib/api";
import { hotelExcelService, ImportMode } from "@/lib/excel/hotel-excel-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/hotels/import?action=preview|execute
 * Handles Excel parsing, preview, and execution for Hotel Master imports.
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action") || "preview";

    if (action !== "preview" && action !== "execute") {
      throw new ValidationError("Invalid action. Must be 'preview' or 'execute'.");
    }

    // Read access is sufficient for preview; write access is mandatory for execution
    const context = action === "execute" ? await requireWriteAccess() : await requireReadAccess();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as ImportMode) || "SKIP";

    if (!file) {
      throw new ValidationError("No Excel file provided. Please upload a .xlsx file.");
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      throw new ValidationError("Invalid file format. Only .xlsx files are supported.");
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      throw new ValidationError("File exceeds maximum allowed size of 5 MB.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (action === "preview") {
      const preview = await hotelExcelService.parseAndPreview(buffer, context.agencyId, mode);
      return apiSuccess(preview);
    } else {
      const result = await hotelExcelService.executeImport(buffer, context.agencyId, mode);
      return apiSuccess(result);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
