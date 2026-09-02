"use client";

import * as React from "react";
import Link from "next/link";
import {
  TrendingDown,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Inbox,
  Eye,
  CheckCircle2,
  CalendarCheck,
  Filter,
} from "lucide-react";
import { SalesFunnelAnalytics, FunnelStageItem } from "@/lib/services/dashboard-service";
import { Badge } from "@/components/ui/badge";

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
      "from-indigo-500 to-indigo-600 text-indigo-700 bg-indigo-50 border-indigo-100",
      "from-blue-500 to-blue-600 text-blue-700 bg-blue-50 border-blue-100",
      "from-sky-500 to-sky-600 text-sky-700 bg-sky-50 border-sky-100",
      "from-teal-500 to-teal-600 text-teal-700 bg-teal-50 border-teal-100",
      "from-amber-500 to-amber-600 text-amber-700 bg-amber-50 border-amber-100",
      "from-emerald-500 to-emerald-600 text-emerald-700 bg-emerald-50 border-emerald-100",
    ];
    return colors[idx] || colors[0];
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-600" />
            <span>Sales & Quotation Conversion Funnel</span>
          </h3>
          <p className="text-xs text-slate-500">
            End-to-end pipeline progression from enquiry to won booking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-bold gap-1">
            <TrendingUp className="h-3 w-3" />
            {overallConversion}% Overall Win Rate
          </Badge>
          <span className="text-xs font-bold text-slate-700">
            Won: {formatRupees(wonValue)}
          </span>
        </div>
      </div>

      {/* Stepped Funnel Visualization */}
      <div className="space-y-2.5">
        {stages.map((stage, idx) => {
          const isLast = idx === stages.length - 1;
          const isFirst = idx === 0;
          const barWidthPercent = Math.max(12, stage.cumulativeConversionPercent || (isFirst ? 100 : 5));

          return (
            <div key={stage.stage} className="relative group">
              <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/60 transition-colors">
                <div className="flex items-center gap-2.5 min-w-[160px]">
                  <span className="font-bold text-slate-800">{stage.label}</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                    {stage.count}
                  </span>
                </div>

                {/* Visual Bar Container */}
                <div className="hidden sm:flex flex-1 mx-4 items-center">
                  <div className="w-full bg-slate-200/60 h-3 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${getStageColor(idx).split(" ")[0]} transition-all duration-500`}
                      style={{ width: `${barWidthPercent}%` }}
                    />
                  </div>
                </div>

                {/* Conversion & Value Stats */}
                <div className="flex items-center gap-3 text-[11px] font-mono shrink-0">
                  {stage.value > 0 && (
                    <span className="text-slate-600 font-bold hidden md:inline">
                      {formatRupees(stage.value)}
                    </span>
                  )}
                  {!isFirst && (
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                      {stage.conversionFromPreviousPercent}% step
                    </span>
                  )}
                  {isFirst ? (
                    <span className="text-slate-400 font-semibold">100% base</span>
                  ) : stage.dropOffPercent > 0 ? (
                    <span className="text-rose-600 font-semibold text-[10px] hidden sm:inline">
                      -{stage.dropOffPercent}% loss
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
