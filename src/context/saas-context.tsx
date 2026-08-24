"use client";

import * as React from "react";
import {
  SaaSAgency,
  SaaSAgencyOwner,
  SaaSPlan,
  SaaSSubscription,
  SaaSSubscriptionPayment,
  SaaSAgencyActivity,
  AgencyStatus,
  SubscriptionStatus,
  PlanTier,
  BillingCycle,
  SubscriptionPaymentMethod,
  initialSaaSAgencies,
  initialSaaSOwners,
  initialSaaSPlans,
  initialSaaSSubscriptions,
  initialSaaSPayments,
  initialSaaSActivities,
} from "@/data/saas-data";
import { toast } from "sonner";

interface CreateAgencyPayload {
  name: string;
  logo?: string;
  email: string;
  phone: string;
  address?: string;
  city: string;
  state?: string;
  country?: string;
  website?: string;
  gstin?: string;
  internalNotes?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  planId: "starter" | "professional";
  billingCycle: BillingCycle;
  isTrial: boolean;
  paymentStatus: "Trial" | "Pending Payment" | "Paid";
}

interface SaaSContextType {
  agencies: SaaSAgency[];
  agencyOwners: SaaSAgencyOwner[];
  plans: SaaSPlan[];
  subscriptions: SaaSSubscription[];
  subscriptionPayments: SaaSSubscriptionPayment[];
  agencyActivities: SaaSAgencyActivity[];

  createAgency: (payload: CreateAgencyPayload) => SaaSAgency;
  updateAgency: (agencyId: string, updates: Partial<SaaSAgency>) => void;
  updateAgencyStatus: (agencyId: string, newStatus: AgencyStatus, reason?: string) => void;
  updateSubscription: (agencyId: string, updates: Partial<SaaSSubscription>) => void;
  verifyPayment: (paymentId: string, verifiedBy?: string) => void;
  rejectPayment: (paymentId: string, reason: string) => void;
  updatePlan: (planId: "starter" | "professional", updates: Partial<SaaSPlan>) => void;
  getAgencyDetails: (agencyId: string) => {
    agency?: SaaSAgency;
    owner?: SaaSAgencyOwner;
    subscription?: SaaSSubscription;
    plan?: SaaSPlan;
    payments: SaaSSubscriptionPayment[];
    activities: SaaSAgencyActivity[];
  };
  getPendingPayments: () => SaaSSubscriptionPayment[];
  getPlatformStats: () => {
    totalAgencies: number;
    activeAgencies: number;
    trialAgencies: number;
    pastDueAgencies: number;
    readOnlyAgencies: number;
    suspendedAgencies: number;
    activeSubscriptions: number;
    pendingPaymentsCount: number;
    mrr: number;
    arr: number;
  };
}

const SaaSContext = React.createContext<SaaSContextType | undefined>(undefined);

