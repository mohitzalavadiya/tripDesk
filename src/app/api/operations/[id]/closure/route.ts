import {
  apiSuccess,
  enforceStaffPermission,
  handleApiError,
  requireReadAccess,
  validateRouteParams,
} from "@/lib/api";
import { redactStaffFinancials } from "@/lib/auth/permissions";
import { operationsService } from "@/lib/services/operations-service";
import { NextRequest } from "next/server";
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
    await enforceStaffPermission(
      context.dbUser.role,
      context.agencyId,
      context.dbUser.id,
      "OPERATIONS",
      "VIEW"
    );
    const { id } = validateRouteParams(idParamSchema, await props.params);

    const summary = await operationsService.getClosureSummary(
      context.agencyId,
      id
    );

    return apiSuccess(redactStaffFinancials(summary, context.dbUser.role));
  } catch (error) {
    return handleApiError(error);
  }
}
