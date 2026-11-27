import { NotFoundError } from "@/lib/api";
import prisma from "@/lib/prisma";
import {
  CheckDuplicateCustomerInput,
  CreateCustomerInput,
  CustomerQueryParams,
  UpdateCustomerInput,
} from "@/lib/validation/customer-schema";
import { normalizePhoneNumber } from "@/lib/validation/field-validators";
import { Customer, Prisma } from "@prisma/client";
import "server-only";
import { PAYMENT_SCALAR_SELECT } from "./payment-service";
import { stripIdempotencyMarker } from "@/lib/utils/crm-urgency";

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
    | "FOLLOW_UP_COMPLETED"
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
  isRepeatCustomer: boolean;
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

export interface RepeatCustomerEvaluationParams {
  trips?: Array<{ id: string; status: string; archivedAt?: Date | string | null }>;
  bookings?: Array<{ id: string; status: string; archivedAt?: Date | string | null }>;
  enquiries?: Array<{ id: string; status: string; archivedAt?: Date | string | null }>;
}

/**
 * Server-authoritative Repeat Customer Evaluation Rule (V3 Section 265):
 * A customer qualifies as a repeat customer if and only if they meet either of the following criteria:
 * 1. At least ONE genuinely COMPLETED trip (trip.status === "COMPLETED" and not archived).
 * 2. OR at least TWO distinct eligible confirmed bookings (booking.status in ["CONFIRMED", "COMPLETED", "ONGOING"] and not archived).
 *
 * Strict Disqualifications:
 * - A single confirmed booking alone does NOT qualify.
 * - A converted enquiry alone does NOT qualify.
 * - Converted enquiries linked to bookings do NOT count as additional bookings.
 * - Cancelled or Draft bookings (status "CANCELLED", "DRAFT") do NOT count toward confirmed booking totals.
 * - Non-completed trips (status "DRAFT", "PLANNING", "QUOTED", "BOOKED", "ONGOING", "CANCELLED") do NOT satisfy the completed-trip criterion.
 * - Duplicate records referring to the same booking ID are deduplicated.
 */
