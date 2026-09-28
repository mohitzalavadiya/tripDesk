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
    const search = searchParams.get("search") || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;
    const payableId = searchParams.get("payableId") || undefined;
    const bookingId = searchParams.get("bookingId") || undefined;

    const payments = await prisma.supplierPayment.findMany({
      where: {
        agencyId: context.agencyId,
        archivedAt: null,
        ...(supplierId ? { supplierId } : {}),
        ...(payableId ? { payableId } : {}),
        ...(bookingId ? { bookingId } : {}),
        ...(search
          ? {
              OR: [
                { payeeName: { contains: search, mode: "insensitive" } },
                { paymentNumber: { contains: search, mode: "insensitive" } },
                { referenceNumber: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
                { supplier: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        supplier: { select: { id: true, name: true, type: true } },
        payable: { select: { id: true, payableNumber: true, payeeName: true, description: true, serviceType: true } },
        booking: { select: { id: true, bookingNumber: true, trip: { select: { id: true, tripNumber: true, title: true } } } },
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
