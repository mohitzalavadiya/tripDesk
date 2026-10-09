"use client";

import * as React from "react";
import {
  ReadinessAnalyticsResult,
} from "@/lib/api-client/operations-client";
import { CheckCircle2, ShieldAlert, Building, Car, Ticket, AlertCircle } from "lucide-react";

interface OperationsReadinessChartProps {
  readinessData?: ReadinessAnalyticsResult;
  loading?: boolean;
}

export function OperationsReadinessChart({
  readinessData,
  loading = false,
}: OperationsReadinessChartProps) {
  if (loading || !readinessData) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 animate-pulse h-80">
        <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
        <div className="h-40 bg-slate-100 rounded-lg mb-4" />
      </div>
    );
  }

  const getBlockerIcon = (category: string) => {
    switch (category) {
      case "HOTEL":
        return <Building className="h-4 w-4 text-indigo-600" />;
      case "VEHICLE":
        return <Car className="h-4 w-4 text-blue-600" />;
      case "ACTIVITY":
        return <Ticket className="h-4 w-4 text-emerald-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-rose-600" />;
    }
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Readiness & Top Blockers
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Readiness distribution and active confirmation bottlenecks
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto shrink-0 text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
            Avg: {readinessData.averageReadinessScore}%
          </span>
        </div>

        {/* Readiness Distribution Bars */}
        <div className="space-y-2 mb-5">
          <div className="text-xs font-semibold text-slate-700 mb-1">
            Readiness Histogram
          </div>
          {readinessData.readinessDistribution.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 sm:gap-3 text-xs">
              <span className="w-16 sm:w-20 text-slate-500 font-medium text-[11px] sm:text-xs shrink-0">{item.bucket}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    idx === 4
                      ? "bg-emerald-500"
                      : idx >= 2
                      ? "bg-blue-500"
                      : idx === 1
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <span className="w-12 text-right font-semibold text-slate-700 shrink-0 text-[11px] sm:text-xs">
                {item.count} <span className="text-slate-400 text-[10px]">({item.percentage}%)</span>
              </span>
            </div>
          ))}
        </div>

        {/* Top Blockers Ranking */}
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2">
            Primary Operational Blockers
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {readinessData.topBlockers.map((b, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded bg-white shadow-2xs border border-slate-100 shrink-0">
                    {getBlockerIcon(b.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-800 truncate">{b.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{b.percentage}% of blockers</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 shrink-0 px-2 py-0.5 rounded bg-white border border-slate-200/60 shadow-2xs">{b.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
