import { NextRequest } from "next/server";
import {
  requireReadAccess,
  apiSuccess,
  handleApiError,
  validateQueryParams,
} from "@/lib/api";
import { travelDocumentService } from "@/lib/services/travel-document-service";
import { listDocumentsSchema } from "@/lib/validation/document-schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/documents
 * List travel documents for the authenticated agency with filters and pagination.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const queryParams = validateQueryParams(listDocumentsSchema, request.nextUrl.searchParams);

    const result = await travelDocumentService.listDocuments(context.agencyId, queryParams);

    return apiSuccess(result.data, 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}
