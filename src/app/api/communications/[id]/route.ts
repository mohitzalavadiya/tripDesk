import { NextRequest } from "next/server";
import {
  requireAgencyOwnerContext,
  apiSuccess,
  handleApiError,
  NotFoundError,
} from "@/lib/api";
import { communicationService } from "@/lib/services/communication-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

/**
 * GET /api/communications/[id]
 * Get single communication details for the authenticated agency
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireAgencyOwnerContext();
    const { id } = await params;

    const result = await communicationService.getCommunicationDetails(
      context.agencyId,
      id
    );

    if (!result) {
      throw new NotFoundError("Communication record");
    }

    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}

