import "server-only";
import { prisma } from "@/lib/prisma";
import {
  SubscriptionStatus,
  SubscriptionPaymentStatus,
  Prisma,
} from "@prisma/client";
import { AgencyPaymentRequestInput } from "@/lib/validation/subscription-schema";

export interface AgencySubscriptionOverview {
  agency: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
  };
  subscription: {
    id: string;
    status: SubscriptionStatus;
    billingCycle: string;
    planId: string;
    planName: string;
    planPrice: number;
    planYearlyPrice: number | null;
    planDescription: string | null;
    planFeatures: string[];
    trialStart: string | null;
    trialEnd: string | null;
    subscriptionStart: string | null;
    subscriptionEnd: string | null;
    daysRemaining: number;
    isTrialExpired: boolean;
    isActive: boolean;
  };
  latestPendingPayment: {
    id: string;
    amount: number;
    currency: string;
    planId: string | null;
    planName?: string;
    billingCycle: string;
    paymentMethod: string;
    utrNumber: string | null;
    paymentDate: string;
    status: SubscriptionPaymentStatus;
    notes: string | null;
    createdAt: string;
  } | null;
  paymentHistory: Array<{
    id: string;
    amount: number;
    currency: string;
    planId: string | null;
    planName?: string;
    billingCycle: string;
    paymentMethod: string;
    utrNumber: string | null;
    paymentDate: string;
    status: SubscriptionPaymentStatus;
    notes: string | null;
    verifiedAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
    createdAt: string;
  }>;
  availablePlans?: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    yearlyPrice: number | null;
    durationDays: number;
    features: string[];
    isPopular: boolean;
    displayOrder: number;
    isActive: boolean;
  }>;
}


