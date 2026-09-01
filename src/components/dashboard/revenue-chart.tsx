"use client";

import * as React from "react";
import { TrendingUp, FileDown, Calendar, IndianRupee, Layers } from "lucide-react";
import { RevenueAndProfitAnalytics, RevenueTimeSeriesPoint } from "@/lib/services/dashboard-service";
import { dashboardClient } from "@/lib/api-client/dashboard-client";
import { Badge } from "@/components/ui/badge";

interface RevenueChartProps {
  analytics?: RevenueAndProfitAnalytics | null;
  loading?: boolean;
}

export function RevenueChart({ analytics, loading = false }: RevenueChartProps) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  const timeSeries = analytics?.timeSeries || [];
  const rawMax = Math.max(
    ...timeSeries.map((d) => Math.max(d.collectedAmount, d.bookingValue, d.grossProfit)),
    100000
  );
  const maxAmount = Math.ceil(rawMax / 100000) * 100000;

  const yAxisTicks = [
    maxAmount,
    Math.round(maxAmount * 0.75),
    Math.round(maxAmount * 0.5),
    Math.round(maxAmount * 0.25),
    0,
  ];

  const formatRupees = (val: number) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)}Cr`;
    }
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)}L`;
    }
    return `₹${val.toLocaleString("en-IN")}`;
  };

  const summary = analytics?.summary;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 animate-pulse shadow-2xs h-full flex flex-col justify-between">
        <div className="h-4 w-36 bg-slate-200 rounded mb-4" />
        <div className="h-48 bg-slate-100 rounded-xl w-full" />
        <div className="h-4 w-48 bg-slate-200 rounded mt-4" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xs flex flex-col h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span>Revenue, Collections & Gross Profit</span>
          </h3>
          <p className="text-xs text-slate-500">
            Financial volume, actual payment collections, and gross margin trends.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-indigo-700">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 inline-block" />
              <span>Bookings</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-emerald-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Collected</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-purple-700">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500 inline-block" />
              <span>Profit</span>
            </div>
          </div>

          <a
            href={dashboardClient.getExportUrl()}
            download
            className="flex items-center justify-center h-8 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer gap-1"
            title="Download CSV"
          >
            <FileDown className="h-3.5 w-3.5" /> Export
          </a>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="flex-1 flex flex-col justify-end pt-4">
        {timeSeries.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">
            No transaction records found for this period.
          </div>
        ) : (
          <div className="relative w-full h-[200px] flex">
            {/* Y-Axis Label Ticks */}
            <div className="w-14 h-full flex flex-col justify-between text-[10px] text-slate-400 pr-2 text-right select-none font-mono">
              {yAxisTicks.map((tick) => (
                <span key={tick}>{formatRupees(tick)}</span>
              ))}
            </div>

            {/* Bars Area */}
            <div className="flex-1 h-full relative border-l border-b border-slate-100">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none select-none">
                {yAxisTicks.map((tick, i) => (
                  <div
                    key={tick}
                    className={`w-full border-t border-dashed border-slate-100 ${
                      i === yAxisTicks.length - 1 ? "border-t-0" : ""
                    }`}
                    style={{ height: "1px" }}
                  />
                ))}
              </div>

              {/* Bar Columns */}
              <div className="absolute inset-0 flex items-end justify-around px-1 pt-4">
                {timeSeries.map((point, idx) => {
                  const bHeight = maxAmount > 0 ? (point.bookingValue / maxAmount) * 100 : 0;
                  const cHeight = maxAmount > 0 ? (point.collectedAmount / maxAmount) * 100 : 0;
                  const pHeight = maxAmount > 0 ? (point.grossProfit / maxAmount) * 100 : 0;

                  return (
                    <div
                      key={point.label}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="relative flex flex-col items-center h-full justify-end group px-1 flex-1 max-w-[50px] cursor-pointer"
                    >
                      {/* Tooltip Hover Overlay */}
                      {hoveredIdx === idx && (
                        <div className="absolute -top-20 z-20 bg-slate-900 text-white rounded-xl py-2 px-3 text-[11px] shadow-xl whitespace-nowrap pointer-events-none border border-slate-800 space-y-0.5 animate-in fade-in zoom-in-95">
                          <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-200">
                            {point.label} ({point.bookingsCount} bookings)
                          </div>
                          <div className="text-indigo-300">Bookings: {formatRupees(point.bookingValue)}</div>
                          <div className="text-emerald-300">Collected: {formatRupees(point.collectedAmount)}</div>
                          <div className="text-purple-300">Profit: {formatRupees(point.grossProfit)} ({point.grossMarginPercent}%)</div>
                        </div>
                      )}

                      {/* Bar Group */}
                      <div className="flex items-end gap-1 w-full justify-center">
                        <div
                          className="w-2.5 bg-indigo-500 rounded-t-sm transition-all duration-300 group-hover:bg-indigo-600"
                          style={{ height: `${Math.max(4, bHeight)}%` }}
                        />
                        <div
                          className="w-2.5 bg-emerald-500 rounded-t-sm transition-all duration-300 group-hover:bg-emerald-600"
                          style={{ height: `${Math.max(4, cHeight)}%` }}
                        />
                        <div
                          className="w-2.5 bg-purple-500 rounded-t-sm transition-all duration-300 group-hover:bg-purple-600"
                          style={{ height: `${Math.max(4, pHeight)}%` }}
                        />
                      </div>

                      {/* X-Axis Label */}
                      <span className="text-[10px] text-slate-500 font-semibold mt-2 truncate w-full text-center">
                        {point.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
