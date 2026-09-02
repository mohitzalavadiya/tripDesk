import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { travelDocumentService } from "@/lib/services/travel-document-service";
import { issueDocumentSchema } from "@/lib/validation/document-schema";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/documents/[id]/issue
 * Officially issue a generated travel document.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;

    let body = { notifyCustomer: false };
    try {
      body = await validateJson(issueDocumentSchema, request);
    } catch {
      body = { notifyCustomer: false };
    }

    const result = await travelDocumentService.issueDocument(
      context.agencyId,
      id,
      body
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
