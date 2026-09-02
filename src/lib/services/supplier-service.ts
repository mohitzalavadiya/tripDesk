import "server-only";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/api";
import {
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierQueryParams,
} from "@/lib/validation/supplier-schema";
import { Supplier, Prisma } from "@prisma/client";

export interface SupplierWithCounts extends Supplier {
  _count?: {
    hotels: number;
    vehicles: number;
    activities: number;
    rateSheets: number;
  };
}

export interface SupplierDetails360 extends Supplier {
  hotels: any[];
  vehicles: any[];
  activities: any[];
  rateSheets: any[];
  activeRateSheets: any[];
  expiredRateSheets: any[];
  hotelConfirmations: any[];
  payables: any[];
  payments: any[];
  financialSummary: {
    totalPayableAmount: number;
    totalPaidAmount: number;
    totalOutstandingAmount: number;
    pendingPayablesCount: number;
  };
  operationalSummary: {
    totalConfirmationsCount: number;
    activeConfirmationsCount: number;
    completedConfirmationsCount: number;
    linkedHotelsCount: number;
    linkedVehiclesCount: number;
    linkedActivitiesCount: number;
  };
}

export const supplierService = {
  /**
   * Generates sequential supplier code scoped per agency per calendar year: SUP-YYYY-XXXXX
   */
  async generateNextSupplierCode(agencyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SUP-${year}-`;

    const lastSupplier = await prisma.supplier.findFirst({
      where: {
        agencyId,
        supplierCode: { startsWith: prefix },
      },
      orderBy: { supplierCode: "desc" },
      select: { supplierCode: true },
    });

    let nextNumber = 1;
    if (lastSupplier?.supplierCode) {
      const parts = lastSupplier.supplierCode.split("-");
      if (parts.length === 3) {
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1;
        }
      }
    }

    return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
  },

  /**
   * Lists suppliers for the agency with filters and pagination.
   */
  async listSuppliers(
    agencyId: string,
    params: Partial<SupplierQueryParams> = {}
  ): Promise<{
    items: SupplierWithCounts[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {
      agencyId,
      ...(params.includeArchived ? {} : { archivedAt: null }),
      ...(params.status ? { status: params.status } : {}),
      ...(params.city ? { city: { contains: params.city, mode: "insensitive" } } : {}),
      ...(params.type ? { type: { contains: params.type, mode: "insensitive" } } : {}),
    };

    if (params.search?.trim()) {
      const term = params.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { supplierCode: { contains: term, mode: "insensitive" } },
        { phone: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
        { city: { contains: term, mode: "insensitive" } },
        { contactPerson: { contains: term, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [params.sortBy || "createdAt"]: params.sortOrder || "desc",
        },
        include: {
          _count: {
            select: {
              hotels: true,
              vehicles: true,
              activities: true,
              rateSheets: true,
              hotelConfirmations: true,
              payables: true,
              payments: true,
            },
          },
        },
      }),
      prisma.supplier.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  /**
   * Retrieves single supplier by ID after tenancy check.
   */
  async getSupplierById(agencyId: string, id: string): Promise<SupplierWithCounts | null> {
    return prisma.supplier.findFirst({
      where: { id, agencyId },
      include: {
        _count: {
          select: {
            hotels: true,
            vehicles: true,
            activities: true,
            rateSheets: true,
            hotelConfirmations: true,
            payables: true,
            payments: true,
          },
        },
      },
    });
  },

  /**
   * Retrieves Supplier 360 profile with linked inventories, rate sheets, operational confirmations, and financial payables.
   */
  async getSupplierDetails(agencyId: string, id: string): Promise<SupplierDetails360 | null> {
    const supplier = await prisma.supplier.findFirst({
      where: { id, agencyId },
      include: {
        hotels: {
          where: { archivedAt: null },
          orderBy: { name: "asc" },
        },
        vehicles: {
          where: { archivedAt: null },
          orderBy: { name: "asc" },
        },
        activities: {
          where: { archivedAt: null },
          orderBy: { name: "asc" },
        },
        rateSheets: {
          where: { archivedAt: null },
          include: {
            hotel: { select: { id: true, name: true, city: true } },
            vehicle: { select: { id: true, name: true, type: true } },
            activity: { select: { id: true, name: true, location: true } },
          },
          orderBy: [{ validFrom: "desc" }, { createdAt: "desc" }],
        },
        hotelConfirmations: {
          include: {
            tripHotel: { include: { hotel: true } },
            tripOperation: {
              include: {
                trip: {
                  select: {
                    id: true,
                    tripNumber: true,
                    title: true,
                    status: true,
                    startDate: true,
                    endDate: true,
                  },
                },
                booking: {
                  select: {
                    id: true,
                    bookingNumber: true,
                    status: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        payables: {
          include: {
            booking: {
              select: {
                id: true,
                bookingNumber: true,
              },
            },
            payments: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!supplier) {
      return null;
    }

    const now = new Date();
    const activeRateSheets = supplier.rateSheets.filter(
      (rs) => rs.status === "ACTIVE" && new Date(rs.validTo) >= now
    );
    const expiredRateSheets = supplier.rateSheets.filter(
      (rs) => rs.status === "EXPIRED" || new Date(rs.validTo) < now
    );

    // Compute live financial summary
    let totalPayableAmount = 0;
    let totalPaidAmount = 0;
    let totalOutstandingAmount = 0;
    let pendingPayablesCount = 0;

    for (const p of supplier.payables) {
      const actual = Number(p.actualAmount || p.plannedAmount || 0);
      const paid = Number(p.paidAmount || 0);
      const outstanding = Number(p.outstandingAmount || 0);

      totalPayableAmount += actual;
      totalPaidAmount += paid;
      totalOutstandingAmount += outstanding;

      if (p.status === "PENDING" || p.status === "PARTIALLY_PAID") {
        pendingPayablesCount++;
      }
    }

    // Compute operational summary
    const totalConfirmationsCount = supplier.hotelConfirmations.length;
    let activeConfirmationsCount = 0;
    let completedConfirmationsCount = 0;

    for (const c of supplier.hotelConfirmations) {
      if (c.status === "CONFIRMED" || c.status === "REQUESTED") {
        activeConfirmationsCount++;
      } else if (c.status === "AMENDED") {
        completedConfirmationsCount++;
      }
    }

    return {
      ...supplier,
      activeRateSheets,
      expiredRateSheets,
      financialSummary: {
        totalPayableAmount: Number(totalPayableAmount.toFixed(2)),
        totalPaidAmount: Number(totalPaidAmount.toFixed(2)),
        totalOutstandingAmount: Number(totalOutstandingAmount.toFixed(2)),
        pendingPayablesCount,
      },
      operationalSummary: {
        totalConfirmationsCount,
        activeConfirmationsCount,
        completedConfirmationsCount,
        linkedHotelsCount: supplier.hotels.length,
        linkedVehiclesCount: supplier.vehicles.length,
        linkedActivitiesCount: supplier.activities.length,
      },
    };
  },

  /**
   * Creates a new supplier with sequential code.
   */
  async createSupplier(agencyId: string, data: CreateSupplierInput): Promise<Supplier> {
    const supplierCode = await this.generateNextSupplierCode(agencyId);

    return prisma.supplier.create({
      data: {
        agencyId,
        supplierCode,
        name: data.name,
        type: data.type || "Hotel Supplier",
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        alternatePhone: data.alternatePhone || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || "India",
        postalCode: data.postalCode || null,
        gstNumber: data.gstNumber || null,
        panNumber: data.panNumber || null,
        paymentTerms: data.paymentTerms || null,
        bankDetails: data.bankDetails || null,
        notes: data.notes || null,
        internalNotes: data.internalNotes || null,
        status: data.status || "ACTIVE",
      },
    });
  },

  /**
   * Updates an existing supplier record.
   */
  async updateSupplier(
    agencyId: string,
    id: string,
    data: UpdateSupplierInput
  ): Promise<Supplier> {
    const existing = await prisma.supplier.findFirst({
      where: { id, agencyId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError("Supplier");
    }

    return prisma.supplier.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.contactPerson !== undefined ? { contactPerson: data.contactPerson || null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.alternatePhone !== undefined ? { alternatePhone: data.alternatePhone || null } : {}),
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        ...(data.address !== undefined ? { address: data.address || null } : {}),
        ...(data.city !== undefined ? { city: data.city || null } : {}),
        ...(data.state !== undefined ? { state: data.state || null } : {}),
        ...(data.country !== undefined ? { country: data.country } : {}),
        ...(data.postalCode !== undefined ? { postalCode: data.postalCode || null } : {}),
        ...(data.gstNumber !== undefined ? { gstNumber: data.gstNumber || null } : {}),
        ...(data.panNumber !== undefined ? { panNumber: data.panNumber || null } : {}),
        ...(data.paymentTerms !== undefined ? { paymentTerms: data.paymentTerms || null } : {}),
        ...(data.bankDetails !== undefined ? { bankDetails: data.bankDetails || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
        ...(data.internalNotes !== undefined ? { internalNotes: data.internalNotes || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
  },

  /**
   * Deactivates / soft archives a supplier.
   */
  async archiveSupplier(agencyId: string, id: string): Promise<Supplier> {
    const existing = await prisma.supplier.findFirst({
      where: { id, agencyId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError("Supplier");
    }

    return prisma.supplier.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        status: "INACTIVE",
      },
    });
  },

  /**
   * Reactivates an archived or inactive supplier.
   */
  async reactivateSupplier(agencyId: string, id: string): Promise<Supplier> {
    const existing = await prisma.supplier.findFirst({
      where: { id, agencyId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundError("Supplier");
    }

    return prisma.supplier.update({
      where: { id },
      data: {
        archivedAt: null,
        status: "ACTIVE",
      },
    });
  },

  /**
   * Deletes a supplier permanently ONLY if no historical dependencies exist.
   * If historical records exist (bookings, payables, confirmations), throws an error to protect audit history.
   */
  async deleteSupplier(agencyId: string, id: string): Promise<Supplier> {
    const supplier = await prisma.supplier.findFirst({
      where: { id, agencyId },
      include: {
        _count: {
          select: {
            hotels: true,
            vehicles: true,
            activities: true,
            rateSheets: true,
            hotelConfirmations: true,
            payables: true,
            payments: true,
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundError("Supplier");
    }

    const counts = supplier._count;
    const hasHistoricalRecords =
      (counts?.payables ?? 0) > 0 ||
      (counts?.payments ?? 0) > 0 ||
      (counts?.hotelConfirmations ?? 0) > 0 ||
      (counts?.hotels ?? 0) > 0 ||
      (counts?.vehicles ?? 0) > 0 ||
      (counts?.activities ?? 0) > 0 ||
      (counts?.rateSheets ?? 0) > 0;

    if (hasHistoricalRecords) {
      throw new Error(
        "Cannot permanently delete supplier with linked inventory, operations, or financial records. Deactivate or archive the supplier instead to maintain audit integrity."
      );
    }

    return prisma.supplier.delete({
      where: { id },
    });
  },

  /**
   * Checks for potential duplicate suppliers under the same agency.
   */
  async checkDuplicateSupplier(
    agencyId: string,
    params: { name: string; phone?: string; email?: string; excludeId?: string }
  ): Promise<{
    isDuplicate: boolean;
    matches: Array<{
      id: string;
      name: string;
      supplierCode: string | null;
      phone: string | null;
      email: string | null;
      type: string | null;
      status: string;
    }>;
  }> {
    const { name, phone, email, excludeId } = params;
    const targetName = name?.trim().toLowerCase();
    const targetEmail = email?.trim().toLowerCase();
    const targetPhoneDigits = phone?.replace(/\D/g, "");

    if (!targetName && !targetEmail && !targetPhoneDigits) {
      return { isDuplicate: false, matches: [] };
    }

    const candidates = await prisma.supplier.findMany({
      where: {
        agencyId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        name: true,
        supplierCode: true,
        phone: true,
        email: true,
        type: true,
        status: true,
      },
      take: 200,
    });

    const matches = candidates.filter((c) => {
      if (targetName && c.name.trim().toLowerCase() === targetName) return true;
      if (targetEmail && c.email?.trim().toLowerCase() === targetEmail) return true;
      if (targetPhoneDigits && targetPhoneDigits.length >= 6) {
        const candidateDigits = (c.phone || "").replace(/\D/g, "");
        if (
          candidateDigits.length >= 6 &&
          (candidateDigits.endsWith(targetPhoneDigits.slice(-10)) ||
            targetPhoneDigits.endsWith(candidateDigits.slice(-10)))
        ) {
          return true;
        }
      }
      return false;
    }).slice(0, 5);

    return {
      isDuplicate: matches.length > 0,
      matches,
    };
  },
};

