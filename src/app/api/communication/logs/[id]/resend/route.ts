import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { communicationService } from "@/lib/services/communication-service";
import { resendCommunicationSchema } from "@/lib/validation/communication-schema";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/communication/logs/[id]/resend
 * Resend or retry a communication record
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    let customRecipient: string | undefined;
    try {
      const body = await validateJson(resendCommunicationSchema, request);
      customRecipient = body.customRecipient;
    } catch {
      customRecipient = undefined;
    }

    const result = await communicationService.resendCommunication(
      context.agencyId,
      id,
      customRecipient
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