export function SaaSProvider({ children }: { children: React.ReactNode }) {
  const [agencies, setAgencies] = React.useState<SaaSAgency[]>(initialSaaSAgencies);
  const [agencyOwners, setAgencyOwners] = React.useState<SaaSAgencyOwner[]>(initialSaaSOwners);
  const [plans, setPlans] = React.useState<SaaSPlan[]>(initialSaaSPlans);
  const [subscriptions, setSubscriptions] = React.useState<SaaSSubscription[]>(initialSaaSSubscriptions);
  const [subscriptionPayments, setSubscriptionPayments] = React.useState<SaaSSubscriptionPayment[]>(initialSaaSPayments);
  const [agencyActivities, setAgencyActivities] = React.useState<SaaSAgencyActivity[]>(initialSaaSActivities);

  // Helper date functions
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const logActivity = React.useCallback(
    (agencyId: string, title: string, description: string, actor = "TripDesk Admin") => {
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const newAct: SaaSAgencyActivity = {
        id: `act-${Date.now()}`,
        agencyId,
        date: todayStr,
        time: timeStr,
        title,
        description,
        actor,
      };
      setAgencyActivities((prev) => [newAct, ...prev]);
    },
    [todayStr]
  );

  const createAgency = React.useCallback(
    (payload: CreateAgencyPayload): SaaSAgency => {
      const agencyId = `agency-${Date.now()}`;
      const ownerId = `owner-${Date.now()}`;
      const subId = `sub-${Date.now()}`;

      const targetPlan = plans.find((p) => p.id === payload.planId) || plans[0];
      const planFee = payload.billingCycle === "Yearly" ? targetPlan.yearlyPrice : targetPlan.monthlyPrice;

      // 7-day dynamic trial calculation
      const trialStartDate = todayStr;
      const trialEndDateObj = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const trialEndDate = trialEndDateObj.toISOString().split("T")[0];

      const renewalDateObj = payload.isTrial
        ? trialEndDateObj
        : payload.billingCycle === "Yearly"
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const renewalDate = renewalDateObj.toISOString().split("T")[0];

      const agencyStatus: AgencyStatus = payload.isTrial
        ? "TRIAL"
        : payload.paymentStatus === "Paid"
        ? "ACTIVE"
        : "PAST_DUE";

      const subStatus: SubscriptionStatus = payload.isTrial
        ? "TRIAL"
        : payload.paymentStatus === "Paid"
        ? "ACTIVE"
        : "PAST_DUE";

      const newAgency: SaaSAgency = {
        id: agencyId,
        name: payload.name.trim(),
        slug: payload.name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-"),
        logo: payload.logo,
        email: payload.email.trim(),
        phone: payload.phone.trim(),
        address: payload.address?.trim(),
        city: payload.city.trim(),
        state: payload.state?.trim(),
        country: payload.country?.trim() || "India",
        website: payload.website?.trim(),
        gstin: payload.gstin?.trim(),
        internalNotes: payload.internalNotes?.trim(),
        ownerId,
        status: agencyStatus,
        createdAt: todayStr,
      };

      const newOwner: SaaSAgencyOwner = {
        id: ownerId,
        agencyId,
        name: payload.ownerName.trim(),
        email: payload.ownerEmail.trim(),
        phone: payload.ownerPhone.trim(),
      };

      const newSubscription: SaaSSubscription = {
        id: subId,
        agencyId,
        planId: payload.planId,
        billingCycle: payload.billingCycle,
        status: subStatus,
        trialStart: payload.isTrial ? trialStartDate : undefined,
        trialEnd: payload.isTrial ? trialEndDate : undefined,
        startDate: todayStr,
        renewalDate,
        amount: planFee,
      };

      setAgencies((prev) => [newAgency, ...prev]);
      setAgencyOwners((prev) => [newOwner, ...prev]);
      setSubscriptions((prev) => [newSubscription, ...prev]);

      // If created with pending payment, add payment record
      if (!payload.isTrial && payload.paymentStatus === "Pending Payment") {
        const payId = `PAY-${Date.now().toString().slice(-4)}`;
        const newPayment: SaaSSubscriptionPayment = {
          id: payId,
          agencyId,
          agencyName: newAgency.name,
          subscriptionId: subId,
          planName: targetPlan.name,
          amount: planFee,
          method: "UPI",
          reference: `UPI-INIT-${payId}`,
          paymentDate: todayStr,
          status: "Pending",
          notes: "Initial subscription onboarding payment.",
        };
        setSubscriptionPayments((prev) => [newPayment, ...prev]);
      }

      logActivity(
        agencyId,
        "Agency Onboarded",
        `${newAgency.name} was registered with ${targetPlan.name} Plan (${payload.isTrial ? "7-Day Free Trial" : payload.billingCycle}).`
      );

      toast.success(`Agency "${newAgency.name}" created successfully!`);
      return newAgency;
    },
    [plans, todayStr, logActivity]
  );

  const updateAgency = React.useCallback(
    (agencyId: string, updates: Partial<SaaSAgency>) => {
      setAgencies((prev) =>
        prev.map((a) => (a.id === agencyId ? { ...a, ...updates } : a))
      );
      logActivity(agencyId, "Agency Updated", "Agency details were updated.");
      toast.success("Agency profile updated.");
    },
    [logActivity]
  );

  const updateAgencyStatus = React.useCallback(
    (agencyId: string, newStatus: AgencyStatus, reason?: string) => {
      setAgencies((prev) =>
        prev.map((a) => (a.id === agencyId ? { ...a, status: newStatus } : a))
      );
      logActivity(
        agencyId,
        `Status Changed: ${newStatus}`,
        reason ? `Reason: ${reason}` : `Agency status changed to ${newStatus}.`
      );
      toast.success(`Agency status set to ${newStatus}`);
    },
    [logActivity]
  );

  const updateSubscription = React.useCallback(
    (agencyId: string, updates: Partial<SaaSSubscription>) => {
      setSubscriptions((prev) =>
        prev.map((s) => (s.agencyId === agencyId ? { ...s, ...updates } : s))
      );
      logActivity(agencyId, "Subscription Updated", "Subscription parameters updated.");
      toast.success("Subscription updated.");
    },
    [logActivity]
  );

  const verifyPayment = React.useCallback(
    (paymentId: string, verifiedBy = "TripDesk Admin") => {
      let targetAgencyId = "";
      setSubscriptionPayments((prev) =>
        prev.map((p) => {
          if (p.id === paymentId) {
            targetAgencyId = p.agencyId;
            return {
              ...p,
              status: "Verified",
              verifiedBy,
              rejectionReason: undefined,
            };
          }
          return p;
        })
      );

      if (targetAgencyId) {
        // Activate agency & subscription
        setAgencies((prev) =>
          prev.map((a) => (a.id === targetAgencyId ? { ...a, status: "ACTIVE" } : a))
        );
        setSubscriptions((prev) =>
          prev.map((s) => {
            if (s.agencyId === targetAgencyId) {
              const nextRenewalObj =
                s.billingCycle === "Yearly"
                  ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                  : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              return {
                ...s,
                status: "ACTIVE",
                renewalDate: nextRenewalObj.toISOString().split("T")[0],
              };
            }
            return s;
          })
        );
        logActivity(
          targetAgencyId,
          "Payment Verified",
          `Payment ${paymentId} verified by ${verifiedBy}. Account and subscription activated to Active.`
        );
      }

      toast.success(`Payment ${paymentId} verified! Agency activated.`);
    },
    [logActivity]
  );

  const rejectPayment = React.useCallback(
    (paymentId: string, reason: string) => {
      let targetAgencyId = "";
      setSubscriptionPayments((prev) =>
        prev.map((p) => {
          if (p.id === paymentId) {
            targetAgencyId = p.agencyId;
            return {
              ...p,
              status: "Rejected",
              verifiedBy: "TripDesk Admin",
              rejectionReason: reason.trim(),
            };
          }
          return p;
        })
      );

      if (targetAgencyId) {
        logActivity(
          targetAgencyId,
          "Payment Rejected",
          `Payment ${paymentId} was rejected. Reason: ${reason}`
        );
      }

      toast.error(`Payment ${paymentId} rejected.`);
    },
    [logActivity]
  );

  const updatePlan = React.useCallback((planId: "starter" | "professional", updates: Partial<SaaSPlan>) => {
    setPlans((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, ...updates } : p))
    );
    toast.success(`Plan "${planId}" updated.`);
  }, []);

  const getAgencyDetails = React.useCallback(
    (agencyId: string) => {
      const agency = agencies.find((a) => a.id === agencyId);
      const owner = agencyOwners.find((o) => o.agencyId === agencyId);
      const subscription = subscriptions.find((s) => s.agencyId === agencyId);
      const plan = plans.find((p) => p.id === subscription?.planId);
      const payments = subscriptionPayments.filter((p) => p.agencyId === agencyId);
      const activities = agencyActivities.filter((act) => act.agencyId === agencyId);

      return { agency, owner, subscription, plan, payments, activities };
    },
    [agencies, agencyOwners, subscriptions, plans, subscriptionPayments, agencyActivities]
  );

  const getPendingPayments = React.useCallback(() => {
    return subscriptionPayments.filter((p) => p.status === "Pending");
  }, [subscriptionPayments]);

  const getPlatformStats = React.useCallback(() => {
    const totalAgencies = agencies.length;
    const activeAgencies = agencies.filter((a) => a.status === "ACTIVE").length;
    const trialAgencies = agencies.filter((a) => a.status === "TRIAL").length;
    const pastDueAgencies = agencies.filter((a) => a.status === "PAST_DUE").length;
    const readOnlyAgencies = agencies.filter((a) => a.status === "READ_ONLY").length;
    const suspendedAgencies = agencies.filter((a) => a.status === "SUSPENDED").length;
    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === "ACTIVE" || s.status === "TRIAL"
    ).length;
    const pendingPaymentsCount = subscriptionPayments.filter((p) => p.status === "Pending").length;

    // Calculate MRR from active / past due subscriptions
    const mrr = subscriptions
      .filter((s) => s.status === "ACTIVE" || s.status === "PAST_DUE")
      .reduce((sum, s) => {
        const monthlyValue = s.billingCycle === "Yearly" ? Math.round(s.amount / 12) : s.amount;
        return sum + monthlyValue;
      }, 0);

    const arr = mrr * 12;

    return {
      totalAgencies,
      activeAgencies,
      trialAgencies,
      pastDueAgencies,
      readOnlyAgencies,
      suspendedAgencies,
      activeSubscriptions,
      pendingPaymentsCount,
      mrr,
      arr,
    };
  }, [agencies, subscriptions, subscriptionPayments]);

  return (
    <SaaSContext.Provider
      value={{
        agencies,
        agencyOwners,
        plans,
        subscriptions,
        subscriptionPayments,
        agencyActivities,
        createAgency,
        updateAgency,
        updateAgencyStatus,
        updateSubscription,
        verifyPayment,
        rejectPayment,
        updatePlan,
        getAgencyDetails,
        getPendingPayments,
        getPlatformStats,
      }}
    >
      {children}
    </SaaSContext.Provider>
  );
}

export function useSaaS() {
  const context = React.useContext(SaaSContext);
  if (!context) {
    throw new Error("useSaaS must be used within a SaaSProvider");
  }
  return context;
}
