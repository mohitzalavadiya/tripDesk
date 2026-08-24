"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSaaS } from "@/context/saas-context";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/costing-engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  Layers,
  IndianRupee,
  Activity,
  Sparkles,
  Check,
  X,
  QrCode,
  ExternalLink,
  Eye,
} from "lucide-react";
import { SaaSSubscriptionPayment } from "@/data/saas-data";

export default function AdminDashboardPage() {
  const router = useRouter();
  const {
    agencies,
    agencyOwners,
    subscriptions,
    plans,
    getPlatformStats,
    getPendingPayments,
    verifyPayment,
    rejectPayment,
  } = useSaaS();

  const stats = getPlatformStats();
  const pendingPayments = getPendingPayments();

  // Payment Review Modal State
  const [selectedPayment, setSelectedPayment] = React.useState<SaaSSubscriptionPayment | null>(null);
  const [isRejecting, setIsRejecting] = React.useState(false);
  const [rejectionReason, setRejectionReason] = React.useState("");

  const handleVerify = (payment: SaaSSubscriptionPayment) => {
    verifyPayment(payment.id);
    setSelectedPayment(null);
    setIsRejecting(false);
    setRejectionReason("");
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    rejectPayment(selectedPayment.id, rejectionReason);
    setSelectedPayment(null);
    setIsRejecting(false);
    setRejectionReason("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="TripDesk Platform Administration"
          description="SaaS Overview — Manage subscribed travel agencies, billing renewals, plans, and platform revenue."
          breadcrumbs={[{ label: "SaaS Platform" }, { label: "Admin Dashboard" }]}
          primaryAction={{
            label: "Create Agency",
            onClick: () => router.push("/admin/agencies/new"),
            icon: Plus,
          }}
        />

        {/* ─── 6 PLATFORM KPI CARDS ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* 1. Total Agencies */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Agencies</span>
              <Building2 className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalAgencies}</p>
            <p className="text-[11px] text-slate-500 font-medium">Registered businesses</p>
          </div>

          {/* 2. Active Agencies */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-700 tracking-tight">{stats.activeAgencies}</p>
            <p className="text-[11px] text-slate-500 font-medium">Full paid access</p>
          </div>

          {/* 3. Trial Agencies */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Trial</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700 tracking-tight">{stats.trialAgencies}</p>
            <p className="text-[11px] text-slate-500 font-medium">7-day evaluations</p>
          </div>

          {/* 4. Suspended */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Suspended</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-700 tracking-tight">{stats.suspendedAgencies}</p>
            <p className="text-[11px] text-slate-500 font-medium">Overdue renewals</p>
          </div>

          {/* 5. Active Subscriptions */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Subscriptions</span>
              <CreditCard className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-700 tracking-tight">{stats.activeSubscriptions}</p>
            <p className="text-[11px] text-slate-500 font-medium">Active billing accounts</p>
          </div>

          {/* 6. Pending Payments */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-blue-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending Payments</span>
              <IndianRupee className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-blue-700 tracking-tight">{stats.pendingPaymentsCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Awaiting verification</p>
          </div>
        </div>

        {/* ─── PENDING PAYMENTS SECTION ───────────────────────────────────── */}
        {pendingPayments.length > 0 && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider">
                  Pending B2B Subscription Payments ({pendingPayments.length})
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin/payments")}
                className="text-xs font-bold text-amber-800 hover:text-amber-950 cursor-pointer"
              >
                View All Payments →
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingPayments.map((p) => (
                <div
                  key={p.id}
                  className="bg-white border border-amber-200 rounded-2xl p-4.5 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{p.agencyName}</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(p.amount)}
                      </span>
                    </div>
                    <p className="text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>Plan: <strong>{p.planName}</strong></span>
                      <span>•</span>
                      <span>Method: <strong>{p.method}</strong></span>
                      <span>•</span>
                      <span className="font-mono text-indigo-600 font-bold">{p.reference}</span>
                    </p>
                    {p.notes && <p className="text-[11px] text-slate-600 italic">{p.notes}</p>}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/agencies/${p.agencyId}`)}
                      className="text-xs font-semibold text-slate-600 hover:text-indigo-600 cursor-pointer"
                    >
                      View Agency →
                    </button>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedPayment(p)}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer"
                      >
                        Review Payment
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── RECENT AGENCIES DIRECTORY ───────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Recent Travel Agencies
              </h3>
              <p className="text-xs text-slate-500">
                Subscribed travel management agencies on the platform.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/admin/agencies")}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
            >
              Manage All Agencies ({agencies.length}) →
            </Button>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {agencies.slice(0, 5).map((agency) => {
              const owner = agencyOwners.find((o) => o.agencyId === agency.id);
              const sub = subscriptions.find((s) => s.agencyId === agency.id);

              return (
                <div
                  key={agency.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{agency.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          agency.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : agency.status === "TRIAL"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : agency.status === "PAST_DUE"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : agency.status === "READ_ONLY"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {agency.status.replace("_", " ")}
                      </span>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {sub?.planId === "professional" ? "Professional" : "Starter"} Plan
                      </span>
                    </div>

                    <p className="text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>Owner: <strong>{owner?.name || "Agency Owner"}</strong></span>
                      <span>•</span>
                      <span>{agency.city}, {agency.state || agency.country}</span>
                      <span>•</span>
                      <span>Joined: {agency.createdAt}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Renewal / Expiry
                      </span>
                      <span className="font-bold text-slate-900 font-mono">
                        {sub?.renewalDate || "—"}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/admin/agencies/${agency.id}`)}
                      className="h-8 text-xs font-semibold cursor-pointer bg-white"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      View
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── PAYMENT REVIEW MODAL ─────────────────────────────────────────── */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
          <div className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Review Subscription Payment</h3>
                  <p className="text-xs text-slate-500">Transaction ID: {selectedPayment.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPayment(null);
                  setIsRejecting(false);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Subscribing Agency:</span>
                <strong className="text-slate-900">{selectedPayment.agencyName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Plan Tier:</span>
                <strong className="text-indigo-600">{selectedPayment.planName} Plan</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Amount:</span>
                <strong className="text-emerald-700 text-sm font-mono">
                  {formatCurrency(selectedPayment.amount)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Payment Method:</span>
                <strong className="text-slate-800">{selectedPayment.method}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Payment Reference (UTR):</span>
                <strong className="font-mono text-purple-700">{selectedPayment.reference}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Submission Date:</span>
                <span className="text-slate-700">{selectedPayment.paymentDate}</span>
              </div>
              {selectedPayment.notes && (
                <div className="pt-1 border-t border-slate-200/60">
                  <span className="text-[11px] text-slate-400 block font-medium">Notes / Remarks:</span>
                  <p className="text-slate-700 italic">{selectedPayment.notes}</p>
                </div>
              )}
            </div>

            {isRejecting ? (
              <form onSubmit={handleReject} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-rose-700">Rejection Reason</label>
                  <Textarea
                    placeholder="e.g. Payment reference UTR not found in bank statement..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                    className="text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsRejecting(false)}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-4 rounded-xl cursor-pointer"
                  >
                    Confirm Rejection
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRejecting(true)}
                  className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs font-semibold h-9 px-4 rounded-xl cursor-pointer"
                >
                  Reject Payment
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleVerify(selectedPayment)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-5 rounded-xl cursor-pointer shadow-xs"
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Verify & Activate Agency
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
