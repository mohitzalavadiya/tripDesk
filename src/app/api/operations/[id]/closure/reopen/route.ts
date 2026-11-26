import {
  apiSuccess,
  ForbiddenError,
  handleApiError,
  requireWriteAccess,
  validateJson,
  validateRouteParams,
} from "@/lib/api";
import { canAccessFinancialMargins } from "@/lib/auth/permissions";
import { operationsService } from "@/lib/services/operations-service";
import { reopenOperationSchema } from "@/lib/validation/operations-schema";
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
 * POST /api/operations/[id]/closure/reopen
 * Reopens a finalized operation with a mandatory reason.
 * Restricted to Agency Owners.
 */
export async function POST(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    if (!canAccessFinancialMargins(context.dbUser.role)) {
      throw new ForbiddenError("Reopening a finalized tour operation is restricted to Agency Owners.");
    }
    const { id } = validateRouteParams(idParamSchema, await props.params);
    const body = await validateJson(reopenOperationSchema, request);

    const event = await operationsService.reopenOperation(
      context.agencyId,
      id,
      body,
      context.dbUser.id
    );

    return apiSuccess(event);
  } catch (error) {
    return handleApiError(error);
  }
}
