"use client";

import * as React from "react";
import Link from "next/link";
import {
  Inbox,
  FileText,
  Compass,
  IndianRupee,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  ShieldCheck,
  CreditCard,
  Building,
} from "lucide-react";
import { DashboardExecutiveSummary } from "@/lib/services/dashboard-service";
import { Badge } from "@/components/ui/badge";

interface KpiCardsProps {
  summary?: DashboardExecutiveSummary | null;
  loading?: boolean;
}

export function KpiCards({ summary, loading = false }: KpiCardsProps) {
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-36 rounded-2xl border border-slate-100 bg-white p-5 animate-pulse shadow-2xs"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-8 w-8 bg-slate-100 rounded-xl" />
            </div>
            <div className="h-8 w-28 bg-slate-200 rounded-lg mt-4" />
            <div className="h-3 w-36 bg-slate-100 rounded mt-2" />
          </div>
        ))}
      </div>
    );
  }

  const fin = summary?.financial;
  const sales = summary?.sales;
  const ops = summary?.operations;
  const crm = summary?.crm;

  return (
    <div className="space-y-4">
      {/* 4 Primary Executive KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Total Booking Value & Revenue */}
        <Link
          href="/bookings"
          className="group relative flex flex-col justify-between p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all duration-200"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Booking Value
              </span>
              <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <IndianRupee className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
              {formatRupees(fin?.totalBookingValue)}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-50 mt-3">
            <span>Collected: <strong className="text-emerald-700 font-bold">{formatRupees(fin?.amountCollected)}</strong></span>
            <span className="text-indigo-600 font-semibold flex items-center group-hover:translate-x-0.5 transition-transform">
              Bookings <ArrowUpRight className="h-3 w-3 ml-0.5" />
            </span>
          </div>
        </Link>

        {/* 2. Outstanding Receivables & Balance */}
        <Link
          href="/payments"
          className="group relative flex flex-col justify-between p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-rose-300 transition-all duration-200"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Customer Receivables
              </span>
              <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-700 tracking-tight mt-2">
              {formatRupees(fin?.outstandingReceivables)}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-50 mt-3">
            <span>Payables: <strong className="text-slate-700 font-bold">{formatRupees(fin?.supplierOutstanding)}</strong></span>
            <span className="text-rose-600 font-semibold flex items-center group-hover:translate-x-0.5 transition-transform">
              Ledger <ArrowUpRight className="h-3 w-3 ml-0.5" />
            </span>
          </div>
        </Link>

        {/* 3. Estimated Profit & Margin */}
        <div className="flex flex-col justify-between p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Gross Profit & Margin
              </span>
              <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-emerald-700 tracking-tight">
                {formatRupees(fin?.grossProfit)}
              </span>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                {fin?.grossMarginPercent ?? 0}% Margin
              </Badge>
            </div>
          </div>
          <div className="text-xs text-slate-500 pt-3 border-t border-slate-50 mt-3">
            <span>Cost: <strong className="text-slate-700 font-bold">{formatRupees(fin?.supplierPayable)}</strong></span>
          </div>
        </div>

        {/* 4. Sales Conversion & Funnel Won */}
        <Link
          href="/enquiries"
          className="group relative flex flex-col justify-between p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-purple-300 transition-all duration-200"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Booking Conversion
              </span>
              <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black text-purple-900 tracking-tight">
                {sales?.bookingConversionRate ?? 0}%
              </span>
              <span className="text-xs font-bold text-slate-500">
                ({sales?.confirmedBookings ?? 0} Won)
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-50 mt-3">
            <span>Enquiries: <strong className="text-slate-700 font-bold">{sales?.newEnquiries ?? 0} new</strong></span>
            <span className="text-purple-600 font-semibold flex items-center group-hover:translate-x-0.5 transition-transform">
              CRM <ArrowUpRight className="h-3 w-3 ml-0.5" />
            </span>
          </div>
        </Link>
      </div>

      {/* Secondary Operations & CRM Fast Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-700">Upcoming Trips</span>
          </div>
          <Badge variant="outline" className="bg-white text-indigo-700 font-bold text-xs">
            {ops?.upcomingTripsCount ?? 0}
          </Badge>
        </div>

        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">Ready Trips</span>
          </div>
          <Badge variant="outline" className="bg-white text-emerald-700 font-bold text-xs">
            {ops?.operationallyReadyTripsCount ?? 0}
          </Badge>
        </div>

        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-bold text-slate-700">Due Follow-ups</span>
          </div>
          <Badge variant="outline" className="bg-white text-amber-700 font-bold text-xs">
            {crm?.followUpsDueTodayCount ?? 0}
          </Badge>
        </div>

        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span className="text-xs font-bold text-slate-700">Overdue Leads</span>
          </div>
          <Badge variant="outline" className="bg-white text-rose-700 font-bold text-xs">
            {crm?.overdueFollowUpsCount ?? 0}
          </Badge>
        </div>
      </div>
    </div>
  );
}
