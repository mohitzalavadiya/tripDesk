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
 * GET /api/operations/[id]/closure
 * Fetches the full operations closure & reconciliation summary.
 */
export async function GET(_request: NextRequest, props: RouteProps) {
  try {
    const context = await requireReadAccess();
    const { id } = validateRouteParams(idParamSchema, await props.params);

    const summary = await operationsService.getClosureSummary(
      context.agencyId,
      id
    );

    return apiSuccess(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
