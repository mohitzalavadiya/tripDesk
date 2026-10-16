"use client";

import { PageHeader } from "@/components/shared/page-header";
import { adminClient } from "@/lib/api-client/admin-client";
import { PlatformUsageAnalytics } from "@/lib/services/admin-service";
import {
Activity,
CalendarCheck,
Compass,
FileText,
Layers,
RefreshCw,
TrendingUp,
Users
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

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
      <div className="max-w-[1600px] mx-auto px-2.5 sm:px-6 lg:px-8 pt-4 sm:pt-8 space-y-4 sm:space-y-6 min-w-0">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
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
              <div key={item.label} className="bg-white border border-slate-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 shadow-2xs space-y-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">{item.label}</span>
                  <Icon className={`h-3.5 sm:h-4 w-3.5 sm:w-4 shrink-0 ${item.color}`} />
                </div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                  {loading ? "-" : item.val.toLocaleString()}
                </p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 truncate">Across all tenants</p>
              </div>
            );
          })}
        </div>

        {/* ─── MONTHLY AGENCY GROWTH TABLE ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-6 shadow-2xs space-y-3 sm:space-y-4">
          <div className="flex items-start sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                Monthly Tenant Onboarding Growth
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">New agency registrations and active cohort trend (Last 6 Months)</p>
            </div>
            <TrendingUp className="h-4 sm:h-5 w-4 sm:w-5 text-purple-600 shrink-0 mt-0.5 sm:mt-0" />
          </div>

          <div className="divide-y divide-slate-100">
            {analytics?.growth.map((g) => (
              <div key={g.month} className="py-2.5 sm:py-3 flex items-center justify-between text-xs gap-2 min-w-0">
                <span className="font-bold text-slate-800 text-xs sm:text-sm shrink-0 whitespace-nowrap">{g.month}</span>
                <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                  <div className="text-right min-w-0">
                    <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-semibold truncate">Signups</span>
                    <span className="font-bold text-purple-700 text-xs sm:text-xs whitespace-nowrap">
                      +{g.newAgencies} <span className="hidden min-[360px]:inline text-[11px] text-purple-600/90 font-medium">agencies</span>
                    </span>
                  </div>
                  <div className="text-right min-w-0">
                    <span className="text-slate-400 block text-[9px] sm:text-[10px] uppercase font-semibold truncate">Active</span>
                    <span className="font-black text-slate-900 text-xs sm:text-xs whitespace-nowrap">
                      {g.activeAgencies} <span className="hidden min-[360px]:inline text-[11px] text-slate-500 font-medium">total</span>
                    </span>
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
