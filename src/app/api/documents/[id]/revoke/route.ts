import {
apiSuccess,
handleApiError,
requireWriteAccess,
  enforceStaffPermission,
validateJson,
} from "@/lib/api";
import { travelDocumentService } from "@/lib/services/travel-document-service";
import { revokeDocumentSchema } from "@/lib/validation/document-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/documents/[id]/revoke
 * Revoke an issued travel document with a reason.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    await enforceStaffPermission(context.dbUser.role, context.agencyId, context.dbUser.id, "DOCUMENTS", "UPDATE");
    const { id } = await params;
    const body = await validateJson(revokeDocumentSchema, request);

    const result = await travelDocumentService.revokeDocument(
      context.agencyId,
      id,
      body
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
