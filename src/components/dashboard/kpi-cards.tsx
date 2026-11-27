"use client";

import { DashboardExecutiveSummary } from "@/lib/services/dashboard-service";
import {
  ArrowUpRight,
  Clock,
  CreditCard,
  IndianRupee,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface KpiCardsProps {
  summary?: DashboardExecutiveSummary | null;
  overdueCount?: number;
  dueTodayCount?: number;
  loading?: boolean;
}

export function KpiCards({
  summary,
  overdueCount,
  dueTodayCount,
  loading = false,
}: KpiCardsProps) {
  const formatRupees = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return "₹0";
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
      <div className="grid gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl border border-slate-200/80 bg-white p-3.5 animate-pulse shadow-2xs space-y-2"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-6 w-6 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-6 w-20 bg-slate-200 rounded-md" />
            <div className="h-2.5 w-24 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const fin = summary?.financial;
  const sales = summary?.sales;
  const crm = summary?.crm;

  const actualOverdue = overdueCount ?? crm?.overdueFollowUpsCount ?? 0;
  const actualDueToday = dueTodayCount ?? crm?.followUpsDueTodayCount ?? 0;
  const totalUrgent = actualOverdue + actualDueToday;

  return (
    <div className="grid gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {/* 1. Total Booking Value */}
      <Link
        href="/bookings"
        className="group relative flex flex-col justify-between p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-indigo-400 hover:-translate-y-0.5 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 overflow-hidden"
      >
        <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-t opacity-0 group-hover:opacity-100 transition-opacity" />
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Total Bookings
            </span>
            <div className="h-6 w-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 tracking-tight mt-1.5 tabular-nums whitespace-nowrap truncate font-mono">
            {formatRupees(fin?.totalBookingValue)}
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 mt-1.5">
          <span className="truncate">
            Col: <strong className="text-emerald-700 font-bold tabular-nums font-mono">{formatRupees(fin?.amountCollected)}</strong>
          </span>
          <ArrowUpRight className="h-3 w-3 text-indigo-500 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
        </div>
      </Link>

      {/* 2. Active Pipeline Value */}
      <Link
        href="/enquiries"
        className="group relative flex flex-col justify-between p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-teal-400 hover:-translate-y-0.5 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 overflow-hidden"
      >
        <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-teal-500 to-teal-600 rounded-t opacity-0 group-hover:opacity-100 transition-opacity" />
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Active Pipeline
            </span>
            <div className="h-6 w-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-teal-900 tracking-tight mt-1.5 tabular-nums whitespace-nowrap truncate font-mono">
            {formatRupees(sales?.pipelineValue)}
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 mt-1.5">
          <span className="truncate font-semibold text-slate-600">
            {sales?.activeLeads ?? 0} active leads
          </span>
          <ArrowUpRight className="h-3 w-3 text-teal-600 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
        </div>
      </Link>

      {/* 3. Quotation Conversion Rate */}
      <Link
        href="/quotations"
        className="group relative flex flex-col justify-between p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-emerald-400 hover:-translate-y-0.5 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 overflow-hidden"
      >
        <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-t opacity-0 group-hover:opacity-100 transition-opacity" />
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Enquiry Conversion
            </span>
            <div className="h-6 w-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-700 tracking-tight mt-1.5 tabular-nums whitespace-nowrap truncate font-mono">
            {sales?.enquiryConversionRate ?? 0}%
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 mt-1.5">
          <span className="truncate">
            {(sales?.wonEnquiries ?? sales?.confirmedBookings ?? 0)} won • {(sales?.totalEnquiries ?? sales?.newEnquiries ?? 0)} leads
          </span>
          <ArrowUpRight className="h-3 w-3 text-emerald-600 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
        </div>
      </Link>

      {/* 4. Gross Profit & Margin (or Active Operations when margins are redacted for staff) */}
      {fin?.grossProfit !== undefined ? (
        <Link
          href="/trips"
          className="group relative flex flex-col justify-between p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-purple-400 hover:-translate-y-0.5 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 overflow-hidden"
        >
          <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-t opacity-0 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Gross Profit
              </span>
              <div className="h-6 w-6 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-purple-800 tracking-tight mt-1.5 tabular-nums whitespace-nowrap truncate font-mono">
              {formatRupees(fin?.grossProfit)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 mt-1.5">
            <span className="text-purple-700 font-bold tabular-nums font-mono">
              {fin?.grossMarginPercent ?? 0}% margin
            </span>
            <ArrowUpRight className="h-3 w-3 text-purple-600 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
          </div>
        </Link>
      ) : (
        <Link
          href="/trips"
          className="group relative flex flex-col justify-between p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-purple-400 hover:-translate-y-0.5 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 overflow-hidden"
        >
          <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-t opacity-0 group-hover:opacity-100 transition-opacity" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                Active Trips
              </span>
              <div className="h-6 w-6 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="text-base sm:text-lg font-black text-purple-800 tracking-tight mt-1.5 tabular-nums whitespace-nowrap truncate font-mono">
              {summary?.operations?.ongoingTripsCount ?? 0} Ongoing
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 mt-1.5">
            <span className="text-purple-700 font-bold tabular-nums font-mono">
              {summary?.operations?.upcomingTripsCount ?? 0} upcoming
            </span>
            <ArrowUpRight className="h-3 w-3 text-purple-600 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
          </div>
        </Link>
      )}

      {/* 5. Outstanding Receivables */}
      <Link
        href="/payments"
        className="group relative flex flex-col justify-between p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-rose-400 hover:-translate-y-0.5 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 overflow-hidden"
      >
        <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-rose-500 to-rose-600 rounded-t opacity-0 group-hover:opacity-100 transition-opacity" />
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Receivables
            </span>
            <div className="h-6 w-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-rose-700 tracking-tight mt-1.5 tabular-nums whitespace-nowrap truncate font-mono">
            {formatRupees(fin?.outstandingReceivables)}
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 mt-1.5">
          <span className="truncate">
            {fin?.supplierOutstanding !== undefined ? (
              <>Pay: <strong className="text-slate-700 font-bold tabular-nums font-mono">{formatRupees(fin.supplierOutstanding)}</strong></>
            ) : (
              <strong className="text-slate-600 font-semibold">Active Ledger</strong>
            )}
          </span>
          <ArrowUpRight className="h-3 w-3 text-rose-600 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
        </div>
      </Link>

      {/* 6. Action Radar / Urgent Callbacks */}
      <Link
        href="/follow-ups"
        className="group relative flex flex-col justify-between p-3 sm:p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-amber-400 hover:-translate-y-0.5 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 overflow-hidden"
      >
        <div className="absolute top-0 left-4 right-4 h-0.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-t opacity-0 group-hover:opacity-100 transition-opacity" />
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
              Follow-Up Radar
            </span>
            <div
              className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
                actualOverdue > 0
                  ? "bg-rose-50 text-rose-600"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div
            className={`text-base sm:text-lg font-black tracking-tight mt-1.5 tabular-nums whitespace-nowrap truncate font-mono ${
              actualOverdue > 0 ? "text-rose-700" : "text-amber-800"
            }`}
          >
            {actualOverdue > 0 ? `${actualOverdue} Overdue` : `${actualDueToday} Today`}
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100 mt-1.5">
          <span className="truncate">
            {actualDueToday} today • {crm?.leadsWithoutNextActionCount ?? 0} new
          </span>
          <ArrowUpRight className="h-3 w-3 text-amber-600 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
        </div>
      </Link>
    </div>
  );
}
