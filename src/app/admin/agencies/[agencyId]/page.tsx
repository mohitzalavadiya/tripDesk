"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  User,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Phone,
  Mail,
  MapPin,
  FileText,
  History,
  IndianRupee,
  RefreshCw,
  Ban,
  Activity,
  Users,
  Compass,
  Sparkles,
} from "lucide-react";
import { adminClient } from "@/lib/api-client/admin-client";
import { Agency360Details } from "@/lib/services/admin-service";

export default function AgencyDetailsPage() {
  const params = useParams();
  const agencyId = params.agencyId as string;
  const router = useRouter();

  const [details, setDetails] = React.useState<Agency360Details | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"overview" | "subscription" | "usage" | "audit">("overview");

  // Extend Trial Modal
  const [isExtendOpen, setIsExtendOpen] = React.useState(false);
  const [extendDays, setExtendDays] = React.useState(7);
  const [extendReason, setExtendReason] = React.useState("Promotional trial extension");
  const [extending, setExtending] = React.useState(false);

  // Suspend Modal
  const [isSuspendOpen, setIsSuspendOpen] = React.useState(false);
  const [suspendReason, setSuspendReason] = React.useState("");
  const [suspending, setSuspending] = React.useState(false);

  const fetchAgency = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminClient.getAgency(agencyId);
      if (res.success && res.data) {
        setDetails(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load agency details");
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  React.useEffect(() => {
    fetchAgency();
  }, [fetchAgency]);

  const handleExtendTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    setExtending(true);
    try {
      await adminClient.extendTrial(agencyId, extendDays, extendReason);
      toast.success(`Trial extended by ${extendDays} days`);
      setIsExtendOpen(false);
      fetchAgency();
    } catch (err: any) {
      toast.error(err.message || "Failed to extend trial");
    } finally {
      setExtending(false);
    }
  };

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendReason.trim()) {
      toast.error("Please provide a suspension reason");
      return;
    }
    setSuspending(true);
    try {
      await adminClient.suspendAgency(agencyId, suspendReason);
      toast.success("Agency suspended successfully");
      setIsSuspendOpen(false);
      setSuspendReason("");
      fetchAgency();
    } catch (err: any) {
      toast.error(err.message || "Failed to suspend agency");
    } finally {
      setSuspending(false);
    }
  };

  const handleReactivate = async () => {
    try {
      await adminClient.reactivateAgency(agencyId);
      toast.success("Agency reactivated successfully");
      fetchAgency();
    } catch (err: any) {
      toast.error(err.message || "Failed to reactivate agency");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 text-purple-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading Agency 360 Workspace...</p>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Building2 className="h-12 w-12 text-slate-300" />
        <h2 className="text-lg font-bold text-slate-800">Agency Not Found</h2>
        <Link href="/admin/agencies">
          <Button variant="outline" size="sm" className="bg-white">
            Return to Agency Directory
          </Button>
        </Link>
      </div>
    );
  }

  const { identity, owner, subscription, usageTelemetry, auditLogs } = details;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/agencies"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-purple-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Agencies
          </Link>
          <div className="flex items-center gap-2">
            {identity.status === "ACTIVE" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSuspendOpen(true)}
                className="h-8 text-xs font-semibold border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                <Ban className="h-3.5 w-3.5 mr-1" /> Suspend Agency
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReactivate}
                className="h-8 text-xs font-semibold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Reactivate Agency
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => setIsExtendOpen(true)}
              className="h-8 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Clock className="h-3.5 w-3.5 mr-1" /> Extend Trial
            </Button>
          </div>
        </div>

        {/* ─── AGENCY 360 HERO HEADER ─────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-black text-xl shrink-0">
                {identity.name.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">{identity.name}</h1>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      identity.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : identity.status === "SUSPENDED"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {identity.status}
                  </span>
                  {subscription && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      Plan: {subscription.plan?.name || "Standard"} ({subscription.status})
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-slate-400" /> {identity.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {identity.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" /> Joined{" "}
                    {new Date(identity.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick telemetry summary */}
            <div className="flex items-center gap-4 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Customers</p>
                <p className="text-base font-black text-slate-900">{usageTelemetry.customers}</p>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Bookings</p>
                <p className="text-base font-black text-indigo-600">{usageTelemetry.bookings}</p>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Vouchers</p>
                <p className="text-base font-black text-purple-600">{usageTelemetry.documents}</p>
              </div>
            </div>
          </div>

          {/* ─── TABS HEADER ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 border-t border-slate-100 mt-6 pt-3">
            {[
              { id: "overview", label: "Agency Overview & Owner" },
              { id: "subscription", label: "Subscription & Trial Lifecycle" },
              { id: "usage", label: "Live Usage Telemetry" },
              { id: "audit", label: `Platform Audit Logs (${auditLogs.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ─── TAB CONTENT ───────────────────────────────────────────────── */}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Identity & Details */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Agency Identity
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Agency Name</span>
                  <span className="font-semibold text-slate-800">{identity.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Agency ID</span>
                  <span className="font-mono text-slate-600 text-[11px]">{identity.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Primary Email</span>
                  <span className="font-semibold text-slate-800">{identity.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Phone Number</span>
                  <span className="font-semibold text-slate-800">{identity.phone}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block font-medium">Physical Address</span>
                  <span className="text-slate-700">{identity.address || "No address provided"}</span>
                </div>
              </div>
            </div>

            {/* Owner Profile */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Agency Owner Profile
              </h3>
              {owner ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{owner.name}</p>
                      <p className="text-xs text-slate-500">{owner.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-3">
                    <div>
                      <span className="text-slate-400 block font-medium">Internal Role</span>
                      <span className="font-semibold text-purple-700">{owner.role}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Contact Phone</span>
                      <span className="font-semibold text-slate-800">{owner.phone || "Not set"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No Agency Owner assigned.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SUBSCRIPTION */}
        {activeTab === "subscription" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Subscription & Billing Lifecycle
                </h3>
                <p className="text-xs text-slate-500">Plan details, free trial tracking, and renewals</p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsExtendOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
              >
                + Extend Trial
              </Button>
            </div>

            {subscription ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-purple-600">Current Plan</span>
                  <p className="text-lg font-black text-slate-900">{subscription.plan?.name || "Standard"}</p>
                  <p className="text-xs text-slate-500">₹{subscription.plan?.price || 0} / month</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Status</span>
                  <p className="text-lg font-black text-slate-900">{subscription.status}</p>
                  <p className="text-xs text-slate-500">
                    {subscription.status === "TRIAL"
                      ? `${subscription.daysRemaining} days remaining`
                      : "Active Subscription"}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Trial Period</span>
                  <p className="text-xs font-semibold text-slate-800">
                    {subscription.trialStart ? new Date(subscription.trialStart).toLocaleDateString() : "N/A"}
                  </p>
                  <p className="text-xs text-slate-500">
                    to {subscription.trialEnd ? new Date(subscription.trialEnd).toLocaleDateString() : "N/A"}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Paid Period</span>
                  <p className="text-xs font-semibold text-slate-800">
                    {subscription.subscriptionStart ? new Date(subscription.subscriptionStart).toLocaleDateString() : "Not active"}
                  </p>
                  <p className="text-xs text-slate-500">
                    to {subscription.subscriptionEnd ? new Date(subscription.subscriptionEnd).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No active subscription record.</p>
            )}
          </div>
        )}

        {/* TAB 3: USAGE TELEMETRY */}
        {activeTab === "usage" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Platform Usage Telemetry
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {[
                { label: "Total Customers", count: usageTelemetry.customers, icon: "👥" },
                { label: "Trips / Itineraries", count: usageTelemetry.trips, icon: "🧭" },
                { label: "Quotations Issued", count: usageTelemetry.quotations, icon: "📄" },
                { label: "Confirmed Bookings", count: usageTelemetry.bookings, icon: "📅" },
                { label: "Enquiries & Leads", count: usageTelemetry.enquiries, icon: "💬" },
                { label: "Suppliers Configured", count: usageTelemetry.suppliers, icon: "🏢" },
                { label: "Official Documents", count: usageTelemetry.documents, icon: "📜" },
                { label: "Comms & Notifications", count: usageTelemetry.communications, icon: "🔔" },
                { label: "Payment Transactions", count: usageTelemetry.payments, icon: "💳" },
              ].map((m) => (
                <div key={m.label} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">{m.label}</span>
                    <span className="text-sm">{m.icon}</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{m.count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === "audit" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
              Platform Governance & Audit Trail
            </h3>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No platform audit events logged for this agency.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{log.action}</span>
                        <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded border border-purple-100">
                          {log.entityType}
                        </span>
                      </div>
                      {log.metadata && (
                        <p className="text-[11px] text-slate-500 font-mono">
                          {JSON.stringify(log.metadata)}
                        </p>
                      )}
                    </div>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── EXTEND TRIAL MODAL ─────────────────────────────────────────── */}
      {isExtendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">Extend Trial Access</h3>

            <form onSubmit={handleExtendTrial} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Days to Add</label>
                <div className="grid grid-cols-4 gap-2">
                  {[7, 14, 30, 60].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExtendDays(d)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        extendDays === d
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      +{d} Days
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Reason</label>
                <Input
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  placeholder="e.g. Sales accommodation or VIP evaluation"
                  className="text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExtendOpen(false)}
                  disabled={extending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={extending}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                >
                  {extending ? "Extending..." : "Confirm Extension"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── SUSPEND MODAL ─────────────────────────────────────────────── */}
      {isSuspendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 text-rose-600">Suspend Agency Access</h3>

            <p className="text-xs text-slate-600">
              Are you sure you want to suspend this agency? This blocks login and operations while preserving historical data.
            </p>

            <form onSubmit={handleSuspend} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Reason for Suspension</label>
                <Input
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Subscription lapsed or policy violation"
                  className="text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSuspendOpen(false)}
                  disabled={suspending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={suspending}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                >
                  {suspending ? "Suspending..." : "Confirm Suspension"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
