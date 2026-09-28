import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireReadAccess,
  requireWriteAccess,
  apiSuccess,
  handleApiError,
  validateJson,
} from "@/lib/api";
import { updateSupplierPayableSchema } from "@/lib/validation/finance-schema";
import { financeService } from "@/lib/services/finance-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/finance/supplier-payables/[id]
 * Fetch a single payable with related supplier, trip, booking, and payments.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireReadAccess();
    const { id } = await params;

    const payable = await prisma.supplierPayable.findFirst({
      where: {
        id,
        agencyId: context.agencyId,
        archivedAt: null,
      },
      include: {
        supplier: { select: { id: true, name: true, type: true, phone: true } },
        trip: { select: { id: true, tripNumber: true, title: true } },
        booking: { select: { id: true, bookingNumber: true, trip: { select: { id: true, tripNumber: true, title: true } } } },
        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!payable) {
      return handleApiError(new Error("Payable not found or does not belong to your agency."));
    }

    return apiSuccess(payable);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/finance/supplier-payables/[id]
 * Edit a payable (automatic or manual - amount, payee, due date, notes, etc.).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    const body = await validateJson(updateSupplierPayableSchema, request);

    const updated = await financeService.updateSupplierPayable(
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
 * DELETE /api/finance/supplier-payables/[id]
 * Delete/archive a payable (only if no payments recorded).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireWriteAccess();
    const { id } = await params;
    let reason: string | undefined;
    try {
      const url = new URL(request.url);
      reason = url.searchParams.get("reason") || undefined;
    } catch {
      // url parse fallback
    }

    const result = await financeService.deleteSupplierPayable(
      context.agencyId,
      id,
      reason,
      context.dbUser.id
    );
    return apiSuccess(result);
  } catch (error) {
    return handleApiError(error);
  }
}
