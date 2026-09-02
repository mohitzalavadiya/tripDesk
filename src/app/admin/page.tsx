"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  RefreshCw,
  ExternalLink,
  Compass,
  CalendarCheck,
  FileText,
  Sparkles,
} from "lucide-react";
import { adminClient } from "@/lib/api-client/admin-client";
import { PlatformOverviewStats, GlobalSearchResult } from "@/lib/services/admin-service";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = React.useState<PlatformOverviewStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<GlobalSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);

  // Extend Trial Modal State
  const [extendModalAgency, setExtendModalAgency] = React.useState<{ id: string; name: string } | null>(null);
  const [extendDays, setExtendDays] = React.useState(7);
  const [extendReason, setExtendReason] = React.useState("Promotional trial extension");
  const [extending, setExtending] = React.useState(false);

  const fetchOverview = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminClient.getOverview();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load platform stats");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Handle Search
  React.useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await adminClient.globalSearch(searchQuery.trim());
        if (res.success && res.data) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleExtendTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendModalAgency) return;
    setExtending(true);
    try {
      await adminClient.extendTrial(extendModalAgency.id, extendDays, extendReason);
      toast.success(`Trial extended by ${extendDays} days for ${extendModalAgency.name}`);
      setExtendModalAgency(null);
      fetchOverview();
    } catch (err: any) {
      toast.error(err.message || "Failed to extend trial");
    } finally {
      setExtending(false);
    }
  };

  const formatRupees = (val: number) => `₹${val.toLocaleString("en-IN")}`;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header */}
        <PageHeader
          title="TripDesk Platform Administration"
          description="SaaS Control Center — Executive metrics, agency governance, trial lifecycles, and cross-tenant intelligence."
          breadcrumbs={[{ label: "SaaS Platform" }, { label: "Admin Control Center" }]}
          primaryAction={{
            label: "Refresh Telemetry",
            onClick: fetchOverview,
            icon: RefreshCw,
          }}
        />

        {/* Global Platform Search */}
        <div className="relative">
          <div className="flex items-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs px-4 py-2.5 gap-3 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500 transition-all">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <Input
              type="text"
              placeholder="Global Search across all tenants (Agencies, Owners, Customers, Bookings, Enquiries)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 text-sm shadow-none p-0 h-auto placeholder:text-slate-400"
            />
            {searching && <RefreshCw className="h-4 w-4 text-purple-500 animate-spin shrink-0" />}
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              <div className="p-2.5 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Matching Cross-Tenant Records ({searchResults.length})</span>
                <span className="text-[10px] text-purple-600 font-semibold">Live Index</span>
              </div>
              {searchResults.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => {
                    router.push(item.url);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="p-3.5 hover:bg-purple-50/40 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                        {item.type}
                      </span>
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-purple-600 transition-colors shrink-0 ml-3" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── 6 PRIMARY EXECUTIVE KPI CARDS ──────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Total Agencies */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 hover:border-purple-200 transition-all">
            <div className="flex items-center justify-between text-purple-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Agencies</span>
              <Building2 className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? "-" : stats?.totalAgencies || 0}
            </p>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              <span className="text-emerald-600 font-bold">{stats?.activeAgencies || 0}</span> active
            </p>
          </div>

          {/* Active Free Trials */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 hover:border-amber-200 transition-all">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Trials</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? "-" : stats?.trialAgencies || 0}
            </p>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
              <span className="text-amber-600 font-bold">{stats?.expiringTrials?.length || 0}</span> expiring soon
            </p>
          </div>

          {/* Expired / Suspended */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 hover:border-rose-200 transition-all">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Expired / Suspended</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? "-" : (stats?.expiredTrialAgencies || 0) + (stats?.suspendedAgencies || 0)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              {stats?.suspendedAgencies || 0} suspended accounts
            </p>
          </div>

          {/* SaaS Monthly MRR */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 hover:border-emerald-200 transition-all">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">SaaS MRR</span>
              <IndianRupee className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-700 tracking-tight">
              {loading ? "-" : formatRupees(stats?.mrr || 0)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              ARR: {loading ? "-" : formatRupees(stats?.arr || 0)}
            </p>
          </div>

          {/* Total Agency Customers */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between text-blue-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">SaaS Customers</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {loading ? "-" : stats?.totalCustomers || 0}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">Across all travel agencies</p>
          </div>

          {/* Total SaaS Bookings Volume */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 hover:border-indigo-200 transition-all">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Agency GMV</span>
              <CalendarCheck className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-700 tracking-tight">
              {loading ? "-" : formatRupees(stats?.agencyBookingVolume || 0)}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              {stats?.totalBookings || 0} confirmed trips
            </p>
          </div>
        </div>

        {/* ─── EXPIRING TRIALS BANNER (ACTIONABLE) ────────────────────────── */}
        {stats?.expiringTrials && stats.expiringTrials.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>{stats.expiringTrials.length} Agencies with Expiring Free Trials (Action Required)</span>
              </div>
              <span className="text-xs text-amber-700 font-semibold">Needs Renewal or Extension</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.expiringTrials.map((agency) => (
                <div
                  key={agency.id}
                  className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs flex items-center justify-between"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-bold text-sm text-slate-900 truncate">{agency.name}</p>
                    <p className="text-xs text-slate-500">{agency.email}</p>
                    <p className="text-[11px] text-amber-600 font-bold">
                      {agency.daysRemaining === 0 ? "Expires Today" : `${agency.daysRemaining} days left`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-semibold border-amber-300 text-amber-800 hover:bg-amber-50 cursor-pointer"
                      onClick={() => setExtendModalAgency({ id: agency.id, name: agency.name })}
                    >
                      + Extend
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                      onClick={() => router.push(`/admin/agencies/${agency.id}`)}
                    >
                      360°
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── SPLIT SECTION: RECENT SIGNUPS & QUICK ACTIONS ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Recent Agency Signups */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Recent Agency Onboardings
                </h3>
                <p className="text-xs text-slate-500">Newly created travel agency workspaces</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 text-xs font-semibold cursor-pointer"
                onClick={() => router.push("/admin/agencies")}
              >
                View Directory ({stats?.totalAgencies || 0}) <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>

            <div className="divide-y divide-slate-100">
              {stats?.recentSignups?.map((agency) => (
                <div
                  key={agency.id}
                  onClick={() => router.push(`/admin/agencies/${agency.id}`)}
                  className="py-3 px-2 flex items-center justify-between hover:bg-slate-50/80 rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-black text-sm shrink-0">
                      {agency.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 truncate group-hover:text-purple-700 transition-colors">
                          {agency.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            agency.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : agency.status === "SUSPENDED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {agency.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        Owner: {agency.ownerName} ({agency.ownerEmail})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-semibold text-slate-800">{agency.planName}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(agency.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-purple-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Col: Admin Shortcuts & Platform Governance */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                SaaS Control Plane
              </h3>

              <div className="space-y-2">
                <Link
                  href="/admin/agencies"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Agency Directory</p>
                      <p className="text-[11px] text-slate-500">Search, filter & manage tenants</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-purple-600" />
                </Link>

                <Link
                  href="/admin/subscriptions"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Subscriptions & Trials</p>
                      <p className="text-[11px] text-slate-500">Renewal tracking & trial controls</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-purple-600" />
                </Link>

                <Link
                  href="/admin/plans"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Plans & Pricing</p>
                      <p className="text-[11px] text-slate-500">Tier pricing and duration rules</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-purple-600" />
                </Link>

                <Link
                  href="/admin/analytics"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Platform Analytics</p>
                      <p className="text-[11px] text-slate-500">Tenant growth & product telemetry</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-purple-600" />
                </Link>

                <Link
                  href="/admin/audit-logs"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Audit Logs</p>
                      <p className="text-[11px] text-slate-500">Governance & administrative actions</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-purple-600" />
                </Link>

                <Link
                  href="/admin/announcements"
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Announcements</p>
                      <p className="text-[11px] text-slate-500">Platform broadcasts & maintenance</p>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-purple-600" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── EXTEND TRIAL MODAL ─────────────────────────────────────────── */}
      {extendModalAgency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-base font-bold text-slate-900">Extend Free Trial Period</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Extend trial access for <span className="font-semibold text-purple-700">{extendModalAgency.name}</span>
              </p>
            </div>

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
                <label className="text-xs font-bold text-slate-700">Administrative Reason</label>
                <Input
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  placeholder="e.g. Requested additional onboarding evaluation time"
                  className="text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExtendModalAgency(null)}
                  disabled={extending}
                  className="text-xs"
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
    </div>
  );
}