export const subscriptionService = {
  /**
   * 1. Get complete agency subscription overview with trial telemetry and payment history
   */
  async getAgencySubscription(agencyId: string): Promise<AgencySubscriptionOverview> {
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            plan: true,
            payments: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
        subscriptionPayments: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            subscription: {
              include: { plan: true },
            },
          },
        },
      },
    });

    if (!agency) {
      throw new Error(`Agency not found with ID: ${agencyId}`);
    }

    let sub = agency.subscriptions[0];

    // If no subscription exists for this agency, create a default 7-day TRIAL subscription
    if (!sub) {
      const defaultPlan = await prisma.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: [{ displayOrder: "asc" }, { price: "asc" }],
      });

      if (!defaultPlan) {
        throw new Error("No active subscription plan found to initialize trial.");
      }

      const now = new Date();
      const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      sub = await prisma.subscription.create({
        data: {
          agencyId,
          planId: defaultPlan.id,
          status: SubscriptionStatus.TRIAL,
          billingCycle: "MONTHLY",
          trialStart: now,
          trialEnd,
        },
        include: {
          plan: true,
          payments: true,
        },
      });
    }

    const now = new Date();
    let daysRemaining = 0;
    let isTrialExpired = false;

    if (sub.status === SubscriptionStatus.TRIAL && sub.trialEnd) {
      const end = new Date(sub.trialEnd).getTime();
      daysRemaining = Math.max(0, Math.ceil((end - now.getTime()) / (1000 * 60 * 60 * 24)));
      isTrialExpired = daysRemaining <= 0;
    } else if (sub.status === SubscriptionStatus.ACTIVE && sub.subscriptionEnd) {
      const end = new Date(sub.subscriptionEnd).getTime();
      daysRemaining = Math.max(0, Math.ceil((end - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Find latest pending payment
    const allPayments = agency.subscriptionPayments || [];
    const pendingPayment = allPayments.find((p) => p.status === SubscriptionPaymentStatus.PENDING);

    // Look up plan names for payments if planId is present
    const planIds = Array.from(new Set(allPayments.map((p) => p.planId).filter(Boolean))) as string[];
    const plansById = new Map<string, string>();
    if (planIds.length > 0) {
      const dbPlans = await prisma.subscriptionPlan.findMany({
        where: { id: { in: planIds } },
        select: { id: true, name: true },
      });
      dbPlans.forEach((p) => plansById.set(p.id, p.name));
    }

    const latestPendingPayment = pendingPayment
      ? {
          id: pendingPayment.id,
          amount: Number(pendingPayment.amount),
          currency: pendingPayment.currency,
          planId: pendingPayment.planId || pendingPayment.subscription.planId,
          planName:
            (pendingPayment.planId && plansById.get(pendingPayment.planId)) ||
            pendingPayment.subscription.plan.name,
          billingCycle: pendingPayment.billingCycle || "MONTHLY",
          paymentMethod: pendingPayment.paymentMethod,
          utrNumber: pendingPayment.utrNumber,
          paymentDate: pendingPayment.paymentDate.toISOString(),
          status: pendingPayment.status,
          notes: pendingPayment.notes,
          createdAt: pendingPayment.createdAt.toISOString(),
        }
      : null;

    const paymentHistory = allPayments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      planId: p.planId || p.subscription.planId,
      planName:
        (p.planId && plansById.get(p.planId)) ||
        p.subscription.plan.name,
      billingCycle: p.billingCycle || "MONTHLY",
      paymentMethod: p.paymentMethod,
      utrNumber: p.utrNumber,
      paymentDate: p.paymentDate.toISOString(),
      status: p.status,
      notes: p.notes,
      verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
      rejectedAt: p.rejectedAt ? p.rejectedAt.toISOString() : null,
      rejectionReason: p.rejectionReason,
      createdAt: p.createdAt.toISOString(),
    }));

    const featuresList = sub.plan.features
      ? Array.isArray(sub.plan.features)
        ? (sub.plan.features as string[])
        : []
      : [];

    const activePlans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });

    const availablePlans = activePlans
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        yearlyPrice: p.yearlyPrice ? Number(p.yearlyPrice) : null,
        durationDays: p.durationDays,
        features: p.features ? (Array.isArray(p.features) ? (p.features as string[]) : []) : [],
        isPopular: !!p.isPopular,
        displayOrder: typeof p.displayOrder === "number" ? p.displayOrder : 0,
        isActive: p.isActive,
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder || a.price - b.price);


    return {
      agency: {
        id: agency.id,
        name: agency.name,
        email: agency.email,
        phone: agency.phone,
        status: agency.status,
      },
      subscription: {
        id: sub.id,
        status: sub.status,
        billingCycle: sub.billingCycle || "MONTHLY",
        planId: sub.planId,
        planName: sub.plan.name,
        planPrice: Number(sub.plan.price),
        planYearlyPrice: sub.plan.yearlyPrice ? Number(sub.plan.yearlyPrice) : null,
        planDescription: sub.plan.description,
        planFeatures: featuresList,
        trialStart: sub.trialStart ? sub.trialStart.toISOString() : null,
        trialEnd: sub.trialEnd ? sub.trialEnd.toISOString() : null,
        subscriptionStart: sub.subscriptionStart ? sub.subscriptionStart.toISOString() : null,
        subscriptionEnd: sub.subscriptionEnd ? sub.subscriptionEnd.toISOString() : null,
        daysRemaining,
        isTrialExpired,
        isActive: sub.status === SubscriptionStatus.ACTIVE,
      },
      latestPendingPayment,
      paymentHistory,
      availablePlans,
    };
  },


  /**
   * 2. List all active subscription plans for agency purchase
   */
  async listActivePlans() {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });

    return plans
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        yearlyPrice: p.yearlyPrice ? Number(p.yearlyPrice) : null,
        durationDays: p.durationDays,
        features: p.features ? (Array.isArray(p.features) ? (p.features as string[]) : []) : [],
        isPopular: !!p.isPopular,
        displayOrder: typeof p.displayOrder === "number" ? p.displayOrder : 0,
        isActive: p.isActive,
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder || a.price - b.price);
  },


  /**
   * 3. Submit manual payment request with UTR from Agency Owner
   */
  async createPaymentRequest(
    agencyId: string,
    userId: string,
    input: AgencyPaymentRequestInput
  ) {
    // 1. Verify selected plan exists and is active
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: input.planId },
    });

    if (!plan || !plan.isActive) {
      throw new Error("The selected subscription plan is inactive or does not exist.");
    }

    // 2. Compute expected amount based on billing cycle
    const isYearly = input.billingCycle === "YEARLY";
    let calculatedAmount: number;
    if (isYearly) {
      calculatedAmount = plan.yearlyPrice ? Number(plan.yearlyPrice) : Number(plan.price) * 10;
    } else {
      calculatedAmount = Number(plan.price);
    }

    // 3. Find agency subscription or create default trial
    let sub = await prisma.subscription.findFirst({
      where: { agencyId },
      orderBy: { createdAt: "desc" },
    });

    if (!sub) {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      sub = await prisma.subscription.create({
        data: {
          agencyId,
          planId: plan.id,
          status: SubscriptionStatus.TRIAL,
          billingCycle: input.billingCycle,
          trialStart: now,
          trialEnd,
        },
      });
    }

    // 4. Create pending SubscriptionPayment record
    const payment = await prisma.subscriptionPayment.create({
      data: {
        agencyId,
        subscriptionId: sub.id,
        planId: plan.id,
        billingCycle: input.billingCycle,
        amount: new Prisma.Decimal(calculatedAmount),
        currency: "INR",
        paymentMethod: (input.paymentMethod as any) || "UPI",
        paymentReference: input.paymentReference,
        utrNumber: input.utrNumber.trim(),
        paymentDate: new Date(),
        status: SubscriptionPaymentStatus.PENDING,
        notes: input.notes,
      },
      include: {
        subscription: { include: { plan: true } },
      },
    });

    // 5. Audit Log
    await prisma.platformAuditLog.create({
      data: {
        actorUserId: userId,
        action: "AGENCY_SUBSCRIPTION_PAYMENT_REQUESTED",
        entityType: "SUBSCRIPTION_PAYMENT",
        entityId: payment.id,
        agencyId,
        metadata: {
          planId: plan.id,
          planName: plan.name,
          billingCycle: input.billingCycle,
          amount: calculatedAmount,
          utrNumber: input.utrNumber.trim(),
          paymentMethod: input.paymentMethod,
        },
      },
    });

    return {
      id: payment.id,
      planName: plan.name,
      billingCycle: input.billingCycle,
      amount: calculatedAmount,
      currency: "INR",
      utrNumber: payment.utrNumber,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
    };
  },
};
