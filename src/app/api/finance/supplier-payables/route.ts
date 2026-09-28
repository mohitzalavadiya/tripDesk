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
  createSupplierPayableSchema,
} from "@/lib/validation/finance-schema";
import { financeService } from "@/lib/services/finance-service";
import { SupplierPayableStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/finance/supplier-payables
 * List supplier payables for the agency.
 */
export async function GET(request: NextRequest) {
  try {
    const context = await requireReadAccess();
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;
    const bookingId = searchParams.get("bookingId") || undefined;
    const tripId = searchParams.get("tripId") || undefined;
    const origin = searchParams.get("origin") || undefined;
    const serviceType = searchParams.get("serviceType") || undefined;
    const status = (searchParams.get("status") as SupplierPayableStatus) || undefined;

    const payables = await prisma.supplierPayable.findMany({
      where: {
        agencyId: context.agencyId,
        archivedAt: null,
        ...(supplierId ? { supplierId } : {}),
        ...(bookingId ? { bookingId } : {}),
        ...(tripId ? { tripId } : {}),
        ...(origin ? { origin } : {}),
        ...(serviceType ? { serviceType } : {}),
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { payeeName: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { payableNumber: { contains: search, mode: "insensitive" } },
                { supplier: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      include: {
        supplier: { select: { id: true, name: true, type: true, phone: true } },
        trip: { select: { id: true, tripNumber: true, title: true } },
        booking: { select: { id: true, bookingNumber: true, trip: { select: { id: true, tripNumber: true, title: true } } } },
        payments: { where: { archivedAt: null }, orderBy: { paymentDate: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(payables);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/finance/supplier-payables
 * Create a new supplier payable record.
 */
export async function POST(request: NextRequest) {
  try {
    const context = await requireWriteAccess();
    const body = await validateJson(createSupplierPayableSchema, request);

    const payable = await financeService.createSupplierPayable(
      context.agencyId,
      body,
      context.dbUser.id
    );

    return apiCreated(payable);
  } catch (error) {
    return handleApiError(error);
  }
}
