import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/api";
import {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerQueryParams,
  CheckDuplicateCustomerInput,
} from "@/lib/validation/customer-schema";
import { Customer, Prisma } from "@prisma/client";

export interface CustomerWithCounts extends Customer {
  _count?: {
    enquiries: number;
    trips: number;
    quotations: number;
    bookings: number;
    payments: number;
  };
}

export interface PaginatedCustomersResult {
  items: CustomerWithCounts[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerActivityEvent {
  id: string;
  type:
    | "CUSTOMER_CREATED"
    | "ENQUIRY_CREATED"
    | "ENQUIRY_CONVERTED"
    | "TRIP_CREATED"
    | "QUOTATION_CREATED"
    | "QUOTATION_ACCEPTED"
    | "BOOKING_CREATED"
    | "BOOKING_CONFIRMED"
    | "PAYMENT_RECEIVED";
  title: string;
  description: string;
  timestamp: Date;
  referenceId?: string;
  referenceUrl?: string;
  statusBadge?: string;
  amount?: number;
}

export interface CustomerDetails360 extends Customer {
  enquiries: any[];
  trips: any[];
  quotations: any[];
  bookings: any[];
  payments: any[];
  financials: {
    totalEnquiries: number;
    totalTrips: number;
    totalQuotations: number;
    totalBookings: number;
    totalPaid: number;
    totalOutstandingBalance: number;
    totalSpent: number;
  };
  timeline: CustomerActivityEvent[];
}

export const customerService = {
  /**
   * Generates a collision-resistant sequential customer number per agency per year (e.g. CUS-2026-00001).
   */
  async generateNextCustomerNumber(agencyId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const db = tx || prisma;
    const currentYear = new Date().getFullYear();
    const prefix = `CUS-${currentYear}-`;

    const lastCustomer = await db.customer.findFirst({
      where: {
        agencyId,
        customerNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        customerNumber: "desc",
      },
      select: {
        customerNumber: true,
      },
    });

    let nextSeq = 1;
    if (lastCustomer?.customerNumber) {
      const parts = lastCustomer.customerNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(5, "0")}`;
  },

  /**
   * Checks for potential duplicate customer records within the agency by phone, email, or name.
   */
  async checkDuplicateCustomer(
    agencyId: string,
    params: CheckDuplicateCustomerInput
  ): Promise<{ duplicates: Customer[]; matchCount: number }> {
    const orConditions: Prisma.CustomerWhereInput[] = [];

    if (params.phone?.trim()) {
      const cleanPhone = params.phone.trim().replace(/\D/g, "");
      orConditions.push({
        phone: {
          contains: cleanPhone.length > 5 ? cleanPhone.slice(-10) : params.phone.trim(),
        },
      });
      if (params.phone.trim().length >= 5) {
        orConditions.push({ alternatePhone: { contains: params.phone.trim() } });
      }
    }

    if (params.email?.trim()) {
      orConditions.push({
        email: {
          equals: params.email.trim(),
          mode: "insensitive",
        },
      });
    }

    if (orConditions.length === 0) {
      return { duplicates: [], matchCount: 0 };
    }

    const duplicates = await prisma.customer.findMany({
      where: {
        agencyId,
        archivedAt: null,
        OR: orConditions,
      },
      take: 5,
    });

    return {
      duplicates,
      matchCount: duplicates.length,
    };
  },

  /**
   * Retrieves a paginated list of customers strictly scoped to the authenticated agency.
   * Excludes soft-deleted/archived customers by default.
   */
  async listCustomers(
    agencyId: string,
    params: CustomerQueryParams = {}
  ): Promise<PaginatedCustomersResult> {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const { search, city, source, sortBy = "createdAt", sortOrder = "desc", includeArchived } = params;
    const skip = (page - 1) * limit;

    // Multi-field search
    const searchFilter: Prisma.CustomerWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { customerNumber: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { alternatePhone: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const where: Prisma.CustomerWhereInput = {
      agencyId,
      ...(includeArchived ? {} : { archivedAt: null }),
      ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
      ...(source ? { source } : {}),
      ...searchFilter,
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              enquiries: true,
              trips: true,
              quotations: true,
              bookings: true,
              payments: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items as CustomerWithCounts[],
      total,
      page,
      limit,
      totalPages,
    };
  },

  /**
   * Retrieves a single customer record by ID, strictly enforcing agency tenancy.
   */
  async getCustomerById(agencyId: string, customerId: string): Promise<Customer | null> {
    return prisma.customer.findFirst({
      where: {
        id: customerId,
        agencyId,
      },
    });
  },

  /**
   * Retrieves a comprehensive 360-degree Customer profile including enquiries, trips,
   * quotations, bookings, payments, financial aggregates, and derived activity timeline.
   */
  async getCustomerDetails(
    agencyId: string,
    customerId: string
  ): Promise<CustomerDetails360 | null> {
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        agencyId,
      },
      include: {
        enquiries: {
          where: { archivedAt: null },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            convertedTrip: { select: { id: true, tripNumber: true, title: true } },
          },
        },
        trips: {
          where: { archivedAt: null },
          orderBy: { startDate: "desc" },
          take: 50,
          include: {
            travelers: true,
            _count: { select: { travelers: true, quotations: true, bookings: true } },
          },
        },
        quotations: {
          where: { archivedAt: null },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            trip: { select: { id: true, tripNumber: true, title: true } },
          },
        },
        bookings: {
          where: { archivedAt: null },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            trip: { select: { id: true, tripNumber: true, title: true } },
            quotation: { select: { id: true, quotationNumber: true } },
            payments: {
              where: { archivedAt: null },
              orderBy: { paymentDate: "desc" },
            },
          },
        },
        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "desc" },
          take: 50,
          include: {
            booking: { select: { id: true, bookingNumber: true } },
            trip: { select: { id: true, tripNumber: true, title: true } },
          },
        },
      },
    });

    if (!customer) {
      return null;
    }

    // Decimal-safe financial totals
    let totalSpent = 0;
    let totalPaid = 0;
    let totalOutstandingBalance = 0;

    for (const b of customer.bookings) {
      totalSpent += Number(b.totalAmount || 0);
      totalPaid += Number(b.paidAmount || 0);
      totalOutstandingBalance += Number(b.balanceAmount || 0);
    }

    // Derive unified CRM activity timeline
    const timeline: CustomerActivityEvent[] = [];

    timeline.push({
      id: `cus-created-${customer.id}`,
      type: "CUSTOMER_CREATED",
      title: "Customer Profile Created",
      description: `Registered in agency directory (${customer.customerNumber || "Initial profile"}).`,
      timestamp: customer.createdAt,
    });

    for (const enq of customer.enquiries) {
      timeline.push({
        id: `enq-${enq.id}`,
        type: "ENQUIRY_CREATED",
        title: `Enquiry ${enq.enquiryNumber} Captured`,
        description: `Trip inquiry for ${enq.destination} (${enq.adults} Adults, ${enq.children} Children).`,
        timestamp: enq.createdAt,
        referenceId: enq.id,
        referenceUrl: `/enquiries/${enq.id}`,
        statusBadge: enq.status,
        amount: enq.budget ? Number(enq.budget) : undefined,
      });

      if (enq.status === "CONVERTED" && enq.closedAt) {
        timeline.push({
          id: `enq-conv-${enq.id}`,
          type: "ENQUIRY_CONVERTED",
          title: `Enquiry ${enq.enquiryNumber} Converted to Trip`,
          description: `Successfully converted to trip workspace.`,
          timestamp: enq.closedAt,
          referenceId: enq.convertedTripId || undefined,
          referenceUrl: enq.convertedTripId ? `/trips/${enq.convertedTripId}` : undefined,
        });
      }
    }

    for (const tr of customer.trips) {
      timeline.push({
        id: `trip-${tr.id}`,
        type: "TRIP_CREATED",
        title: `Trip ${tr.tripNumber} Initialized`,
        description: `${tr.title} planned for ${new Date(tr.startDate).toLocaleDateString("en-IN")}.`,
        timestamp: tr.createdAt,
        referenceId: tr.id,
        referenceUrl: `/trips/${tr.id}`,
        statusBadge: tr.status,
      });
    }

    for (const q of customer.quotations) {
      timeline.push({
        id: `quot-${q.id}`,
        type: q.status === "ACCEPTED" ? "QUOTATION_ACCEPTED" : "QUOTATION_CREATED",
        title: `Quotation ${q.quotationNumber} (v${q.version}) ${q.status}`,
        description: `Proposal generated for ₹${Number(q.finalAmount).toLocaleString("en-IN")}.`,
        timestamp: q.createdAt,
        referenceId: q.id,
        referenceUrl: `/trips/${q.tripId}/quotation`,
        statusBadge: q.status,
        amount: Number(q.finalAmount),
      });
    }

    for (const bk of customer.bookings) {
      timeline.push({
        id: `bk-${bk.id}`,
        type: bk.status === "CONFIRMED" ? "BOOKING_CONFIRMED" : "BOOKING_CREATED",
        title: `Booking ${bk.bookingNumber} Confirmed`,
        description: `Total ₹${Number(bk.totalAmount).toLocaleString("en-IN")} • Status: ${bk.status}.`,
        timestamp: bk.createdAt,
        referenceId: bk.id,
        referenceUrl: `/bookings/${bk.id}`,
        statusBadge: bk.status,
        amount: Number(bk.totalAmount),
      });
    }

    for (const p of customer.payments) {
      timeline.push({
        id: `pay-${p.id}`,
        type: "PAYMENT_RECEIVED",
        title: `Payment ${p.paymentNumber} Recorded`,
        description: `Received ₹${Number(p.amount).toLocaleString("en-IN")} via ${p.paymentMethod}.`,
        timestamp: p.paymentDate || p.createdAt,
        referenceId: p.id,
        referenceUrl: `/bookings/${p.bookingId}`,
        statusBadge: p.status,
        amount: Number(p.amount),
      });
    }

    // Sort timeline descending by timestamp
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      ...customer,
      financials: {
        totalEnquiries: customer.enquiries.length,
        totalTrips: customer.trips.length,
        totalQuotations: customer.quotations.length,
        totalBookings: customer.bookings.length,
        totalPaid,
        totalOutstandingBalance,
        totalSpent,
      },
      timeline,
    };
  },

  /**
   * Creates a new customer record under the authenticated agency with auto-generated sequential number.
   */
  async createCustomer(agencyId: string, data: CreateCustomerInput): Promise<Customer> {
    const customerNumber = await this.generateNextCustomerNumber(agencyId);

    return prisma.customer.create({
      data: {
        agencyId,
        customerNumber,
        name: data.name,
        phone: data.phone,
        alternatePhone: data.alternatePhone || null,
        email: data.email || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || null,
        nationality: data.nationality || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || "India",
        postalCode: data.postalCode || null,
        source: data.source || null,
        notes: data.notes || null,
        internalNotes: data.internalNotes || null,
      },
    });
  },

  /**
   * Updates an existing customer record after verifying agency ownership.
   */
  async updateCustomer(
    agencyId: string,
    customerId: string,
    data: UpdateCustomerInput
  ): Promise<Customer> {
    const existing = await prisma.customer.findFirst({
      where: {
        id: customerId,
        agencyId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Customer");
    }

    if (existing.archivedAt) {
      throw new NotFoundError("Active customer");
    }

    return prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.alternatePhone !== undefined ? { alternatePhone: data.alternatePhone || null } : {}),
        ...(data.email !== undefined ? { email: data.email || null } : {}),
        ...(data.dateOfBirth !== undefined ? { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null } : {}),
        ...(data.gender !== undefined ? { gender: data.gender || null } : {}),
        ...(data.nationality !== undefined ? { nationality: data.nationality || null } : {}),
        ...(data.address !== undefined ? { address: data.address || null } : {}),
        ...(data.city !== undefined ? { city: data.city || null } : {}),
        ...(data.state !== undefined ? { state: data.state || null } : {}),
        ...(data.country !== undefined ? { country: data.country || null } : {}),
        ...(data.postalCode !== undefined ? { postalCode: data.postalCode || null } : {}),
        ...(data.source !== undefined ? { source: data.source || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
        ...(data.internalNotes !== undefined ? { internalNotes: data.internalNotes || null } : {}),
      },
    });
  },

  /**
   * Performs a soft delete by marking archivedAt with current timestamp.
   */
  async archiveCustomer(agencyId: string, customerId: string): Promise<Customer> {
    const existing = await prisma.customer.findFirst({
      where: {
        id: customerId,
        agencyId,
      },
    });

    if (!existing) {
      throw new NotFoundError("Customer");
    }

    if (existing.archivedAt) {
      return existing;
    }

    return prisma.customer.update({
      where: { id: customerId },
      data: {
        archivedAt: new Date(),
      },
    });
  },
};
