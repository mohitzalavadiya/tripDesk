"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/costing-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle2,
  Calendar,
  Sparkles,
  ShieldCheck,
  Phone,
  QrCode,
  Building,
  Check,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  HelpCircle,
  X,
  FileText,
  BadgeCheck,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { subscriptionClient } from "@/lib/api-client/subscription-client";

interface AgencySubscriptionData {
  agency: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
  };
  subscription: {
    id: string;
    status: "TRIAL" | "ACTIVE" | "EXPIRED" | "CANCELLED";
    billingCycle: "MONTHLY" | "YEARLY" | string;
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
    status: string;
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
    status: string;
    notes: string | null;
    verifiedAt: string | null;
    rejectedAt: string | null;
    rejectionReason: string | null;
    createdAt: string;
  }>;
}

interface PlanItem {
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
}

export default function AgencySubscriptionPage() {
  const [data, setData] = React.useState<AgencySubscriptionData | null>(null);
  const [plans, setPlans] = React.useState<PlanItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [billingCycle, setBillingCycle] = React.useState<"MONTHLY" | "YEARLY">("MONTHLY");

  // Plan Selection & Payment Modal State
  const [selectedPlanForPurchase, setSelectedPlanForPurchase] = React.useState<PlanItem | null>(null);
  const [modalStep, setModalStep] = React.useState<"CONFIRM" | "PAYMENT" | "SUCCESS">("CONFIRM");
  const [paymentMethod, setPaymentMethod] = React.useState<"UPI" | "BANK_TRANSFER">("UPI");
  const [utrNumber, setUtrNumber] = React.useState("");
  const [paymentNotes, setPaymentNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const subRes = await subscriptionClient.getSubscription();
      if (subRes.success && subRes.data) {
        setData(subRes.data);
        if (subRes.data.availablePlans && subRes.data.availablePlans.length > 0) {
          setPlans(subRes.data.availablePlans);
        } else {
          const plansRes = await subscriptionClient.getActivePlans().catch(() => ({ success: false, data: [] }));
          if (plansRes.success && plansRes.data) {
            setPlans(plansRes.data);
          }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load subscription details");
    } finally {
      setLoading(false);
    }
  }, []);


  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleContactSupport = () => {
    const agencyName = data?.agency.name || "TripDesk Agency";
    window.open(
      `https://wa.me/919847099000?text=${encodeURIComponent(
        `Hi TripDesk Billing Support! I am from ${agencyName}. I need assistance with our SaaS subscription & plan upgrade.`
      )}`,
      "_blank"
    );
  };

  const handleOpenPurchase = (plan: PlanItem) => {
    setSelectedPlanForPurchase(plan);
    setModalStep("CONFIRM");
    setUtrNumber("");
    setPaymentNotes("");
  };

  const handleCloseModal = () => {
    setSelectedPlanForPurchase(null);
    setModalStep("CONFIRM");
    setUtrNumber("");
    setPaymentNotes("");
  };

  const calculatePlanPrice = (plan: PlanItem, cycle: "MONTHLY" | "YEARLY") => {
    if (cycle === "YEARLY") {
      return plan.yearlyPrice ? plan.yearlyPrice : plan.price * 10;
    }
    return plan.price;
  };

  const calculateSavingsPercent = (plan: PlanItem) => {
    if (!plan.yearlyPrice) return 0;
    const regularYearly = plan.price * 12;
    const savings = regularYearly - plan.yearlyPrice;
    if (savings <= 0) return 0;
    return Math.round((savings / regularYearly) * 100);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForPurchase) return;

    if (!utrNumber.trim() || utrNumber.trim().length < 4) {
      toast.error("Please enter a valid transaction reference / UTR number (min 4 characters).");
      return;
    }

    setSubmitting(true);
    try {
      await subscriptionClient.submitPaymentRequest({
        planId: selectedPlanForPurchase.id,
        billingCycle,
        paymentMethod,
        utrNumber: utrNumber.trim(),
        notes: paymentNotes.trim() || undefined,
      });

      toast.success("Payment request submitted successfully! Waiting for verification.");
      setModalStep("SUCCESS");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit payment request");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 pb-20">
        <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
          <div className="h-10 bg-slate-200/60 rounded-xl w-72 animate-pulse" />
          <div className="h-56 bg-slate-900/10 rounded-3xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-96 bg-white rounded-3xl border border-slate-200/80 animate-pulse" />
            <div className="h-96 bg-white rounded-3xl border border-slate-200/80 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const sub = data?.subscription;
  const isTrial = sub?.status === "TRIAL";
  const isTrialExpired = sub?.isTrialExpired;
  const isActivePaid = sub?.status === "ACTIVE";
  const pendingPayment = data?.latestPendingPayment;
  const rejectedPayments = (data?.paymentHistory || []).filter((p) => p.status === "REJECTED");
  const latestRejected = rejectedPayments.length > 0 ? rejectedPayments[0] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Agency Subscription & Billing"
          description="Manage your TripDesk SaaS subscription tier, renewals, billing cycle, and manual payment verification."
          breadcrumbs={[{ label: "Agency Settings" }, { label: "Subscription" }]}
          primaryAction={{
            label: "Contact Billing Support",
            onClick: handleContactSupport,
            icon: Phone,
          }}
        />

        {/* ─── 1. ACTIVE NOTIFICATIONS / ALERTS ────────────────────────────── */}
        {/* A. Pending Payment Notification */}
        {pendingPayment && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/20 text-amber-700 rounded-2xl shrink-0 mt-0.5">
                  <Clock className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                      Payment Verification In Progress
                    </span>
                    <span className="text-[10px] font-bold bg-amber-200/60 text-amber-900 px-2 py-0.5 rounded-full">
                      Status: PENDING
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                    Your payment request for the <strong>{pendingPayment.planName || "Selected"} Plan</strong> ({pendingPayment.billingCycle}) amounting to <strong>{formatCurrency(pendingPayment.amount)}</strong> has been submitted.
                  </p>
                  <p className="text-[11px] text-amber-800 font-mono mt-1">
                    UTR / Reference: <strong>{pendingPayment.utrNumber || "N/A"}</strong> • Submitted: {new Date(pendingPayment.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-semibold text-amber-700 bg-amber-100/70 border border-amber-300/60 px-3 py-1.5 rounded-xl block text-center">
                  Reviewing by Platform Owner
                </span>
              </div>
            </div>
          </div>
        )}

        {/* B. Rejected Payment Notification */}
        {latestRejected && !pendingPayment && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-2xl shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                  Previous Payment Request Rejected
                </h4>
                <p className="text-xs text-rose-700 leading-relaxed">
                  Reason: <strong>{latestRejected.rejectionReason || "UTR reference could not be verified on bank records."}</strong>
                </p>
                <p className="text-[11px] text-rose-600 font-mono">
                  UTR: {latestRejected.utrNumber} • Amount: {formatCurrency(latestRejected.amount)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── 2. CURRENT PLAN / TRIAL HERO CARD ───────────────────────────── */}
        <div className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    isActivePaid
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : isTrial && !isTrialExpired
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isActivePaid
                    ? "ACTIVE SUBSCRIPTION"
                    : isTrial && !isTrialExpired
                    ? "7-DAY FREE TRIAL"
                    : "TRIAL EXPIRED"}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Agency: {data?.agency.name}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {sub?.planName || "Starter"} Plan
              </h2>
              <p className="text-xs text-slate-300 max-w-xl">
                {sub?.planDescription || "Complete cloud workspace for modern travel agencies and boutique tour operators."}
              </p>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                {isActivePaid ? `Billed ${sub?.billingCycle}` : "Trial Pricing"}
              </span>
              <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                {isActivePaid
                  ? sub?.billingCycle === "YEARLY" && sub.planYearlyPrice
                    ? formatCurrency(sub.planYearlyPrice)
                    : formatCurrency(sub?.planPrice || 0)
                  : "₹0.00"}
              </span>
              <span className="text-xs text-slate-400 block font-medium">
                {isActivePaid
                  ? sub?.billingCycle === "YEARLY"
                    ? "/ year"
                    : "/ month"
                  : "Free 7-Day Access"}
              </span>
            </div>
          </div>

          {/* 4-Item Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/10 backdrop-blur-xs rounded-2xl p-4 text-xs border border-white/15 relative z-10">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> {sub?.status}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {isTrial ? "Trial Validity" : "Billing Cycle"}
              </span>
              <span className="font-bold text-white mt-0.5 block">
                {isTrial
                  ? `${sub?.daysRemaining} days remaining`
                  : sub?.billingCycle === "YEARLY"
                  ? "Yearly Billing"
                  : "Monthly Billing"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {isTrial ? "Trial Started" : "Subscription Start"}
              </span>
              <span className="font-bold text-slate-200 mt-0.5 block font-mono">
                {sub?.trialStart
                  ? new Date(sub.trialStart).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : sub?.subscriptionStart
                  ? new Date(sub.subscriptionStart).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {isTrial ? "Trial Ends / Expires" : "Next Renewal Date"}
              </span>
              <span className="font-bold text-amber-300 font-mono mt-0.5 block">
                {sub?.trialEnd
                  ? new Date(sub.trialEnd).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : sub?.subscriptionEnd
                  ? new Date(sub.subscriptionEnd).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* ─── 3. PLAN SELECTION SECTION & BILLING TOGGLE ─────────────────── */}
        <div className="space-y-6 pt-4">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h3 className="text-2xl font-black tracking-tight text-slate-900">
              Choose the Plan That’s Right for Your Agency
            </h3>
            <p className="text-xs text-slate-500">
              Upgrade or renew your subscription with flexible monthly or yearly billing. All plans include full CRM, operations, financial ledgers, and document generators.
            </p>

            {/* Monthly / Yearly Switcher */}
            <div className="inline-flex items-center p-1 bg-slate-200/80 rounded-2xl shadow-inner border border-slate-300/60 mt-2">
              <button
                type="button"
                onClick={() => setBillingCycle("MONTHLY")}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === "MONTHLY"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("YEARLY")}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === "YEARLY"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Yearly Billing</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full shadow-2xs">
                  Save ~17%
                </span>
              </button>
            </div>
          </div>

          {/* Dynamic Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 max-w-5xl mx-auto items-stretch">
            {plans.map((plan) => {
              const isCurrentActive =
                isActivePaid &&
                sub?.planId === plan.id &&
                sub?.billingCycle === billingCycle;
              const isCurrentPlanTrial =
                isTrial && sub?.planId === plan.id;
              const price = calculatePlanPrice(plan, billingCycle);
              const savingsPercent = calculateSavingsPercent(plan);

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-3xl p-6 sm:p-8 border shadow-xs flex flex-col justify-between space-y-6 relative transition-all ${
                    plan.isPopular
                      ? "border-indigo-500 ring-2 ring-indigo-500/20"
                      : "border-slate-200/90 hover:border-indigo-200"
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Header */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xl font-black text-slate-900">{plan.name}</h4>
                        {isCurrentActive && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            Current Plan
                          </span>
                        )}
                        {isCurrentPlanTrial && (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            Active in Trial
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {plan.description || "Essential travel CRM & workflow suite for professional agencies."}
                      </p>
                    </div>

                    {/* Pricing */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">
                          {formatCurrency(price)}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {billingCycle === "YEARLY" ? "/ year" : "/ month"}
                        </span>
                      </div>
                      {billingCycle === "YEARLY" && savingsPercent > 0 && (
                        <p className="text-[11px] text-emerald-600 font-bold">
                          ✓ Includes 2 months free (Save {savingsPercent}%)
                        </p>
                      )}
                    </div>

                    {/* Features Checklist */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Included Features & Capabilities
                      </p>
                      <ul className="space-y-2.5 text-xs text-slate-700">
                        {plan.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2.5">
                            <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="pt-4 border-t border-slate-100">
                    {isCurrentActive ? (
                      <Button
                        disabled
                        className="w-full bg-slate-100 text-slate-500 font-bold text-xs h-10 rounded-2xl cursor-not-allowed"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1.5 text-emerald-600" />
                        Current Active Plan
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleOpenPurchase(plan)}
                        className={`w-full font-bold text-xs h-10 rounded-2xl transition-all cursor-pointer ${
                          plan.isPopular
                            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                            : "bg-slate-900 hover:bg-slate-800 text-white"
                        }`}
                      >
                        <span>Choose {plan.name} ({billingCycle})</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── 4. PAYMENT & SUBSCRIPTION HISTORY ──────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4 mt-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Subscription Payment History</h3>
              <p className="text-xs text-slate-500">
                Log of all manual UPI and Bank Transfer payment submissions for verification.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 font-mono">
              {(data?.paymentHistory || []).length} Records
            </span>
          </div>

          {(data?.paymentHistory || []).length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              No previous payment records found. Your free trial is currently active.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="pb-3 pr-4">Plan & Cycle</th>
                    <th className="pb-3 px-4">Amount</th>
                    <th className="pb-3 px-4">Payment Method</th>
                    <th className="pb-3 px-4">UTR / Ref Number</th>
                    <th className="pb-3 px-4">Submitted Date</th>
                    <th className="pb-3 px-4">Status</th>
                    <th className="pb-3 pl-4 text-right">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.paymentHistory.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 pr-4 font-bold text-slate-900">
                        {p.planName || "SaaS Plan"} ({p.billingCycle})
                      </td>
                      <td className="py-3 px-4 font-bold font-mono text-slate-900">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {p.paymentMethod}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {p.utrNumber || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(p.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : p.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 pl-4 text-right text-slate-500 max-w-xs truncate">
                        {p.rejectionReason ? (
                          <span className="text-rose-600 font-medium">
                            {p.rejectionReason}
                          </span>
                        ) : (
                          p.notes || "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── 5. CONFIRMATION & UTR SUBMISSION MODAL ───────────────────────── */}
      {selectedPlanForPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {modalStep === "CONFIRM" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Confirm Subscription</h3>
                    <p className="text-xs text-slate-500">Review selected tier parameters before payment</p>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Plan Tier:</span>
                    <span className="font-black text-slate-900 text-sm">{selectedPlanForPurchase.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Billing Cycle:</span>
                    <span className="font-bold text-indigo-700 uppercase">{billingCycle}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-200/60 pt-2">
                    <span className="text-slate-500">Payable Amount:</span>
                    <span className="font-black text-slate-900 text-base font-mono">
                      {formatCurrency(calculatePlanPrice(selectedPlanForPurchase, billingCycle))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>Payment Method:</span>
                    <span className="font-semibold text-slate-700">Direct UPI / Bank Transfer (NEFT/IMPS)</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    className="w-1/2 text-xs font-semibold h-10 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setModalStep("PAYMENT")}
                    className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-10 rounded-xl cursor-pointer"
                  >
                    Continue to Payment
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {modalStep === "PAYMENT" && (
              <form onSubmit={handleSubmitPayment} className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Complete Manual Payment</h3>
                    <p className="text-xs text-slate-500">Transfer payment and enter your UTR reference</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Amount to Pay Callout */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-indigo-700 block">Total Amount Due</span>
                    <span className="text-2xl font-black text-indigo-950 font-mono">
                      {formatCurrency(calculatePlanPrice(selectedPlanForPurchase, billingCycle))}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-indigo-700 bg-white px-3 py-1 rounded-xl border border-indigo-200">
                    {selectedPlanForPurchase.name} • {billingCycle}
                  </span>
                </div>

                {/* Bank / UPI Details */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      TripDesk Official Billing UPI ID
                    </span>
                    <span className="font-mono font-black text-slate-900 text-sm bg-white px-2.5 py-1 rounded border border-slate-200 block select-all">
                      tripdesk.billing@icici
                    </span>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Direct Bank Transfer (NEFT / IMPS / RTGS)
                    </span>
                    <div className="text-slate-700 leading-relaxed space-y-0.5 select-all">
                      <p><strong>A/C Name:</strong> TripDesk SaaS Technologies Pvt Ltd</p>
                      <p><strong>Bank:</strong> ICICI Bank, MG Road Branch</p>
                      <p><strong>A/C Number:</strong> 002105009844</p>
                      <p><strong>IFSC Code:</strong> ICIC0000021</p>
                    </div>
                  </div>
                </div>

                {/* UTR Input Form */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Transaction Reference Number / UTR <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      placeholder="e.g. 423589123456 or UPI Reference ID"
                      className="text-xs font-mono"
                      required
                    />
                    <p className="text-[10px] text-slate-400">
                      Enter the 12-digit UTR from your bank or UPI payment receipt.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Payment Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("UPI")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          paymentMethod === "UPI"
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        UPI Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("BANK_TRANSFER")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          paymentMethod === "BANK_TRANSFER"
                            ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        Bank Transfer (NEFT/IMPS)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800">
                      Optional Remarks
                    </label>
                    <Textarea
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="e.g. Paid via HDFC Corporate UPI"
                      className="text-xs min-h-[60px]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalStep("CONFIRM")}
                    disabled={submitting}
                    className="w-1/3 text-xs font-semibold h-10 rounded-xl cursor-pointer"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 rounded-xl cursor-pointer"
                  >
                    {submitting ? "Submitting..." : "Submit Payment for Verification"}
                  </Button>
                </div>
              </form>
            )}

            {modalStep === "SUCCESS" && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900">Payment Request Submitted!</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Your payment request has been received. Our team will verify your UTR reference against bank statements and activate your subscription shortly.
                  </p>
                </div>
                <div className="pt-2">
                  <Button
                    onClick={handleCloseModal}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-10 rounded-xl cursor-pointer"
                  >
                    Back to Subscription Dashboard
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
