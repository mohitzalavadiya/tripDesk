import "server-only";
import { prisma } from "@/lib/prisma";
import {
  AgencyStatus,
  SubscriptionStatus,
  SubscriptionPaymentStatus,
  PaymentMethod,
  UserRole,
  Prisma,
} from "@prisma/client";
import {
  AdminAgencyFilterInput,
  PlanCreateInput,
  PlanUpdateInput,
  AnnouncementCreateInput,
  AnnouncementUpdateInput,
  SubscriptionPaymentFilterInput,
  SubscriptionPaymentCreateInput,
  SubscriptionPaymentVerifyInput,
  SubscriptionPaymentRejectInput,
} from "@/lib/validation/admin-schema";

export interface SubscriptionPaymentSummaryStats {
  totalExpected: number;
  totalVerified: number;
  pendingCount: number;
  pendingAmount: number;
  outstandingAmount: number;
  currentMonthCollections: number;
}

export interface AdminSubscriptionPaymentItem {
  id: string;
  agencyId: string;
  agencyName: string;
  agencyEmail: string;
  agencyPhone: string;
  subscriptionId: string;
  planId: string;
  planName: string;
  planPrice: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  utrNumber: string | null;
  paymentDate: string;
  status: SubscriptionPaymentStatus;
  notes: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}


// ═════════════════════════════════════════════════════════════════════
// 1. DATA CONTRACTS & INTERFACES
// ═════════════════════════════════════════════════════════════════════

export interface PlatformOverviewStats {
  totalAgencies: number;
  activeAgencies: number;
  trialAgencies: number;
  expiredTrialAgencies: number;
  suspendedAgencies: number;
  cancelledAgencies: number;
  totalPlatformUsers: number;
  activeAgencyOwners: number;
  totalCustomers: number;
  totalBookings: number;
  totalEnquiries: number;
  totalQuotations: number;
  platformSubscriptionRevenue: number;
  mrr: number;
  arr: number;
  agencyBookingVolume: number;
  recentSignups: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    status: AgencyStatus;
    planName: string;
    subscriptionStatus: SubscriptionStatus;
    createdAt: string;
    ownerName: string;
    ownerEmail: string;
  }>;
  expiringTrials: Array<{
    id: string;
    name: string;
    email: string;
    ownerName: string;
    trialEnd: string;
    daysRemaining: number;
  }>;
}

export interface AdminAgencyListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  logo?: string | null;
  status: AgencyStatus;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  subscription: {
    id: string;
    status: SubscriptionStatus;
    planName: string;
    planPrice: number;
    trialEnd?: string | null;
    daysRemaining: number;
    isTrialExpired: boolean;
  } | null;
  usage: {
    customersCount: number;
    enquiriesCount: number;
    quotationsCount: number;
    bookingsCount: number;
    tripsCount: number;
  };
}

export interface Agency360Details {
  identity: {
    id: string;
    name: string;
    email: string;
    phone: string;
    logo?: string | null;
    address?: string | null;
    status: AgencyStatus;
    createdAt: string;
    updatedAt: string;
  };
  owner: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    role: UserRole;
    createdAt: string;
  } | null;
  subscription: {
    id: string;
    status: SubscriptionStatus;
    trialStart?: string | null;
    trialEnd?: string | null;
    subscriptionStart?: string | null;
    subscriptionEnd?: string | null;
    daysRemaining: number;
    isTrialExpired: boolean;
    plan: {
      id: string;
      name: string;
      description?: string | null;
      price: number;
      durationDays: number;
    } | null;
  } | null;
  usageTelemetry: {
    customers: number;
    trips: number;
    quotations: number;
    bookings: number;
    enquiries: number;
    suppliers: number;
    documents: number;
    communications: number;
    payments: number;
  };
  auditLogs: Array<{
    id: string;
    action: string;
    actorUserId: string;
    entityType: string;
    entityId?: string | null;
    metadata?: any;
    createdAt: string;
  }>;
}

export interface PlatformUsageAnalytics {
  growth: Array<{
    month: string;
    newAgencies: number;
    activeAgencies: number;
  }>;
  productAdoption: {
    totalCustomers: number;
    totalEnquiries: number;
    totalQuotations: number;
    totalBookings: number;
    totalDocuments: number;
    totalCommunications: number;
  };
}

export interface GlobalSearchResult {
  type: "AGENCY" | "USER" | "CUSTOMER" | "BOOKING" | "ENQUIRY" | "QUOTATION";
  id: string;
  title: string;
  subtitle: string;
  agencyId?: string;
  agencyName?: string;
  url: string;
}

// ═════════════════════════════════════════════════════════════════════
// 2. SUPER ADMIN SERVICE IMPLEMENTATION
// ═════════════════════════════════════════════════════════════════════

