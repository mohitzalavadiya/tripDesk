"use client";

import { useAuth } from "@/context/auth-context";
import { dashboardClient } from "@/lib/api-client/dashboard-client";
import { RevenueAndProfitAnalytics } from "@/lib/services/dashboard-service";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileDown,
  LineChart,
  Table as TableIcon,
  TrendingUp,
} from "lucide-react";
import * as React from "react";

interface RevenueChartProps {
  analytics?: RevenueAndProfitAnalytics | null;
  loading?: boolean;
}

export function RevenueChart({ analytics, loading = false }: RevenueChartProps) {
  const { isAgencyOwner } = useAuth();
  const [chartMode, setChartMode] = React.useState<"FINANCIAL" | "VOLUME">("FINANCIAL");
  const [showTable, setShowTable] = React.useState(false);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const timeSeries = analytics?.timeSeries || [];
  const summary = analytics?.summary;
  const hasGrossProfit = summary?.totalGrossProfit !== undefined || timeSeries.some((t) => t.grossProfit !== undefined && t.grossProfit !== null);

  const formatRupees = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return "₹0";
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

  const formatFullRupees = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return "₹0";
    return `₹${val.toLocaleString("en-IN")}`;
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 animate-pulse shadow-2xs space-y-4 min-w-0">
        <div className="flex justify-between items-center">
          <div className="h-5 w-44 bg-slate-200 rounded" />
          <div className="h-8 w-28 bg-slate-100 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  // Calculate SVG scales
  const svgWidth = 800;
  const svgHeight = 220;
  const paddingLeft = 55;
  const paddingRight = 30;
  const paddingTop = 25;
  const paddingBottom = 35;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const maxFinancialVal = Math.max(
    ...timeSeries.map((t) => Math.max(t.bookingValue || 0, t.collectedAmount || 0, t.grossProfit || 0)),
    10000
  );

  const maxVolumeVal = Math.max(
    ...timeSeries.map((t) => t.bookingsCount || 0),
    5
  );

  const pointsCount = timeSeries.length;

  const getX = (index: number) => {
    if (pointsCount <= 1) return paddingLeft + plotWidth / 2;
    return paddingLeft + (index / (pointsCount - 1)) * plotWidth;
  };

  const getYFinancial = (val: number) => {
    return paddingTop + plotHeight - (val / maxFinancialVal) * plotHeight;
  };

  const getYVolume = (val: number) => {
    return paddingTop + plotHeight - (val / maxVolumeVal) * plotHeight;
  };

  // Build SVG paths for financial mode
  const revenuePoints = timeSeries.map((t, idx) => ({
    x: getX(idx),
    y: getYFinancial(t.bookingValue || 0),
  }));

  const collectedPoints = timeSeries.map((t, idx) => ({
    x: getX(idx),
    y: getYFinancial(t.collectedAmount || 0),
  }));

  const profitPoints = hasGrossProfit
    ? timeSeries.map((t, idx) => ({
        x: getX(idx),
        y: getYFinancial(t.grossProfit || 0),
      }))
    : [];

  const buildLinePath = (pts: Array<{ x: number; y: number }>) => {
    if (pts.length === 0) return "";
    return pts.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, "");
  };

  const revenueLinePath = buildLinePath(revenuePoints);
  const revenueAreaPath =
    revenuePoints.length > 0
      ? `${revenueLinePath} L ${revenuePoints[revenuePoints.length - 1].x} ${paddingTop + plotHeight} L ${revenuePoints[0].x} ${paddingTop + plotHeight} Z`
      : "";

  const collectedLinePath = buildLinePath(collectedPoints);
  const profitLinePath = hasGrossProfit ? buildLinePath(profitPoints) : "";

  // Y-axis ticks
  const financialTicks = [
    maxFinancialVal,
    maxFinancialVal * 0.75,
    maxFinancialVal * 0.5,
    maxFinancialVal * 0.25,
    0,
  ];

  const volumeTicks = [
    maxVolumeVal,
    Math.round(maxVolumeVal * 0.75),
    Math.round(maxVolumeVal * 0.5),
    Math.round(maxVolumeVal * 0.25),
    0,
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-2xs flex flex-col space-y-5 min-w-0 overflow-hidden">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight truncate">
              Financial &amp; Revenue Analytics
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            Visual revenue trends, actual payment collections, and gross margin trajectory.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          {/* Mode switch */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setChartMode("FINANCIAL")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartMode === "FINANCIAL"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LineChart className="h-3.5 w-3.5 text-indigo-600" />
              <span>Revenue (₹)</span>
            </button>
            <button
              type="button"
              onClick={() => setChartMode("VOLUME")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartMode === "VOLUME"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-teal-600" />
              <span>Bookings (#)</span>
            </button>
          </div>

          {isAgencyOwner && (
            <a
              href={dashboardClient.getExportUrl()}
              download
              className="flex items-center justify-center h-8 px-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-colors cursor-pointer gap-1 shadow-2xs whitespace-nowrap"
              title="Download CSV"
            >
              <FileDown className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Export</span>
            </a>
          )}
        </div>
      </div>

      {/* 2. Top Summary KPI Strip */}
      {summary && (
        <div className={`grid gap-2.5 sm:gap-3.5 ${hasGrossProfit ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2"}`}>
          {/* Revenue */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                Total Revenue
              </span>
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
            </div>
            <strong className="text-base sm:text-lg font-mono font-black text-slate-900 block mt-1 tabular-nums whitespace-nowrap truncate">
              {formatRupees(summary.totalRevenue)}
            </strong>
          </div>

          {/* Collected */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                Total Collected
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <strong className="text-base sm:text-lg font-mono font-black text-emerald-700 block mt-1 tabular-nums whitespace-nowrap truncate">
              {formatRupees(summary.totalCollected)}
            </strong>
          </div>

          {/* Gross Profit & Margin */}
          {hasGrossProfit && (
            <>
              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                    Gross Profit
                  </span>
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                </div>
                <strong className="text-base sm:text-lg font-mono font-black text-purple-700 block mt-1 tabular-nums whitespace-nowrap truncate">
                  {formatRupees(summary.totalGrossProfit)}
                </strong>
              </div>

              {/* Gross Margin % */}
              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                    Gross Margin
                  </span>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                    Healthy
                  </span>
                </div>
                <strong className="text-base sm:text-lg font-mono font-black text-slate-900 block mt-1 tabular-nums whitespace-nowrap truncate">
                  {summary.overallMarginPercent ?? 0}%
                </strong>
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. VISUAL SVG DATA CHART */}
      <div className="space-y-2 pt-1">
        {/* Legend */}
        <div className="flex items-center justify-between px-1 flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-4 text-slate-600 font-medium">
            {chartMode === "FINANCIAL" ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-indigo-600" />
                  <span>Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  <span>Collected</span>
                </div>
                {hasGrossProfit && (
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
                    <span>Gross Profit</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-teal-600" />
                <span>Confirmed Bookings Volume</span>
              </div>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {timeSeries.length} reporting {timeSeries.length === 1 ? "period" : "periods"}
          </span>
        </div>

        {timeSeries.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
            No booking or financial activity recorded for the selected time filter.
          </div>
        ) : (
          <div className="relative rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/40 p-2 sm:p-4 shadow-2xs overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto select-none overflow-visible"
              style={{ minHeight: "200px" }}
            >
              <defs>
                <linearGradient id="chartRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="chartCollectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="chartBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0D9488" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.45" />
                </linearGradient>
              </defs>

              {/* Horizontal gridlines & Y-axis labels */}
              {(chartMode === "FINANCIAL" ? financialTicks : volumeTicks).map((val, idx) => {
                const y =
                  chartMode === "FINANCIAL"
                    ? getYFinancial(val)
                    : getYVolume(val);

                return (
                  <g key={idx}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeWidth="1"
                      strokeDasharray={idx === 4 ? "0" : "3,3"}
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="10"
                      fill="#94A3B8"
                      fontFamily="monospace"
                    >
                      {chartMode === "FINANCIAL" ? formatRupees(val) : val}
                    </text>
                  </g>
                );
              })}

              {/* FINANCIAL MODE: Area + Curves */}
              {chartMode === "FINANCIAL" && (
                <>
                  {/* Revenue Area Fill */}
                  <path d={revenueAreaPath} fill="url(#chartRevenueGrad)" />

                  {/* Revenue Line */}
                  <path
                    d={revenueLinePath}
                    fill="none"
                    stroke="#4F46E5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Collected Line */}
                  <path
                    d={collectedLinePath}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Profit Line */}
                  {hasGrossProfit && profitLinePath && (
                    <path
                      d={profitLinePath}
                      fill="none"
                      stroke="#A855F7"
                      strokeWidth="1.8"
                      strokeDasharray="4,3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Interactive Points */}
                  {timeSeries.map((t, idx) => {
                    const x = getX(idx);
                    const yRev = getYFinancial(t.bookingValue);
                    const isHovered = hoveredIndex === idx;

                    return (
                      <g
                        key={idx}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        {/* Vertical tracking line when hovered */}
                        {isHovered && (
                          <line
                            x1={x}
                            y1={paddingTop}
                            x2={x}
                            y2={paddingTop + plotHeight}
                            stroke="#94A3B8"
                            strokeWidth="1.5"
                            strokeDasharray="2,2"
                          />
                        )}
                        <circle
                          cx={x}
                          cy={yRev}
                          r={isHovered ? 5.5 : 3.5}
                          fill="#4F46E5"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                          className="transition-all duration-150"
                        />
                      </g>
                    );
                  })}
                </>
              )}

              {/* VOLUME MODE: Rounded Column Bars */}
              {chartMode === "VOLUME" && (
                <>
                  {timeSeries.map((t, idx) => {
                    const x = getX(idx);
                    const y = getYVolume(t.bookingsCount);
                    const barHeight = paddingTop + plotHeight - y;
                    const barWidth = Math.min(plotWidth / (pointsCount * 1.8), 36);
                    const isHovered = hoveredIndex === idx;

                    return (
                      <g
                        key={idx}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        <rect
                          x={x - barWidth / 2}
                          y={y}
                          width={barWidth}
                          height={Math.max(barHeight, 3)}
                          rx="4"
                          fill={isHovered ? "#0F766E" : "url(#chartBarGrad)"}
                          className="transition-colors duration-150"
                        />
                        <text
                          x={x}
                          y={y - 6}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="bold"
                          fill={isHovered ? "#0F766E" : "#64748B"}
                        >
                          {t.bookingsCount}
                        </text>
                      </g>
                    );
                  })}
                </>
              )}

              {/* X-axis labels */}
              {timeSeries.map((t, idx) => {
                const x = getX(idx);
                const isHovered = hoveredIndex === idx;

                return (
                  <text
                    key={idx}
                    x={x}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fontSize={isHovered ? "11" : "10"}
                    fontWeight={isHovered ? "bold" : "500"}
                    fill={isHovered ? "#0F172A" : "#64748B"}
                    className="transition-all duration-150"
                  >
                    {t.label}
                  </text>
                );
              })}
            </svg>

            {/* Hover Tooltip Card Popover */}
            {hoveredIndex !== null && timeSeries[hoveredIndex] && (
              <div
                className="absolute z-20 pointer-events-none bg-slate-900/95 text-white rounded-xl p-2.5 shadow-xl text-xs backdrop-blur-xs border border-slate-700 space-y-1 transition-all duration-75 min-w-[160px]"
                style={{
                  left: `${Math.min(
                    Math.max(
                      ((getX(hoveredIndex) / svgWidth) * 100),
                      10
                    ),
                    75
                  )}%`,
                  top: "20px",
                }}
              >
                <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>{timeSeries[hoveredIndex].label}</span>
                  <span className="text-[10px] text-teal-400 font-mono">
                    {timeSeries[hoveredIndex].bookingsCount} bookings
                  </span>
                </div>
                <div className="space-y-0.5 pt-0.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400 font-sans text-[10px]">Revenue:</span>
                    <span className="font-bold text-indigo-300">
                      {formatFullRupees(timeSeries[hoveredIndex].bookingValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400 font-sans text-[10px]">Collected:</span>
                    <span className="font-bold text-emerald-400">
                      {formatFullRupees(timeSeries[hoveredIndex].collectedAmount)}
                    </span>
                  </div>
                  {hasGrossProfit && timeSeries[hoveredIndex].grossProfit !== undefined && (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400 font-sans text-[10px]">Profit:</span>
                        <span className="font-bold text-purple-300">
                          {formatFullRupees(timeSeries[hoveredIndex].grossProfit)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-0.5">
                        <span className="text-slate-400 font-sans text-[10px]">Margin:</span>
                        <span className="font-bold text-amber-300">
                          {timeSeries[hoveredIndex].grossMarginPercent ?? 0}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Collapsible Detailed Ledger Table */}
      <div className="border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setShowTable(!showTable)}
          className="flex items-center justify-between w-full text-left text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <TableIcon className="h-3.5 w-3.5 text-slate-400" />
            <span>Tabular Financial Breakdown</span>
            <span className="text-[10px] font-normal text-slate-400 font-mono">
              ({timeSeries.length} rows)
            </span>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-teal-700 font-medium">
            <span>{showTable ? "Hide Table" : "Show Table"}</span>
            {showTable ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </span>
        </button>

        {showTable && timeSeries.length > 0 && (
          <div className="mt-3 rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs">
            <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 font-bold border-b border-slate-200/80">
                  <tr>
                    <th className="py-2.5 px-3.5 bg-slate-50">Period</th>
                    <th className="py-2.5 px-3.5 text-center bg-slate-50">Bookings</th>
                    <th className="py-2.5 px-3.5 text-right text-indigo-700 bg-slate-50">Revenue</th>
                    <th className="py-2.5 px-3.5 text-right text-emerald-700 bg-slate-50">Collected</th>
                    {hasGrossProfit && (
                      <>
                        <th className="py-2.5 px-3.5 text-right text-purple-700 bg-slate-50">Gross Profit</th>
                        <th className="py-2.5 px-3.5 text-right bg-slate-50">Margin</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {timeSeries.map((point) => (
                    <tr key={point.label} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2 px-3.5 font-sans font-bold text-slate-800">
                        {point.label}
                      </td>
                      <td className="py-2 px-3.5 text-center text-slate-700 tabular-nums">
                        {point.bookingsCount}
                      </td>
                      <td className="py-2 px-3.5 text-right font-bold text-indigo-900 tabular-nums whitespace-nowrap">
                        {formatFullRupees(point.bookingValue)}
                      </td>
                      <td className="py-2 px-3.5 text-right font-bold text-emerald-900 tabular-nums whitespace-nowrap">
                        {formatFullRupees(point.collectedAmount)}
                      </td>
                      {hasGrossProfit && (
                        <>
                          <td className="py-2 px-3.5 text-right font-bold text-purple-900 tabular-nums whitespace-nowrap">
                            {formatFullRupees(point.grossProfit)}
                          </td>
                          <td className="py-2 px-3.5 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap">
                            {point.grossMarginPercent ?? 0}%
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                {summary && (
                  <tfoot className="sticky bottom-0 z-10 bg-slate-50 font-bold border-t border-slate-200 text-xs">
                    <tr>
                      <td className="py-2 px-3.5 font-sans text-slate-900 uppercase tracking-wider text-[11px] bg-slate-50">
                        Total
                      </td>
                      <td className="py-2 px-3.5 text-center font-mono text-slate-900 bg-slate-50">
                        {timeSeries.reduce((acc, p) => acc + p.bookingsCount, 0)}
                      </td>
                      <td className="py-2 px-3.5 text-right font-mono text-indigo-950 tabular-nums whitespace-nowrap bg-slate-50">
                        {formatFullRupees(summary.totalRevenue)}
                      </td>
                      <td className="py-2 px-3.5 text-right font-mono text-emerald-950 tabular-nums whitespace-nowrap bg-slate-50">
                        {formatFullRupees(summary.totalCollected)}
                      </td>
                      {hasGrossProfit && (
                        <>
                          <td className="py-2 px-3.5 text-right font-mono text-purple-950 tabular-nums whitespace-nowrap bg-slate-50">
                            {formatFullRupees(summary.totalGrossProfit)}
                          </td>
                          <td className="py-2 px-3.5 text-right font-mono text-slate-900 tabular-nums whitespace-nowrap bg-slate-50">
                            {summary.overallMarginPercent ?? 0}%
                          </td>
                        </>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
