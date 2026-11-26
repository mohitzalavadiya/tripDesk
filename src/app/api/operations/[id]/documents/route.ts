import { apiSuccess, enforceStaffPermission, handleApiError, requireReadAccess } from "@/lib/api";
import { operationsDocumentService } from "@/lib/services/operations-document-service";
import { NextRequest } from "next/server";

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
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "OPERATIONS", "VIEW");
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
