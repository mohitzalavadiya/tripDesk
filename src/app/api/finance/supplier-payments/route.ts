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
  recordSupplierPaymentSchema,
} from "@/lib/validation/finance-schema";
import { financeService } from "@/lib/services/finance-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/finance/supplier-payments
 * List supplier payments / disbursements.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const { searchParams } = request.nextUrl;
    const supplierId = searchParams.get("supplierId") || undefined;
    const payableId = searchParams.get("payableId") || undefined;

    const payments = await prisma.supplierPayment.findMany({
      where: {
        agencyId: context.agencyId,
        archivedAt: null,
        ...(supplierId ? { supplierId } : {}),
        ...(payableId ? { payableId } : {}),
      },
      include: {
        supplier: { select: { id: true, name: true, type: true } },
        payable: true,
      },
      orderBy: { paymentDate: "desc" },
    });

    return apiSuccess(payments);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/finance/supplier-payments
 * Record a disbursement to a supplier.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(recordSupplierPaymentSchema, request);

    const payment = await financeService.recordSupplierPayment(
      context.agencyId,
      body,
      context.dbUser.id
    );

    return apiCreated(payment);
  } catch (error) {
    return handleApiError(error);
  }
}
