"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  TrendingUp,
  Users,
  Compass,
  FileText,
  CalendarCheck,
  Building2,
  RefreshCw,
  Activity,
  Layers,
} from "lucide-react";
import { adminClient } from "@/lib/api-client/admin-client";
import { PlatformUsageAnalytics } from "@/lib/services/admin-service";

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = React.useState<PlatformUsageAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchAnalytics = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminClient.getAnalytics();
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Platform Usage & Growth Analytics"
          description="SaaS product adoption, aggregate tenant operational metrics, and month-over-month agency growth curves."
          breadcrumbs={[{ label: "SaaS Platform", href: "/admin" }, { label: "Analytics" }]}
          primaryAction={{
            label: "Refresh Analytics",
            onClick: fetchAnalytics,
            icon: RefreshCw,
          }}
        />

        {/* ─── 6 PRODUCT ADOPTION TILES ───────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[
            {
              label: "Customers Registered",
              val: analytics?.productAdoption.totalCustomers || 0,
              icon: Users,
              color: "text-blue-600",
            },
            {
              label: "Enquiries Created",
              val: analytics?.productAdoption.totalEnquiries || 0,
              icon: Compass,
              color: "text-purple-600",
            },
            {
              label: "Quotations Issued",
              val: analytics?.productAdoption.totalQuotations || 0,
              icon: FileText,
              color: "text-indigo-600",
            },
            {
              label: "Bookings Confirmed",
              val: analytics?.productAdoption.totalBookings || 0,
              icon: CalendarCheck,
              color: "text-emerald-600",
            },
            {
              label: "Documents Dispatched",
              val: analytics?.productAdoption.totalDocuments || 0,
              icon: Layers,
              color: "text-amber-600",
            },
            {
              label: "Communications Sent",
              val: analytics?.productAdoption.totalCommunications || 0,
              icon: Activity,
              color: "text-rose-600",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
                  <Icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {loading ? "-" : item.val.toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400">Aggregated across all tenants</p>
              </div>
            );
          })}
        </div>

        {/* ─── MONTHLY AGENCY GROWTH TABLE ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Monthly Tenant Onboarding Growth (Last 6 Months)
              </h3>
              <p className="text-xs text-slate-500">New agency registrations and active cohort trend</p>
            </div>
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </div>

          <div className="divide-y divide-slate-100">
            {analytics?.growth.map((g) => (
              <div key={g.month} className="py-3 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 text-sm">{g.month}</span>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">New Signups</span>
                    <span className="font-bold text-purple-700">+{g.newAgencies} agencies</span>
                  </div>
                  <div className="text-right min-w-[100px]">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cumulative Active</span>
                    <span className="font-black text-slate-900">{g.activeAgencies} total</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
