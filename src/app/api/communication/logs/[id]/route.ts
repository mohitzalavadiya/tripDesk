import { NextRequest } from "next/server";
import {
  requireAgencyOwnerContext,
  apiSuccess,
  handleApiError,
} from "@/lib/api";
import { communicationService } from "@/lib/services/communication-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/communication/logs/[id]
 * Retrieve single communication log details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireAgencyOwnerContext();
    const { id } = await params;

    const communication = await communicationService.getCommunicationDetails(
      context.agencyId,
      id
    );

    if (!communication) {
      return handleApiError({
        statusCode: 404,
        code: "NOT_FOUND",
        message: "Communication log not found or access denied.",
      });
    }

    return apiSuccess(communication);
  } catch (error) {
    return handleApiError(error);
  }
}