export const adminService = {
  /**
   * 1. High-Level SaaS Executive Overview & Platform KPIs
   */
  async getPlatformOverview(): Promise<PlatformOverviewStats> {
    const now = new Date();

    const [
      totalAgencies,
      activeAgencies,
      suspendedAgencies,
      cancelledAgencies,
      totalUsers,
      agencyOwners,
      totalCustomers,
      totalBookings,
      totalEnquiries,
      totalQuotations,
      subscriptions,
      recentAgencies,
      bookingSums,
    ] = await Promise.all([
      prisma.agency.count(),
      prisma.agency.count({ where: { status: AgencyStatus.ACTIVE } }),
      prisma.agency.count({ where: { status: AgencyStatus.SUSPENDED } }),
      prisma.agency.count({ where: { status: AgencyStatus.CANCELLED } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRole.AGENCY_OWNER } }),
      prisma.customer.count(),
      prisma.booking.count(),
      prisma.enquiry.count(),
      prisma.quotation.count(),
      prisma.subscription.findMany({
        include: { plan: true, agency: true },
      }),
      prisma.agency.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          users: { where: { role: UserRole.AGENCY_OWNER }, take: 1 },
          subscriptions: {
            include: { plan: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.booking.aggregate({
        _sum: { totalAmount: true },
      }),
    ]);

    let trialAgencies = 0;
    let expiredTrialAgencies = 0;
    let platformSubscriptionRevenue = 0;
    const expiringTrials: PlatformOverviewStats["expiringTrials"] = [];

    subscriptions.forEach((sub) => {
      if (sub.status === SubscriptionStatus.TRIAL) {
        if (sub.trialEnd) {
          const end = new Date(sub.trialEnd).getTime();
          const daysLeft = Math.ceil((end - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft > 0) {
            trialAgencies++;
            if (daysLeft <= 3 && sub.agency) {
              expiringTrials.push({
                id: sub.agency.id,
                name: sub.agency.name,
                email: sub.agency.email,
                ownerName: sub.agency.name,
                trialEnd: sub.trialEnd.toISOString(),
                daysRemaining: daysLeft,
              });
            }
          } else {
            expiredTrialAgencies++;
          }
        } else {
          trialAgencies++;
        }
      } else if (sub.status === SubscriptionStatus.ACTIVE) {
        const price = sub.plan ? Number(sub.plan.price) : 0;
        platformSubscriptionRevenue += price;
      }
    });

    const mrr = platformSubscriptionRevenue; // Monthly normalized
    const arr = mrr * 12;
    const agencyBookingVolume = bookingSums._sum.totalAmount ? Number(bookingSums._sum.totalAmount) : 0;

    const recentSignups = recentAgencies.map((a) => {
      const owner = a.users[0];
      const sub = a.subscriptions[0];
      return {
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        status: a.status,
        planName: sub?.plan?.name || "Standard Trial",
        subscriptionStatus: sub?.status || SubscriptionStatus.TRIAL,
        createdAt: a.createdAt.toISOString(),
        ownerName: owner?.name || "Agency Owner",
        ownerEmail: owner?.email || a.email,
      };
    });

    return {
      totalAgencies,
      activeAgencies,
      trialAgencies,
      expiredTrialAgencies,
      suspendedAgencies,
      cancelledAgencies,
      totalPlatformUsers: totalUsers,
      activeAgencyOwners: agencyOwners,
      totalCustomers,
      totalBookings,
      totalEnquiries,
      totalQuotations,
      platformSubscriptionRevenue,
      mrr,
      arr,
      agencyBookingVolume,
      recentSignups,
      expiringTrials,
    };
  },

  /**
   * 2. Paginated Agency Directory with Filters, Search, and Statuses
   */
  async listAgencies(filter: AdminAgencyFilterInput = { sortBy: "createdAt", sortOrder: "desc", page: 1, limit: 20 }) {
    const page = typeof filter.page === "number" ? filter.page : Number(filter.page) || 1;
    const limit = typeof filter.limit === "number" ? filter.limit : Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AgencyWhereInput = {};

    if (filter.status) {
      where.status = filter.status as AgencyStatus;
    }

    if (filter.search) {
      const query = filter.search.trim();
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query, mode: "insensitive" } },
        { users: { some: { name: { contains: query, mode: "insensitive" } } } },
        { users: { some: { email: { contains: query, mode: "insensitive" } } } },
      ];
    }

    if (filter.planId) {
      where.subscriptions = {
        some: { planId: filter.planId },
      };
    }

    if (filter.subscriptionStatus) {
      where.subscriptions = {
        some: { status: filter.subscriptionStatus as SubscriptionStatus },
      };
    }

    const [total, agencies] = await Promise.all([
      prisma.agency.count({ where }),
      prisma.agency.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [filter.sortBy || "createdAt"]: filter.sortOrder || "desc" },
        include: {
          users: {
            where: { role: UserRole.AGENCY_OWNER },
            take: 1,
            select: { id: true, name: true, email: true, phone: true },
          },
          subscriptions: {
            include: { plan: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: {
            select: {
              customers: true,
              enquiries: true,
              quotations: true,
              bookings: true,
              trips: true,
            },
          },
        },
      }),
    ]);

    const now = new Date();

    const items: AdminAgencyListItem[] = agencies.map((a) => {
      const owner = a.users[0] || null;
      const sub = a.subscriptions[0] || null;

      let daysRemaining = 0;
      let isTrialExpired = false;

      if (sub && sub.status === SubscriptionStatus.TRIAL && sub.trialEnd) {
        const end = new Date(sub.trialEnd).getTime();
        daysRemaining = Math.max(0, Math.ceil((end - now.getTime()) / (1000 * 60 * 60 * 24)));
        isTrialExpired = daysRemaining <= 0;
      }

      return {
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        logo: a.logo,
        status: a.status,
        createdAt: a.createdAt.toISOString(),
        owner: owner
          ? {
              id: owner.id,
              name: owner.name,
              email: owner.email,
              phone: owner.phone,
            }
          : null,
        subscription: sub
          ? {
              id: sub.id,
              status: sub.status,
              planName: sub.plan?.name || "Standard",
              planPrice: sub.plan ? Number(sub.plan.price) : 0,
              trialEnd: sub.trialEnd ? sub.trialEnd.toISOString() : null,
              daysRemaining,
              isTrialExpired,
            }
          : null,
        usage: {
          customersCount: a._count.customers,
          enquiriesCount: a._count.enquiries,
          quotationsCount: a._count.quotations,
          bookingsCount: a._count.bookings,
          tripsCount: a._count.trips,
        },
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * 3. Agency 360 Full Workspace Inspection
   */
  async getAgency360(agencyId: string): Promise<Agency360Details | null> {
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      include: {
        users: {
          where: { role: UserRole.AGENCY_OWNER },
          take: 1,
        },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: {
            customers: true,
            trips: true,
            quotations: true,
            bookings: true,
            enquiries: true,
            suppliers: true,
            travelDocuments: true,
            customerNotifications: true,
            payments: true,
          },
        },
      },
    });

    if (!agency) return null;

    const auditLogs = await prisma.platformAuditLog.findMany({
      where: { agencyId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const owner = agency.users[0] || null;
    const sub = agency.subscriptions[0] || null;
    const now = new Date();

    let daysRemaining = 0;
    let isTrialExpired = false;

    if (sub && sub.status === SubscriptionStatus.TRIAL && sub.trialEnd) {
      const end = new Date(sub.trialEnd).getTime();
      daysRemaining = Math.max(0, Math.ceil((end - now.getTime()) / (1000 * 60 * 60 * 24)));
      isTrialExpired = daysRemaining <= 0;
    }

    return {
      identity: {
        id: agency.id,
        name: agency.name,
        email: agency.email,
        phone: agency.phone,
        logo: agency.logo,
        address: agency.address,
        status: agency.status,
        createdAt: agency.createdAt.toISOString(),
        updatedAt: agency.updatedAt.toISOString(),
      },
      owner: owner
        ? {
            id: owner.id,
            name: owner.name,
            email: owner.email,
            phone: owner.phone,
            role: owner.role,
            createdAt: owner.createdAt.toISOString(),
          }
        : null,
      subscription: sub
        ? {
            id: sub.id,
            status: sub.status,
            trialStart: sub.trialStart ? sub.trialStart.toISOString() : null,
            trialEnd: sub.trialEnd ? sub.trialEnd.toISOString() : null,
            subscriptionStart: sub.subscriptionStart ? sub.subscriptionStart.toISOString() : null,
            subscriptionEnd: sub.subscriptionEnd ? sub.subscriptionEnd.toISOString() : null,
            daysRemaining,
            isTrialExpired,
            plan: sub.plan
              ? {
                  id: sub.plan.id,
                  name: sub.plan.name,
                  description: sub.plan.description,
                  price: Number(sub.plan.price),
                  durationDays: sub.plan.durationDays,
                }
              : null,
          }
        : null,
      usageTelemetry: {
        customers: agency._count.customers,
        trips: agency._count.trips,
        quotations: agency._count.quotations,
        bookings: agency._count.bookings,
        enquiries: agency._count.enquiries,
        suppliers: agency._count.suppliers,
        documents: agency._count.travelDocuments,
        communications: agency._count.customerNotifications,
        payments: agency._count.payments,
      },
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        actorUserId: log.actorUserId,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  },

  /**
   * 4. Suspend Agency (Prevents Login & Operations without Data Deletion)
   */
  async suspendAgency(agencyId: string, reason: string, actorUserId: string) {
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) throw new Error("Agency not found");

    const updated = await prisma.agency.update({
      where: { id: agencyId },
      data: { status: AgencyStatus.SUSPENDED },
    });

    await prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: "AGENCY_SUSPENDED",
        entityType: "AGENCY",
        entityId: agencyId,
        agencyId,
        metadata: {
          previousStatus: agency.status,
          newStatus: AgencyStatus.SUSPENDED,
          reason,
        },
      },
    });

    return updated;
  },

  /**
   * 5. Reactivate Suspended Agency
   */
  async reactivateAgency(agencyId: string, actorUserId: string) {
    const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) throw new Error("Agency not found");

    const updated = await prisma.agency.update({
      where: { id: agencyId },
      data: { status: AgencyStatus.ACTIVE },
    });

    await prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: "AGENCY_REACTIVATED",
        entityType: "AGENCY",
        entityId: agencyId,
        agencyId,
        metadata: {
          previousStatus: agency.status,
          newStatus: AgencyStatus.ACTIVE,
        },
      },
    });

    return updated;
  },

  /**
   * 6. Extend Agency Free Trial Period
   */
  async extendAgencyTrial(agencyId: string, daysToAdd: number, reason: string, actorUserId: string) {
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!agency) throw new Error("Agency not found");

    const sub = agency.subscriptions[0];
    if (!sub) throw new Error("No subscription record found for agency");

    const now = new Date();
    const currentEnd = sub.trialEnd ? new Date(sub.trialEnd) : now;
    const baseDate = currentEnd > now ? currentEnd : now;
    const newTrialEnd = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

    const updatedSub = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.TRIAL,
        trialEnd: newTrialEnd,
      },
      include: { plan: true },
    });

    await prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: "TRIAL_EXTENDED",
        entityType: "SUBSCRIPTION",
        entityId: sub.id,
        agencyId,
        metadata: {
          daysAdded: daysToAdd,
          previousTrialEnd: sub.trialEnd ? sub.trialEnd.toISOString() : null,
          newTrialEnd: newTrialEnd.toISOString(),
          reason,
        },
      },
    });

    return updatedSub;
  },

  /**
   * 7. Subscription Plans Management
   */
  async listPlans() {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: [{ displayOrder: "asc" }, { price: "asc" }],
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      yearlyPrice: p.yearlyPrice ? Number(p.yearlyPrice) : null,
      durationDays: p.durationDays,
      features: p.features ? (Array.isArray(p.features) ? p.features : (p.features as any)) : [],
      isPopular: p.isPopular,
      displayOrder: p.displayOrder,
      isActive: p.isActive,
      subscriptionsCount: p._count.subscriptions,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  },

  async createPlan(input: PlanCreateInput, actorUserId: string) {
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: input.name,
        description: input.description,
        price: new Prisma.Decimal(input.price),
        yearlyPrice: input.yearlyPrice !== undefined && input.yearlyPrice !== null ? new Prisma.Decimal(input.yearlyPrice) : null,
        durationDays: input.durationDays ?? 30,
        features: input.features ?? [],
        isPopular: input.isPopular ?? false,
        displayOrder: input.displayOrder ?? 0,
        isActive: input.isActive ?? true,
      },
    });

    await prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: "PLAN_CREATED",
        entityType: "SUBSCRIPTION_PLAN",
        entityId: plan.id,
        metadata: { name: plan.name, price: input.price, yearlyPrice: input.yearlyPrice },
      },
    });

    return plan;
  },

  async updatePlan(planId: string, input: PlanUpdateInput, actorUserId: string) {
    const plan = await prisma.subscriptionPlan.update({
      where: { id: planId },
      data: {
        name: input.name,
        description: input.description,
        price: input.price !== undefined ? new Prisma.Decimal(input.price) : undefined,
        yearlyPrice: input.yearlyPrice !== undefined ? (input.yearlyPrice !== null ? new Prisma.Decimal(input.yearlyPrice) : null) : undefined,
        durationDays: input.durationDays,
        features: input.features !== undefined ? (input.features ?? Prisma.JsonNull) : undefined,
        isPopular: input.isPopular,
        displayOrder: input.displayOrder,
        isActive: input.isActive,
      },
    });


    await prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: "PLAN_UPDATED",
        entityType: "SUBSCRIPTION_PLAN",
        entityId: plan.id,
        metadata: input,
      },
    });

    return plan;
  },


  /**
   * 8. Subscriptions List
   */
  async listSubscriptions(filter?: { status?: string; planId?: string }) {
    const where: Prisma.SubscriptionWhereInput = {};
    if (filter?.status) {
      where.status = filter.status as SubscriptionStatus;
    }
    if (filter?.planId) {
      where.planId = filter.planId;
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        agency: { select: { id: true, name: true, email: true, status: true } },
        plan: true,
      },
    });

    const now = new Date();

    return subscriptions.map((s) => {
      let daysRemaining = 0;
      let isTrialExpired = false;

      if (s.status === SubscriptionStatus.TRIAL && s.trialEnd) {
        const end = new Date(s.trialEnd).getTime();
        daysRemaining = Math.max(0, Math.ceil((end - now.getTime()) / (1000 * 60 * 60 * 24)));
        isTrialExpired = daysRemaining <= 0;
      }

      return {
        id: s.id,
        agencyId: s.agencyId,
        agencyName: s.agency.name,
        agencyEmail: s.agency.email,
        agencyStatus: s.agency.status,
        planId: s.planId,
        planName: s.plan.name,
        planPrice: Number(s.plan.price),
        status: s.status,
        trialStart: s.trialStart ? s.trialStart.toISOString() : null,
        trialEnd: s.trialEnd ? s.trialEnd.toISOString() : null,
        subscriptionStart: s.subscriptionStart ? s.subscriptionStart.toISOString() : null,
        subscriptionEnd: s.subscriptionEnd ? s.subscriptionEnd.toISOString() : null,
        daysRemaining,
        isTrialExpired,
        createdAt: s.createdAt.toISOString(),
      };
    });
  },

  /**
   * 9. Platform Usage Analytics
   */
  async getPlatformUsageAnalytics(): Promise<PlatformUsageAnalytics> {
    const [
      totalCustomers,
      totalEnquiries,
      totalQuotations,
      totalBookings,
      totalDocuments,
      totalCommunications,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.enquiry.count(),
      prisma.quotation.count(),
      prisma.booking.count(),
      prisma.travelDocument.count(),
      prisma.customerNotification.count(),
    ]);

    // Compute monthly agency growth for the last 6 months
    const growth: PlatformUsageAnalytics["growth"] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLabel = d.toLocaleString("default", { month: "short", year: "numeric" });

      const [newAgencies, activeAgencies] = await Promise.all([
        prisma.agency.count({
          where: { createdAt: { gte: d, lt: nextMonth } },
        }),
        prisma.agency.count({
          where: {
            createdAt: { lt: nextMonth },
            status: AgencyStatus.ACTIVE,
          },
        }),
      ]);

      growth.push({
        month: monthLabel,
        newAgencies,
        activeAgencies,
      });
    }

    return {
      growth,
      productAdoption: {
        totalCustomers,
        totalEnquiries,
        totalQuotations,
        totalBookings,
        totalDocuments,
        totalCommunications,
      },
    };
  },

  /**
   * 10. Platform Audit Logs
   */
  async listPlatformAuditLogs(filter?: { action?: string; agencyId?: string; limit?: number }) {
    const where: Prisma.PlatformAuditLogWhereInput = {};
    if (filter?.action) {
      where.action = filter.action;
    }
    if (filter?.agencyId) {
      where.agencyId = filter.agencyId;
    }

    const logs = await prisma.platformAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filter?.limit || 50,
    });

    return logs.map((l) => ({
      id: l.id,
      actorUserId: l.actorUserId,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      agencyId: l.agencyId,
      metadata: l.metadata,
      createdAt: l.createdAt.toISOString(),
    }));
  },

  /**
   * 11. Platform Announcements
   */
  async listAnnouncements() {
    return prisma.platformAnnouncement.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async getActiveAnnouncements() {
    const now = new Date();
    return prisma.platformAnnouncement.findMany({
      where: {
        status: "ACTIVE",
        startAt: { lte: now },
        OR: [
          { endAt: null },
          { endAt: { gte: now } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async createAnnouncement(input: AnnouncementCreateInput, actorUserId: string) {
    const announcement = await prisma.platformAnnouncement.create({
      data: {
        title: input.title,
        message: input.message,
        type: input.type || "INFO",
        status: input.status || "ACTIVE",
        startAt: input.startAt ? new Date(input.startAt) : new Date(),
        endAt: input.endAt ? new Date(input.endAt) : null,
      },
    });

    await prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: "ANNOUNCEMENT_CREATED",
        entityType: "ANNOUNCEMENT",
        entityId: announcement.id,
        metadata: { title: announcement.title },
      },
    });

    return announcement;
  },

  async updateAnnouncement(id: string, input: AnnouncementUpdateInput, actorUserId: string) {
    const announcement = await prisma.platformAnnouncement.update({
      where: { id },
      data: {
        title: input.title,
        message: input.message,
        type: input.type,
        status: input.status,
        startAt: input.startAt ? new Date(input.startAt) : undefined,
        endAt: input.endAt !== undefined ? (input.endAt ? new Date(input.endAt) : null) : undefined,
      },
    });

    await prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: "ANNOUNCEMENT_UPDATED",
        entityType: "ANNOUNCEMENT",
        entityId: id,
        metadata: input,
      },
    });

    return announcement;
  },

  async deleteAnnouncement(id: string, actorUserId: string) {
    const deleted = await prisma.platformAnnouncement.delete({
      where: { id },
    });

    await prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: "ANNOUNCEMENT_DELETED",
        entityType: "ANNOUNCEMENT",
        entityId: id,
        metadata: { title: deleted.title },
      },
    });

    return deleted;
  },

  /**
   * 12. Platform Settings (Key-Value)
   */
  async getPlatformSettings() {
    const settings = await prisma.platformSetting.findMany();
    const result: Record<string, string> = {
      defaultTrialDays: "7",
      maintenanceMode: "false",
      supportEmail: "support@tripdesk.io",
      platformNotice: "",
    };

    settings.forEach((s) => {
      result[s.key] = s.value;
    });

    return result;
  },

  async updatePlatformSettings(settings: Record<string, string>, actorUserId: string) {
    for (const [key, value] of Object.entries(settings)) {
      await prisma.platformSetting.upsert({
        where: { key },
        create: {
          key,
          value,
          updatedBy: actorUserId,
        },
        update: {
          value,
          updatedBy: actorUserId,
        },
      });
    }

    await prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: "PLATFORM_SETTINGS_UPDATED",
        entityType: "PLATFORM_SETTING",
        metadata: settings,
      },
    });

    return this.getPlatformSettings();
  },

  /**
   * 13. Global Platform Search across all Tenants
   */
  async globalPlatformSearch(query: string, limit = 20): Promise<GlobalSearchResult[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    const [agencies, users, customers, bookings, enquiries, quotations] = await Promise.all([
      prisma.agency.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, name: true, email: true, status: true },
      }),
      prisma.user.findMany({
        where: {
          role: UserRole.AGENCY_OWNER,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        include: { agency: { select: { id: true, name: true } } },
      }),
      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        include: { agency: { select: { id: true, name: true } } },
      }),
      prisma.booking.findMany({
        where: {
          OR: [
            { bookingNumber: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
          ],
        },
        take: 5,
        include: {
          agency: { select: { id: true, name: true } },
          customer: { select: { name: true } },
        },
      }),
      prisma.enquiry.findMany({
        where: {
          OR: [
            { enquiryNumber: { contains: q, mode: "insensitive" } },
            { destination: { contains: q, mode: "insensitive" } },
            { customer: { name: { contains: q, mode: "insensitive" } } },
          ],
        },
        take: 5,
        include: {
          agency: { select: { id: true, name: true } },
          customer: { select: { name: true } },
        },
      }),
      prisma.quotation.findMany({
        where: {
          OR: [
            { quotationNumber: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        include: {
          agency: { select: { id: true, name: true } },
        },
      }),
    ]);

    const results: GlobalSearchResult[] = [];

    agencies.forEach((a) => {
      results.push({
        type: "AGENCY",
        id: a.id,
        title: a.name,
        subtitle: `Agency • ${a.email} • Status: ${a.status}`,
        agencyId: a.id,
        agencyName: a.name,
        url: `/admin/agencies/${a.id}`,
      });
    });

    users.forEach((u) => {
      results.push({
        type: "USER",
        id: u.id,
        title: u.name,
        subtitle: `Owner • ${u.email} • Agency: ${u.agency?.name || "None"}`,
        agencyId: u.agencyId || undefined,
        agencyName: u.agency?.name,
        url: u.agencyId ? `/admin/agencies/${u.agencyId}` : "/admin/agencies",
      });
    });

    customers.forEach((c) => {
      results.push({
        type: "CUSTOMER",
        id: c.id,
        title: c.name,
        subtitle: `Customer • Phone: ${c.phone} • Agency: ${c.agency.name}`,
        agencyId: c.agencyId,
        agencyName: c.agency.name,
        url: `/admin/agencies/${c.agencyId}`,
      });
    });

    bookings.forEach((b) => {
      results.push({
        type: "BOOKING",
        id: b.id,
        title: `Booking #${b.bookingNumber}`,
        subtitle: `Client: ${b.customer.name} • INR ${b.totalAmount} • Agency: ${b.agency.name}`,
        agencyId: b.agencyId,
        agencyName: b.agency.name,
        url: `/admin/agencies/${b.agencyId}`,
      });
    });

    enquiries.forEach((e) => {
      results.push({
        type: "ENQUIRY",
        id: e.id,
        title: `Enquiry #${e.enquiryNumber} (${e.destination})`,
        subtitle: `Client: ${e.customer.name} • Agency: ${e.agency.name}`,
        agencyId: e.agencyId,
        agencyName: e.agency.name,
        url: `/admin/agencies/${e.agencyId}`,
      });
    });

    quotations.forEach((qItem) => {
      results.push({
        type: "QUOTATION",
        id: qItem.id,
        title: `Quotation #${qItem.quotationNumber} (${qItem.title})`,
        subtitle: `INR ${qItem.finalAmount} • Agency: ${qItem.agency.name}`,
        agencyId: qItem.agencyId,
        agencyName: qItem.agency.name,
        url: `/admin/agencies/${qItem.agencyId}`,
      });
    });

    return results.slice(0, limit);
  },

  /**
   * 12. SaaS Subscription Payments & Billing Reconciliation
   */
  async listSubscriptionPayments(filter?: SubscriptionPaymentFilterInput) {
    const where: Prisma.SubscriptionPaymentWhereInput = {};

    if (filter?.status) {
      where.status = filter.status as SubscriptionPaymentStatus;
    }
    if (filter?.agencyId) {
      where.agencyId = filter.agencyId;
    }
    if (filter?.subscriptionId) {
      where.subscriptionId = filter.subscriptionId;
    }
    if (filter?.planId) {
      where.subscription = { planId: filter.planId };
    }
    if (filter?.startDate || filter?.endDate) {
      where.paymentDate = {
        gte: filter.startDate ? new Date(filter.startDate) : undefined,
        lte: filter.endDate ? new Date(filter.endDate) : undefined,
      };
    }
    if (filter?.search) {
      const q = filter.search.trim();
      where.OR = [
        { agency: { name: { contains: q, mode: "insensitive" } } },
        { utrNumber: { contains: q, mode: "insensitive" } },
        { paymentReference: { contains: q, mode: "insensitive" } },
        { id: { contains: q, mode: "insensitive" } },
      ];
    }

    const pageNum = Number(filter?.page) || 1;
    const limitNum = Number(filter?.limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    const [payments, totalCount, allPayments, allActiveSubs] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where,
        orderBy: { paymentDate: "desc" },
        skip,
        take: limitNum,
        include: {
          agency: {
            select: { id: true, name: true, email: true, phone: true },
          },
          subscription: {
            include: { plan: true },
          },
        },
      }),
      prisma.subscriptionPayment.count({ where }),
      prisma.subscriptionPayment.findMany({
        select: {
          amount: true,
          status: true,
          paymentDate: true,
        },
      }),
      prisma.subscription.findMany({
        where: { status: { in: ["ACTIVE", "TRIAL"] } },
        include: { plan: true },
      }),
    ]);

    // Compute Summary Stats
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let totalVerified = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    let currentMonthCollections = 0;

    for (const p of allPayments) {
      const amt = Number(p.amount);
      if (p.status === "VERIFIED") {
        totalVerified += amt;
        const pDate = new Date(p.paymentDate);
        if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
          currentMonthCollections += amt;
        }
      } else if (p.status === "PENDING") {
        pendingCount += 1;
        pendingAmount += amt;
      }
    }

    const totalExpected = allActiveSubs.reduce(
      (sum, s) => sum + Number(s.plan.price),
      0
    );
    const outstandingAmount = Math.max(0, totalExpected - currentMonthCollections);

    const items: AdminSubscriptionPaymentItem[] = payments.map((p: any) => ({
      id: p.id,
      agencyId: p.agencyId,
      agencyName: p.agency.name,
      agencyEmail: p.agency.email,
      agencyPhone: p.agency.phone,
      subscriptionId: p.subscriptionId,
      planId: p.subscription.planId,
      planName: p.subscription.plan.name,
      planPrice: Number(p.subscription.plan.price),
      amount: Number(p.amount),
      currency: p.currency,
      paymentMethod: p.paymentMethod,
      paymentReference: p.paymentReference,
      utrNumber: p.utrNumber,
      paymentDate: p.paymentDate.toISOString(),
      status: p.status,
      notes: p.notes,
      verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
      verifiedBy: p.verifiedBy,
      rejectedAt: p.rejectedAt ? p.rejectedAt.toISOString() : null,
      rejectionReason: p.rejectionReason,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    const stats: SubscriptionPaymentSummaryStats = {
      totalExpected,
      totalVerified,
      pendingCount,
      pendingAmount,
      outstandingAmount,
      currentMonthCollections,
    };

    return {
      items,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      stats,
    };

  },

  async getSubscriptionPayment(paymentId: string): Promise<AdminSubscriptionPaymentItem | null> {
    const p: any = await prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: {
        agency: { select: { id: true, name: true, email: true, phone: true } },
        subscription: { include: { plan: true } },
      },
    });

    if (!p) return null;

    return {
      id: p.id,
      agencyId: p.agencyId,
      agencyName: p.agency.name,
      agencyEmail: p.agency.email,
      agencyPhone: p.agency.phone,
      subscriptionId: p.subscriptionId,
      planId: p.subscription.planId,
      planName: p.subscription.plan.name,
      planPrice: Number(p.subscription.plan.price),
      amount: Number(p.amount),
      currency: p.currency,
      paymentMethod: p.paymentMethod,
      paymentReference: p.paymentReference,
      utrNumber: p.utrNumber,
      paymentDate: p.paymentDate.toISOString(),
      status: p.status,
      notes: p.notes,
      verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
      verifiedBy: p.verifiedBy,
      rejectedAt: p.rejectedAt ? p.rejectedAt.toISOString() : null,
      rejectionReason: p.rejectionReason,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  },

  async createSubscriptionPayment(input: SubscriptionPaymentCreateInput, actorUserId: string) {
    const agency = await prisma.agency.findUnique({
      where: { id: input.agencyId },
      include: {
        subscriptions: {
          where: { id: input.subscriptionId },
          include: { plan: true },
        },
      },
    });

    if (!agency) {
      throw new Error(`Agency not found with ID: ${input.agencyId}`);
    }

    const sub = agency.subscriptions[0];
    if (!sub) {
      throw new Error(`Subscription not found with ID: ${input.subscriptionId}`);
    }

    const payment = await prisma.subscriptionPayment.create({
      data: {
        agencyId: input.agencyId,
        subscriptionId: input.subscriptionId,
        planId: input.planId || sub.planId,
        billingCycle: input.billingCycle || "MONTHLY",
        amount: new Prisma.Decimal(input.amount),
        currency: input.currency || "INR",
        paymentMethod: input.paymentMethod || "UPI",
        paymentReference: input.paymentReference,
        utrNumber: input.utrNumber,
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : new Date(),
        status: SubscriptionPaymentStatus.PENDING,
        notes: input.notes,
      },
      include: {
        agency: true,
        subscription: { include: { plan: true } },
      },
    });

    await prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: "SUBSCRIPTION_PAYMENT_CREATED",
        entityType: "SUBSCRIPTION_PAYMENT",
        entityId: payment.id,
        agencyId: input.agencyId,
        metadata: {
          amount: input.amount,
          utrNumber: input.utrNumber,
          billingCycle: input.billingCycle || "MONTHLY",
          paymentMethod: input.paymentMethod,
          subscriptionId: input.subscriptionId,
          planName: sub.plan.name,
        },
      },
    });

    return payment;
  },

  async verifySubscriptionPayment(
    paymentId: string,
    input: SubscriptionPaymentVerifyInput,
    actorUserId: string
  ) {
    const payment: any = await prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: {
        subscription: { include: { plan: true } },
        agency: true,
      },
    });

    if (!payment) {
      throw new Error("Subscription payment record not found.");
    }

    if (payment.status === SubscriptionPaymentStatus.VERIFIED) {
      throw new Error("This payment is already verified.");
    }

    const now = new Date();
    const isYearly = payment.billingCycle === "YEARLY";
    const durationDays = isYearly ? 365 : (payment.subscription.plan.durationDays || 30);
    const subEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const targetPlanId = payment.planId || payment.subscription.planId;

    // Update payment to VERIFIED
    const updatedPayment = await prisma.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: SubscriptionPaymentStatus.VERIFIED,
        verifiedAt: now,
        verifiedBy: actorUserId,
        notes: input.notes ? `${payment.notes ? payment.notes + " | " : ""}${input.notes}` : payment.notes,
      },
    });

    // Update subscription to ACTIVE with new validity dates and plan
    await prisma.subscription.update({
      where: { id: payment.subscriptionId },
      data: {
        planId: targetPlanId,
        billingCycle: payment.billingCycle || "MONTHLY",
        status: SubscriptionStatus.ACTIVE,
        subscriptionStart: now,
        subscriptionEnd: subEnd,
      },
    });

    // If agency was suspended due to lapsed payment, ensure status remains ACTIVE
    if (payment.agency.status === AgencyStatus.SUSPENDED) {
      await prisma.agency.update({
        where: { id: payment.agencyId },
        data: { status: AgencyStatus.ACTIVE },
      });
    }

    await prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: "SUBSCRIPTION_PAYMENT_VERIFIED",
        entityType: "SUBSCRIPTION_PAYMENT",
        entityId: payment.id,
        agencyId: payment.agencyId,
        metadata: {
          amount: Number(payment.amount),
          utrNumber: payment.utrNumber,
          billingCycle: payment.billingCycle,
          planId: targetPlanId,
          verifiedBy: actorUserId,
          activatedUntil: subEnd.toISOString(),
        },
      },
    });

    return updatedPayment;
  },



  async rejectSubscriptionPayment(
    paymentId: string,
    input: SubscriptionPaymentRejectInput,
    actorUserId: string
  ) {
    const payment = await prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error("Subscription payment record not found.");
    }

    if (payment.status === SubscriptionPaymentStatus.VERIFIED) {
      throw new Error("A verified payment cannot be rejected directly without explicit refund flow.");
    }

    const now = new Date();

    const updatedPayment = await prisma.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: SubscriptionPaymentStatus.REJECTED,
        rejectedAt: now,
        rejectionReason: input.reason,
      },
    });

    await prisma.platformAuditLog.create({
      data: {
        actorUserId,
        action: "SUBSCRIPTION_PAYMENT_REJECTED",
        entityType: "SUBSCRIPTION_PAYMENT",
        entityId: payment.id,
        agencyId: payment.agencyId,
        metadata: {
          amount: Number(payment.amount),
          utrNumber: payment.utrNumber,
          rejectionReason: input.reason,
          rejectedBy: actorUserId,
        },
      },
    });

    return updatedPayment;
  },
};

