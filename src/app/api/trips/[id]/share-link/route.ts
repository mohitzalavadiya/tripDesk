import { NextRequest } from "next/server";
import {
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateRouteParams,
} from "@/lib/api";
import { tripIdParamSchema } from "@/lib/validation/trip-schema";
import { tripService } from "@/lib/services/trip-service";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/trips/[id]/share-link
 * Explicitly retrieves or generates a PublicShareLink for customer feedback link sharing.
 * Enforces:
 * - Authenticated agency tenancy
 * - Trip status === COMPLETED
 * - Active link reuse
 * - Revoked link protection
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(tripIdParamSchema, await props.params);

    const shareLink = await tripService.getOrCreateFeedbackLink(context.agencyId, id);

    return apiSuccess({
      shareLink,
      tokenHash: shareLink.tokenHash,
      url: `/trip/${shareLink.tokenHash}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
