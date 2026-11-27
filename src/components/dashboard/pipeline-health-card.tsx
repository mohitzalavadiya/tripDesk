"use client";

import { DashboardExecutiveSummary, SalesFunnelAnalytics } from "@/lib/services/dashboard-service";
import {
  Activity,
  ArrowUpRight,
  Clock,
  FileCheck,
  IndianRupee,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

interface PipelineHealthCardProps {
  summary?: DashboardExecutiveSummary | null;
  funnel?: SalesFunnelAnalytics | null;
  loading?: boolean;
}

export function PipelineHealthCard({
  summary,
  funnel,
  loading = false,
}: PipelineHealthCardProps) {
  const formatRupees = (val?: number) => {
    if (!val || isNaN(val)) return "₹0";
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)}Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)}L`;
    }
    return `₹${val.toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 gap-2.5">
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
          <div className="h-16 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const sales = summary?.sales;
  const financial = summary?.financial;
  const crm = summary?.crm;
  const confirmedCount = sales?.confirmedBookings ?? 0;
  const avgDealSize =
    confirmedCount > 0 && financial?.totalBookingValue
      ? Math.round(financial.totalBookingValue / confirmedCount)
      : (funnel?.wonBookingsValue && confirmedCount > 0)
      ? Math.round(funnel.wonBookingsValue / confirmedCount)
      : 0;

  const pendingQuotations = Math.max(
    0,
    (sales?.quotationsSent ?? 0) - confirmedCount
  );
  const urgentFollowUps =
    (crm?.overdueFollowUpsCount ?? 0) + (crm?.followUpsDueTodayCount ?? 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Activity className="h-3.5 w-3.5 text-teal-700 shrink-0" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider truncate">
            Pipeline Health &amp; Deal Velocity
          </h4>
        </div>
        <Link
          href="/enquiries"
          className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-0.5 shrink-0 transition-colors"
        >
          <span>Pipeline</span>
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Metric 1: Average Deal Value */}
        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 min-w-0">
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">
            <IndianRupee className="h-2.5 w-2.5 text-slate-400" />
            <span>Avg Deal Size</span>
          </div>
          <strong className="text-sm font-mono font-black text-slate-900 block mt-1 tabular-nums truncate">
            {formatRupees(avgDealSize)}
          </strong>
        </div>

        {/* Metric 2: Pending Quotations */}
        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 min-w-0">
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">
            <FileCheck className="h-2.5 w-2.5 text-indigo-500" />
            <span>Awaiting Review</span>
          </div>
          <strong className="text-sm font-mono font-black text-indigo-950 block mt-1 tabular-nums truncate">
            {pendingQuotations} {pendingQuotations === 1 ? "quote" : "quotes"}
          </strong>
        </div>

        {/* Metric 3: Leads Without Action */}
        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 min-w-0">
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">
            <Clock className="h-2.5 w-2.5 text-amber-500" />
            <span>Needs Action</span>
          </div>
          <strong className="text-sm font-mono font-black text-slate-900 block mt-1 tabular-nums truncate">
            {crm?.leadsWithoutNextActionCount ?? 0} leads
          </strong>
        </div>

        {/* Metric 4: Urgent Follow-ups */}
        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 min-w-0">
          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">
            <ShieldAlert className="h-2.5 w-2.5 text-rose-500" />
            <span>Urgent Follow-ups</span>
          </div>
          <strong className="text-sm font-mono font-black text-slate-900 block mt-1 tabular-nums truncate">
            {urgentFollowUps} due
          </strong>
        </div>
      </div>
    </div>
  );
}
