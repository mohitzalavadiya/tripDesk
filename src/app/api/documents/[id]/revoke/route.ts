import {
apiSuccess,
handleApiError,
requireWriteAccess,
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
