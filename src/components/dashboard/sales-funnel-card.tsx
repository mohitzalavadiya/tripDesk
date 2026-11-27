"use client";

import { Badge } from "@/components/ui/badge";
import { SalesFunnelAnalytics } from "@/lib/services/dashboard-service";
import {
  ArrowUpRight,
  Filter,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface SalesFunnelCardProps {
  funnel?: SalesFunnelAnalytics | null;
  loading?: boolean;
}

export function SalesFunnelCard({ funnel, loading = false }: SalesFunnelCardProps) {
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
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4 animate-pulse">
        <div className="h-4 w-40 bg-slate-200 rounded" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const stages = funnel?.stages || [];
  const overallConversion = funnel?.overallConversionRate ?? 0;
  const wonValue = funnel?.wonBookingsValue ?? 0;

  const getStageColor = (idx: number) => {
    const colors = [
      "from-slate-700 to-slate-900 text-slate-800 bg-slate-100 border-slate-200",
      "from-teal-600 to-teal-700 text-teal-800 bg-teal-50 border-teal-100",
      "from-indigo-600 to-indigo-700 text-indigo-800 bg-indigo-50 border-indigo-100",
      "from-sky-500 to-sky-600 text-sky-800 bg-sky-50 border-sky-100",
      "from-amber-500 to-amber-600 text-amber-800 bg-amber-50 border-amber-100",
      "from-emerald-600 to-emerald-700 text-emerald-800 bg-emerald-50 border-emerald-100",
    ];
    return colors[idx] || colors[0];
  };

  const getStageHref = (key: string) => {
    switch (key) {
      case "ENQUIRIES":
        return "/enquiries";
      case "QUALIFIED":
        return "/enquiries?status=QUALIFIED";
      case "QUOTED":
        return "/quotations";
      case "VIEWED":
        return "/quotations";
      case "ACCEPTED":
        return "/quotations?status=ACCEPTED";
      case "BOOKED":
        return "/bookings";
      default:
        return "/enquiries";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-2xs space-y-4 sm:space-y-5 min-w-0 overflow-hidden">
      <div className="flex flex-col gap-2.5 border-b border-slate-100 pb-3 sm:pb-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 min-w-0">
            <Filter className="h-4 w-4 text-teal-700 shrink-0" />
            <span className="truncate">Quotation Conversion Funnel</span>
          </h3>

          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-bold gap-1 shrink-0 whitespace-nowrap">
            <TrendingUp className="h-3 w-3" />
            {overallConversion}% Win Rate
          </Badge>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 min-w-0">
          <p className="truncate text-slate-500 text-xs min-w-0 flex-1">
            Enquiry to confirmed booking conversion pipeline.
          </p>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100/80 text-[11px] font-bold text-slate-700 whitespace-nowrap tabular-nums shrink-0">
            Won: <strong className="ml-1 text-slate-900 font-extrabold">{formatRupees(wonValue)}</strong>
          </span>
        </div>
      </div>

      {/* Stepped Funnel Visualization with Direct Stage Drill-Down */}
      <div className="space-y-2">
        {stages.map((stage, idx) => {
          const isFirst = idx === 0;
          const barWidthPercent = Math.max(12, stage.cumulativeConversionPercent || (isFirst ? 100 : 5));
          const href = getStageHref(stage.stage);

          return (
            <Link
              key={stage.stage}
              href={href}
              className="relative group block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 min-w-0"
            >
              <div className="flex items-center justify-between text-xs py-1.5 px-2.5 sm:px-3 rounded-xl border border-slate-100 bg-slate-50/50 group-hover:bg-slate-100/80 group-hover:border-slate-300 transition-all duration-200 gap-2 min-w-0 overflow-hidden">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                  <span className="font-bold text-slate-800 group-hover:text-teal-800 transition-colors truncate" title={stage.label}>
                    {stage.label}
                  </span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded-md border border-slate-200 shadow-2xs shrink-0 text-[11px] tabular-nums">
                    {stage.count}
                  </span>
                  <ArrowUpRight className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:text-teal-700 transition-opacity shrink-0 hidden sm:inline" />
                </div>

                {/* Visual Bar Container */}
                <div className="hidden md:flex flex-1 max-w-[110px] mx-2 items-center min-w-0">
                  <div className="w-full bg-slate-200/60 h-2.5 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${getStageColor(idx).split(" ")[0]} transition-all duration-500`}
                      style={{ width: `${barWidthPercent}%` }}
                    />
                  </div>
                </div>

                {/* Conversion & Value Stats */}
                <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0 whitespace-nowrap">
                  {stage.value > 0 && (
                    <span className="text-slate-600 font-bold hidden lg:inline tabular-nums">
                      {formatRupees(stage.value)}
                    </span>
                  )}
                  {!isFirst && (
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 tabular-nums">
                      {stage.conversionFromPreviousPercent}% step
                    </span>
                  )}
                  {isFirst ? (
                    <span className="text-slate-400 font-semibold text-[10px] sm:text-[11px]">100% base</span>
                  ) : stage.dropOffPercent > 0 ? (
                    <span className="text-rose-600 font-semibold text-[10px] hidden sm:inline tabular-nums">
                      -{stage.dropOffPercent}%
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
