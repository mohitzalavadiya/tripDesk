import {
apiSuccess,
handleApiError,
requireWriteAccess,
validateJson,
} from "@/lib/api";
import { financeService } from "@/lib/services/finance-service";
import { updateExpenseSchema } from "@/lib/validation/finance-schema";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/finance/expenses/[id]
 * Update operational expense.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(updateExpenseSchema, request);

    const updated = await financeService.updateExpense(
      context.agencyId,
      id,
      body,
      context.dbUser.id
    );

    return apiSuccess(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/finance/expenses/[id]
 * Archive / delete operational expense.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;

    const deleted = await financeService.deleteExpense(
      context.agencyId,
      id,
      context.dbUser.id
    );

    return apiSuccess(deleted);
  } catch (error) {
    return handleApiError(error);
  }
}
