import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  apiCreated,
  handleApiError,
  validateJson,
} from "@/lib/api";
import {
  createExpenseSchema,
} from "@/lib/validation/finance-schema";
import { financeService } from "@/lib/services/finance-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/finance/expenses
 * List operational expenses for the agency.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const { searchParams } = request.nextUrl;
    const tripOperationId = searchParams.get("tripOperationId") || undefined;
    const tripId = searchParams.get("tripId") || undefined;
    const bookingId = searchParams.get("bookingId") || undefined;

    const expenses = await prisma.operationalExpense.findMany({
      where: {
        agencyId: context.agencyId,
        archivedAt: null,
        ...(tripOperationId ? { tripOperationId } : {}),
        ...(tripId ? { tripId } : {}),
        ...(bookingId ? { bookingId } : {}),
      },
      include: {
        trip: { select: { id: true, tripNumber: true, title: true } },
        booking: { select: { id: true, bookingNumber: true } },
      },
      orderBy: { expenseDate: "desc" },
    });

    return apiSuccess(expenses);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/finance/expenses
 * Record an operational expense.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(createExpenseSchema, request);

    const expense = await financeService.createExpense(
      context.agencyId,
      body,
      context.dbUser.id
    );

    return apiCreated(expense);
  } catch (error) {
    return handleApiError(error);
  }
}
