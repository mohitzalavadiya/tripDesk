"use client";

import * as React from "react";
import { useAuth } from "@/context/auth-context";
import { useSaaS } from "@/context/saas-context";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/costing-engine";
import { Button } from "@/components/ui/button";
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
  HelpCircle,
  Clock,
  ExternalLink,
} from "lucide-react";

export default function AgencySubscriptionPage() {
  const { currentUser } = useAuth();
  const { agencies, subscriptions, plans } = useSaaS();

  const currentAgency = agencies.find((a) => a.id === currentUser.agencyId) || agencies[0];
  const currentSub = subscriptions.find((s) => s.agencyId === currentAgency.id) || subscriptions[0];
  const currentPlan = plans.find((p) => p.id === currentSub.planId) || plans[0];

  const handleContactSupport = () => {
    window.open(
      `https://wa.me/919847099000?text=${encodeURIComponent(
        `Hi TripDesk Support! I am ${currentUser.name} from ${currentAgency.name}. I need assistance with our SaaS subscription.`
      )}`,
      "_blank"
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Agency Subscription & Plan"
          description="View your TripDesk SaaS plan details, subscription renewals, feature inclusions, and billing support."
          breadcrumbs={[{ label: "Agency Settings" }, { label: "Subscription" }]}
          primaryAction={{
            label: "Contact TripDesk",
            onClick: handleContactSupport,
            icon: Phone,
          }}
        />

        {/* ─── ACTIVE PLAN HERO CARD ──────────────────────────────────────── */}
        <div className="bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                    currentAgency.status === "ACTIVE"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : currentAgency.status === "TRIAL"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : currentAgency.status === "PAST_DUE"
                      ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {currentAgency.status === "PAST_DUE" ? "PAYMENT REQUIRED" : `${currentAgency.status} SUBSCRIPTION`}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Agency: {currentAgency.name}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {currentPlan.name} Plan
              </h2>
              <p className="text-xs text-slate-300">{currentPlan.tagline}</p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                Subscription Fee ({currentSub.billingCycle})
              </span>
              <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                {formatCurrency(currentSub.amount)}
              </span>
              <span className="text-xs text-slate-400 block font-medium">
                {currentSub.billingCycle === "Yearly" ? "/ year" : "/ month"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/10 backdrop-blur-xs rounded-2xl p-4 text-xs border border-white/15">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> {currentAgency.status}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Billing Cycle</span>
              <span className="font-bold text-white mt-0.5 block">{currentSub.billingCycle}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Trial Status</span>
              <span className="font-bold text-white mt-0.5 block">
                {currentSub.status === "TRIAL" ? "7-Day Free Trial" : "Full Paid Account"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Next Renewal</span>
              <span className="font-bold text-amber-300 font-mono mt-0.5 block">
                {currentSub.renewalDate}
              </span>
            </div>
          </div>
        </div>

        {/* ─── 2-COLUMN SECTION: INCLUSIONS & MANUAL PAYMENT DETAILS ───────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Plan Inclusions */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
              Included Features in {currentPlan.name} Plan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {currentPlan.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 text-slate-700">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right 5 Cols: Subscription Renewal & Manual Payment Info */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <QrCode className="h-5 w-5 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Manual Subscription Renewal (V1)
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              TripDesk subscriptions are renewed manually via Direct UPI or Bank Transfer. After making payment, share your UTR reference for instant verification.
            </p>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  TripDesk Official Billing UPI ID
                </span>
                <span className="font-mono font-black text-slate-900 text-sm bg-white px-2.5 py-1 rounded border border-slate-200 block">
                  tripdesk.billing@icici
                </span>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-200/60">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">
                  Bank Account Transfer (NEFT / RTGS / IMPS)
                </span>
                <p className="text-slate-700 leading-relaxed">
                  <strong>A/C Name:</strong> TripDesk SaaS Technologies Pvt Ltd<br />
                  <strong>Bank:</strong> ICICI Bank, MG Road Branch<br />
                  <strong>A/C No:</strong> 002105009844<br />
                  <strong>IFSC:</strong> ICIC0000021
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleContactSupport}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 rounded-xl cursor-pointer"
              >
                <Phone className="h-3.5 w-3.5 mr-1.5" />
                Contact TripDesk for Renewal
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
