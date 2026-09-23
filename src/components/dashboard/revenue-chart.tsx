"use client";

import * as React from "react";
import { TrendingUp, FileDown, Calendar } from "lucide-react";
import { RevenueAndProfitAnalytics } from "@/lib/services/dashboard-service";
import { dashboardClient } from "@/lib/api-client/dashboard-client";

interface RevenueChartProps {
  analytics?: RevenueAndProfitAnalytics | null;
  loading?: boolean;
}

export function RevenueChart({ analytics, loading = false }: RevenueChartProps) {
  const timeSeries = analytics?.timeSeries || [];
  const summary = analytics?.summary;

  const formatRupees = (val: number) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)}Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)}L`;
    }
    if (val >= 1000) {
      return `₹${(val / 1000).toFixed(1)}k`;
    }
    return `₹${val.toLocaleString("en-IN")}`;
  };

  const formatFullRupees = (val: number) => {
    return `₹${val.toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 animate-pulse shadow-2xs space-y-4 min-w-0">
        <div className="h-5 w-44 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-40 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-2xs flex flex-col space-y-5 min-w-0 overflow-hidden">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="truncate whitespace-nowrap">Revenue & Profit</span>
          </h3>
          <p className="text-xs text-slate-500 truncate">
            Financial performance, payment collections, and gross margin breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <a
            href={dashboardClient.getExportUrl()}
            download
            className="flex items-center justify-center h-8 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer gap-1.5 shadow-2xs whitespace-nowrap"
            title="Download CSV"
          >
            <FileDown className="h-3.5 w-3.5" /> Export Report
          </a>
        </div>
      </div>

      {/* 2. Top Summary KPI Grid (2x2 on mobile, 4 columns on desktop) */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Revenue */}
          <div className="p-3 sm:p-4 rounded-xl bg-indigo-50/50 border border-indigo-100/80 min-w-0">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-indigo-700 block truncate tracking-wider">
              Total Revenue
            </span>
            <strong className="text-sm sm:text-lg lg:text-xl font-mono font-black text-indigo-950 block mt-1 tabular-nums whitespace-nowrap truncate">
              {formatRupees(summary.totalRevenue)}
            </strong>
          </div>

          {/* Collected */}
          <div className="p-3 sm:p-4 rounded-xl bg-emerald-50/50 border border-emerald-100/80 min-w-0">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-emerald-700 block truncate tracking-wider">
              Total Collected
            </span>
            <strong className="text-sm sm:text-lg lg:text-xl font-mono font-black text-emerald-950 block mt-1 tabular-nums whitespace-nowrap truncate">
              {formatRupees(summary.totalCollected)}
            </strong>
          </div>

          {/* Gross Profit */}
          <div className="p-3 sm:p-4 rounded-xl bg-purple-50/50 border border-purple-100/80 min-w-0">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-purple-700 block truncate tracking-wider">
              Gross Profit
            </span>
            <strong className="text-sm sm:text-lg lg:text-xl font-mono font-black text-purple-950 block mt-1 tabular-nums whitespace-nowrap truncate">
              {formatRupees(summary.totalGrossProfit)}
            </strong>
          </div>

          {/* Gross Margin % */}
          <div className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/80 min-w-0">
            <span className="text-[10px] sm:text-[11px] uppercase font-bold text-slate-600 block truncate tracking-wider">
              Gross Margin
            </span>
            <strong className="text-sm sm:text-lg lg:text-xl font-mono font-black text-slate-900 block mt-1 tabular-nums whitespace-nowrap truncate">
              {summary.overallMarginPercent}%
            </strong>
          </div>
        </div>
      )}

      {/* 3. Period Performance Section with Bounded Internal Scroll */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Performance by Period</span>
          </h4>
          <span className="text-[11px] text-slate-500 font-semibold">
            {timeSeries.length} {timeSeries.length === 1 ? "period" : "periods"}
          </span>
        </div>

        {timeSeries.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            No transaction records found for the selected time period.
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View (>= 640px) with Sticky Header & Bounded Scroll */}
            <div className="hidden sm:block rounded-xl border border-slate-200/80 overflow-hidden">
              <div className="max-h-[340px] overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 font-bold border-b border-slate-200/80 shadow-2xs">
                    <tr>
                      <th className="py-2.5 px-3.5 bg-slate-50">Period</th>
                      <th className="py-2.5 px-3.5 text-center bg-slate-50">Bookings</th>
                      <th className="py-2.5 px-3.5 text-right text-indigo-700 bg-slate-50">Revenue</th>
                      <th className="py-2.5 px-3.5 text-right text-emerald-700 bg-slate-50">Collected</th>
                      <th className="py-2.5 px-3.5 text-right text-purple-700 bg-slate-50">Gross Profit</th>
                      <th className="py-2.5 px-3.5 text-right bg-slate-50">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {timeSeries.map((point) => (
                      <tr key={point.label} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-3.5 font-sans font-bold text-slate-800">
                          {point.label}
                        </td>
                        <td className="py-2.5 px-3.5 text-center text-slate-700 tabular-nums">
                          {point.bookingsCount}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-indigo-900 tabular-nums whitespace-nowrap">
                          {formatFullRupees(point.bookingValue)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-emerald-900 tabular-nums whitespace-nowrap">
                          {formatFullRupees(point.collectedAmount)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-purple-900 tabular-nums whitespace-nowrap">
                          {formatFullRupees(point.grossProfit)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap">
                          {point.grossMarginPercent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {summary && (
                    <tfoot className="sticky bottom-0 z-10 bg-slate-50 font-bold border-t border-slate-200 text-xs shadow-xs">
                      <tr>
                        <td className="py-2.5 px-3.5 font-sans text-slate-900 uppercase tracking-wider text-[11px] bg-slate-50">
                          Total
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono text-slate-900 bg-slate-50">
                          {timeSeries.reduce((acc, p) => acc + p.bookingsCount, 0)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-indigo-950 tabular-nums whitespace-nowrap bg-slate-50">
                          {formatFullRupees(summary.totalRevenue)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-emerald-950 tabular-nums whitespace-nowrap bg-slate-50">
                          {formatFullRupees(summary.totalCollected)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-purple-950 tabular-nums whitespace-nowrap bg-slate-50">
                          {formatFullRupees(summary.totalGrossProfit)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-slate-900 tabular-nums whitespace-nowrap bg-slate-50">
                          {summary.overallMarginPercent}%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Mobile Stacked List (< 640px / down to 320px) with Bounded Scroll */}
            <div className="sm:hidden max-h-[320px] overflow-y-auto space-y-2.5 pr-1">
              {timeSeries.map((point) => (
                <div
                  key={point.label}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                    <strong className="text-xs font-bold text-slate-900">{point.label}</strong>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs font-mono tabular-nums">
                      {point.bookingsCount} bookings
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-indigo-700 block truncate">
                        Revenue
                      </span>
                      <span className="font-bold text-indigo-950 tabular-nums whitespace-nowrap">
                        {formatRupees(point.bookingValue)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 block truncate">
                        Collected
                      </span>
                      <span className="font-bold text-emerald-950 tabular-nums whitespace-nowrap">
                        {formatRupees(point.collectedAmount)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-purple-700 block truncate">
                        Gross Profit
                      </span>
                      <span className="font-bold text-purple-950 tabular-nums whitespace-nowrap">
                        {formatRupees(point.grossProfit)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-600 block truncate">
                        Margin
                      </span>
                      <span className="font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {point.grossMarginPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
