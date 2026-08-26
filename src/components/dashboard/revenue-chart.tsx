"use client";

import * as React from "react";
import { TrendingUp, FileDown, Calendar } from "lucide-react";
import { MonthlyRevenueMetric } from "@/lib/services/dashboard-service";

interface RevenueChartProps {
  revenueTrend?: MonthlyRevenueMetric[];
  loading?: boolean;
}

export function RevenueChart({ revenueTrend = [], loading = false }: RevenueChartProps) {
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);

  const rawMax = Math.max(...revenueTrend.map((d) => Math.max(d.collected, d.bookingValue)), 100000);
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

  const totalCollected6Months = revenueTrend.reduce((acc, curr) => acc + curr.collected, 0);
  const averageMonthly = revenueTrend.length > 0 ? totalCollected6Months / revenueTrend.length : 0;

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 animate-pulse shadow-2xs h-full flex flex-col justify-between">
        <div className="h-4 w-36 bg-slate-200 rounded mb-4" />
        <div className="h-44 bg-slate-100 rounded-lg w-full" />
        <div className="h-4 w-48 bg-slate-200 rounded mt-4" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-xs flex flex-col h-full animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Revenue Overview
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Monthly collections and booking volume
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-md px-2 py-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>Last 6 Months</span>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
            title="Export Report"
          >
            <FileDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end mt-4">
        <div className="relative w-full h-[180px] flex">
          {/* Y-Axis Label Ticks */}
          <div className="w-14 h-full flex flex-col justify-between text-[10px] text-slate-400 pr-2 text-right select-none">
            {yAxisTicks.map((tick) => (
              <span key={tick}>{formatRupees(tick)}</span>
            ))}
          </div>

          {/* SVG Canvas Area */}
          <div className="flex-1 h-full relative border-l border-b border-slate-100">
            {/* Grid Line Marks */}
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

            {/* Bars and Values */}
            <div className="absolute inset-0 flex items-end justify-around px-2 pt-4">
              {revenueTrend.map((item, idx) => {
                const heightPercent = maxAmount > 0 ? (item.collected / maxAmount) * 100 : 0;
                const isHovered = hoveredIdx === idx;

                return (
                  <div
                    key={item.month}
                    className="flex flex-col items-center flex-1 max-w-[48px] h-full justify-end relative group cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Tooltip dialog overlay */}
                    {isHovered && (
                      <div className="absolute bottom-[calc(heightPercent+8px)] left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1.5 px-2.5 rounded-md shadow-lg pointer-events-none z-10 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                        <div className="font-semibold text-slate-100">{item.month}</div>
                        <div className="text-emerald-400 font-bold">Collected: {formatRupees(item.collected)}</div>
                        <div className="text-slate-300">Bookings: {item.bookingsCount} ({formatRupees(item.bookingValue)})</div>
                      </div>
                    )}

                    {/* Main Bar */}
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isHovered
                          ? "bg-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.3)]"
                          : item.collected > 0
                          ? "bg-indigo-600/85 hover:bg-indigo-600"
                          : "bg-slate-200/80 min-h-[4px]"
                      }`}
                      style={{ height: `${Math.max(heightPercent, 2)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* X-Axis labels */}
        <div className="flex pl-14 pt-2 justify-around text-[10px] text-slate-400 font-medium select-none">
          {revenueTrend.map((item, idx) => (
            <span
              key={item.month}
              className={`flex-1 text-center max-w-[48px] transition-colors ${
                hoveredIdx === idx ? "text-indigo-600 font-semibold" : ""
              }`}
            >
              {item.month.substring(0, 3)}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-sm">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Real-time Ledger Data</span>
        </div>
        <span className="text-slate-500 font-medium">Average Monthly: {formatRupees(averageMonthly)}</span>
      </div>
    </div>
  );
}
