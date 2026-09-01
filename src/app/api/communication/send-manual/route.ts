import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { communicationService } from "@/lib/services/communication-service";
import { sendManualMessageSchema } from "@/lib/validation/communication-schema";

export const dynamic = "force-dynamic";

/**
 * POST /api/communication/send-manual
 * Send a manual customer communication (Email or WhatsApp)
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(sendManualMessageSchema, request);

    const result = await communicationService.sendManualMessage(
      context.agencyId,
      body
    );

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
