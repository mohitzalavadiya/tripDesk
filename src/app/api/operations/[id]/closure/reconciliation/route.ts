import {
apiSuccess,
handleApiError,
requireWriteAccess,
validateJson,
validateRouteParams,
} from "@/lib/api";
import { operationsService } from "@/lib/services/operations-service";
import { financialReconciliationSchema } from "@/lib/validation/operations-schema";
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
 * PATCH /api/operations/[id]/closure/reconciliation
 * Records or updates the internal financial and cost reconciliation.
 */
export async function PATCH(request: NextRequest, props: RouteProps) {
  try {
    const context = await requireWriteAccess();
    const { id } = validateRouteParams(idParamSchema, await props.params);
    const body = await validateJson(financialReconciliationSchema, request);

    const event = await operationsService.saveFinancialReconciliation(
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