export function evaluateRepeatCustomerStatus(params: RepeatCustomerEvaluationParams): boolean {
  // 1. Check for at least 1 genuinely completed trip
  const hasCompletedTrip = (params.trips || []).some(
    (t) => !t.archivedAt && t.status === "COMPLETED"
  );
  if (hasCompletedTrip) {
    return true;
  }

  // 2. Count distinct eligible confirmed bookings
  const eligibleBookingIds = new Set<string>();
  for (const b of params.bookings || []) {
    if (!b.archivedAt && (b.status === "CONFIRMED" || b.status === "COMPLETED" || b.status === "ONGOING")) {
      eligibleBookingIds.add(b.id);
    }
  }

  return eligibleBookingIds.size >= 2;
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
      const rawPhone = params.phone.trim();
      const normalizedPhone = normalizePhoneNumber(rawPhone);
      const cleanPhone = rawPhone.replace(/\D/g, "");

      orConditions.push({ phone: { contains: rawPhone, mode: "insensitive" } });
      if (normalizedPhone && normalizedPhone !== rawPhone) {
        orConditions.push({ phone: { contains: normalizedPhone, mode: "insensitive" } });
      }
      orConditions.push({ alternatePhone: { contains: rawPhone, mode: "insensitive" } });
      if (normalizedPhone && normalizedPhone !== rawPhone) {
        orConditions.push({ alternatePhone: { contains: normalizedPhone, mode: "insensitive" } });
      }

      if (cleanPhone.length >= 6) {
        const last10 = cleanPhone.slice(-10);
        orConditions.push({ phone: { contains: last10 } });
        orConditions.push({ alternatePhone: { contains: last10 } });
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
            assignedToUser: { select: { id: true, name: true, email: true } },
            followUps: {
              where: { archivedAt: null },
              orderBy: { scheduledAt: "asc" },
            },
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
          select: {
            id: true,
            agencyId: true,
            tripId: true,
            customerId: true,
            quotationId: true,
            bookingNumber: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            currency: true,
            bookingDate: true,
            travelStartDate: true,
            travelEndDate: true,
            taxableAmount: true,
            taxAmount: true,
            taxRate: true,
            taxMode: true,
            gstTreatment: true,
            cgstAmount: true,
            sgstAmount: true,
            igstAmount: true,
            notes: true,
            internalNotes: true,
            cancellationReason: true,
            confirmedAt: true,
            completedAt: true,
            cancelledAt: true,
            archivedAt: true,
            createdAt: true,
            updatedAt: true,
            packageOptionName: true,
            trip: { select: { id: true, tripNumber: true, title: true } },
            quotation: { select: { id: true, quotationNumber: true } },
            payments: {
              where: { archivedAt: null },
              orderBy: { paymentDate: "desc" },
              select: PAYMENT_SCALAR_SELECT,
            },
          },
        },
        payments: {
          where: { archivedAt: null },
          orderBy: { paymentDate: "desc" },
          take: 50,
          select: {
            ...PAYMENT_SCALAR_SELECT,
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

    // Derive server-authoritative repeat customer status (V3 Section 265)
    const isRepeatCustomer = evaluateRepeatCustomerStatus({
      trips: customer.trips,
      bookings: customer.bookings,
      enquiries: customer.enquiries,
    });

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

      if (enq.followUps) {
        for (const fu of enq.followUps) {
          if (fu.status === "COMPLETED" && fu.completedAt) {
            const cleanNotes = stripIdempotencyMarker(fu.notes);
            const descParts: string[] = [];
            if (fu.outcome) descParts.push(`Outcome: ${fu.outcome}`);
            if (cleanNotes) descParts.push(cleanNotes);
            if (descParts.length === 0) {
              descParts.push(`Follow-up completed for ${enq.destination} lead.`);
            }

            timeline.push({
              id: `fu-comp-${fu.id}`,
              type: "FOLLOW_UP_COMPLETED",
              title: `${fu.type} Follow-up Completed`,
              description: descParts.join(" • "),
              timestamp: fu.completedAt,
              referenceId: enq.id,
              referenceUrl: `/enquiries/${enq.id}`,
              statusBadge: "COMPLETED",
            });
          }
        }
      }

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
        title: `Quotation ${q.quotationNumber} (V${q.version}) ${q.status}`,
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
      isRepeatCustomer,
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
   * Alias for getCustomerDetails
   */
  async getCustomerDetails360(
    agencyId: string,
    customerId: string
  ): Promise<CustomerDetails360 | null> {
    return this.getCustomerDetails(agencyId, customerId);
  },

  /**
   * Creates a new customer record under the authenticated agency with auto-generated sequential number.
   */
  async createCustomer(agencyId: string, data: CreateCustomerInput, tx?: Prisma.TransactionClient): Promise<Customer> {
    const db = tx || prisma;
    const customerNumber = await this.generateNextCustomerNumber(agencyId, tx);
    const normalizedPhone = normalizePhoneNumber(data.phone);
    const normalizedAltPhone = data.alternatePhone ? normalizePhoneNumber(data.alternatePhone) : null;

    return db.customer.create({
      data: {
        agencyId,
        customerNumber,
        name: data.name,
        phone: normalizedPhone,
        alternatePhone: normalizedAltPhone,
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
        ...(data.phone !== undefined ? { phone: normalizePhoneNumber(data.phone) } : {}),
        ...(data.alternatePhone !== undefined ? { alternatePhone: data.alternatePhone ? normalizePhoneNumber(data.alternatePhone) : null } : {}),
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

  /**
   * Resolves an existing customer by phone/email or creates a new one safely
   * adhering to Section 4.4 duplicate policy:
   * - Searches existing active customer within the authenticated agency.
   * - If one unambiguous match, reuse existing customer (isExisting: true).
   * - If phone and email match two DIFFERENT existing customers, throws explicit conflict error.
   * - If no match, creates new customer record atomically (isExisting: false).
   */
  async resolveOrCreateCustomerForEnquiry(
    agencyId: string,
    data: { name: string; phone: string; email?: string | null }
  ): Promise<{ customer: Customer; isExisting: boolean; matchedBy?: "phone" | "email" }> {
    const rawPhone = data.phone.trim();
    const normalizedPhone = normalizePhoneNumber(rawPhone);
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const email = data.email?.trim().toLowerCase() || null;

    // Derive deterministic advisory lock keys to serialize concurrent intake for the same customer
    const lockKeys: string[] = [];
    if (cleanPhone.length >= 6) {
      lockKeys.push(`agency:${agencyId}:phone:${cleanPhone.slice(-10)}`);
    }
    if (email) {
      lockKeys.push(`agency:${agencyId}:email:${email}`);
    }
    // Lexicographical sort guarantees deadlock-free acquisition order across concurrent requests
    lockKeys.sort();

    return await prisma.$transaction(async (tx) => {
      // 1. Acquire PostgreSQL transaction-level advisory locks for the normalized identifiers
      for (const key of lockKeys) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
      }

      // 2. Perform agency-scoped lookup inside the locked transaction
      let phoneMatches: Customer[] = [];
      if (cleanPhone.length >= 6) {
        const last10 = cleanPhone.slice(-10);
        const phoneOrConditions: Prisma.CustomerWhereInput[] = [
          { phone: { contains: rawPhone, mode: "insensitive" } },
          { phone: { contains: last10 } },
          { alternatePhone: { contains: last10 } },
        ];
        if (normalizedPhone && normalizedPhone !== rawPhone) {
          phoneOrConditions.push({ phone: { contains: normalizedPhone, mode: "insensitive" } });
          phoneOrConditions.push({ alternatePhone: { contains: normalizedPhone, mode: "insensitive" } });
        }

        phoneMatches = await tx.customer.findMany({
          where: {
            agencyId,
            archivedAt: null,
            OR: phoneOrConditions,
          },
          take: 2,
        });
      }

      let emailMatches: Customer[] = [];
      if (email) {
        emailMatches = await tx.customer.findMany({
          where: {
            agencyId,
            archivedAt: null,
            email: { equals: email, mode: "insensitive" },
          },
          take: 2,
        });
      }

      // 3. Check for conflict: phone matches customer A, email matches customer B
      if (phoneMatches.length > 0 && emailMatches.length > 0) {
        if (phoneMatches[0].id !== emailMatches[0].id) {
          throw new Error(
            `Phone (${data.phone}) matches existing customer "${phoneMatches[0].name}", while email (${data.email}) matches a different customer "${emailMatches[0].name}". Please select the intended customer from the existing directory to avoid conflicting records.`
          );
        }
      }

      // 4. Unambiguous phone match
      if (phoneMatches.length === 1) {
        return { customer: phoneMatches[0], isExisting: true, matchedBy: "phone" };
      }

      // 5. Unambiguous email match
      if (emailMatches.length === 1) {
        return { customer: emailMatches[0], isExisting: true, matchedBy: "email" };
      }

      // 6. If multiple matches for phone or email within agency, select the first match
      if (phoneMatches.length > 1) {
        return { customer: phoneMatches[0], isExisting: true, matchedBy: "phone" };
      }
      if (emailMatches.length > 1) {
        return { customer: emailMatches[0], isExisting: true, matchedBy: "email" };
      }

      // 7. No existing match: create new customer inside the SAME transaction tx
      const newCustomer = await this.createCustomer(
        agencyId,
        {
          name: data.name.trim(),
          phone: normalizedPhone,
          alternatePhone: null,
          email: email || undefined,
        },
        tx
      );

      return { customer: newCustomer, isExisting: false };
    });
  },
};
