import { NextRequest } from "next/server";
import { requireReadAccess, handleApiError, apiSuccess } from "@/lib/api";
import { operationsDocumentService } from "@/lib/services/operations-document-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/operations/[id]/documents
 * Fetches available operational documents, readiness status, and download links.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const summary = await operationsDocumentService.getDocumentsSummary(
      context.agencyId,
      id
    );

    return apiSuccess(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
