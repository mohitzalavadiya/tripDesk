import {
apiSuccess,
handleApiError,
requireWriteAccess,
validateJson,
} from "@/lib/api";
import { travelDocumentService } from "@/lib/services/travel-document-service";
import { resendDocumentSchema } from "@/lib/validation/document-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/documents/[id]/resend
 * Resend an issued travel document via Phase 15 communication service.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;

    let body = {};
    try {
      body = await validateJson(resendDocumentSchema, request);
    } catch {
      body = {};
    }

    const result = await travelDocumentService.resendDocument(
      context.agencyId,
      id,
      body
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
