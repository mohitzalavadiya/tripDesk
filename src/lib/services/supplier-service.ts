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
  activeRateSheets: any[];
  expiredRateSheets: any[];
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
          },
        },
      },
    });
  },

  /**
   * Retrieves Supplier 360 profile with linked inventories and rate sheets.
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

    return {
      ...supplier,
      activeRateSheets,
      expiredRateSheets,
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
   * Soft archives a supplier.
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
};
