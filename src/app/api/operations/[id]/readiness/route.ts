import { NextRequest } from "next/server";
import {
  requireReadAccess,
  apiSuccess,
  handleApiError,
  validateRouteParams,
} from "@/lib/api";
import { operationsService } from "@/lib/services/operations-service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const idParamSchema = z.object({
  id: z.string().min(1, "Operation ID is required"),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/operations/[id]/readiness
 * Retrieves real-time operational readiness checklist and score.
 */
export async function GET(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id } = validateRouteParams(idParamSchema, await props.params);

    const readiness = await operationsService.calculateReadiness(
      context.agencyId,
      id
    );

    return apiSuccess(readiness);
  } catch (error) {
    return handleApiError(error);
  }
}
