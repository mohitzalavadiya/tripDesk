import { NextRequest } from "next/server";
import {
  requireReadAccess,
  apiSuccess,
  handleApiError,
} from "@/lib/api";
import { travelDocumentService } from "@/lib/services/travel-document-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/documents/[id]
 * Get travel document details.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const document = await travelDocumentService.getDocumentDetails(context.agencyId, id);

    return apiSuccess(document);
  } catch (error) {
    return handleApiError(error);
  }
}
