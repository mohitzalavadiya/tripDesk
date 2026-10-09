"use client";

import * as React from "react";
import { IssueAnalyticsResult } from "@/lib/api-client/operations-client";
import { AlertTriangle, Clock, RefreshCw, Layers } from "lucide-react";

interface OperationsIssuesAnalyticsCardProps {
  issueData?: IssueAnalyticsResult;
  loading?: boolean;
}

export function OperationsIssuesAnalyticsCard({
  issueData,
  loading = false,
}: OperationsIssuesAnalyticsCardProps) {
  if (loading || !issueData) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 animate-pulse h-80">
        <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
        <div className="h-40 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  const totalProblemIssues =
    issueData.problemAreas.transport +
    issueData.problemAreas.hotel +
    issueData.problemAreas.activities +
    issueData.problemAreas.guestService +
    issueData.problemAreas.other;

  const getPercentage = (count: number) => {
    if (totalProblemIssues === 0) return 0;
    return Math.round((count / totalProblemIssues) * 100);
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between h-full">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Operational Issues & Velocity
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Resolution duration, priority breakdown and recurring problem areas
              </p>
            </div>
          </div>
          <span className="self-start sm:self-auto shrink-0 text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
            {issueData.totalIssues} Total
          </span>
        </div>

        {/* Resolution Velocity & Reopen Rate */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-1.5 sm:p-2.5 text-center">
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1 truncate">
              <Clock className="h-3 w-3 shrink-0" /> Avg Res.
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
              {issueData.averageResolutionHours}h
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-1.5 sm:p-2.5 text-center">
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1 truncate">
              <Clock className="h-3 w-3 shrink-0" /> Median
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
              {issueData.medianResolutionHours}h
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-1.5 sm:p-2.5 text-center">
            <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 flex items-center justify-center gap-1 truncate">
              <RefreshCw className="h-3 w-3 shrink-0" /> Reopened
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
              {issueData.reopenedRatePercent}%
            </div>
          </div>
        </div>

        {/* Priority Breakdown Badges */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-slate-700 mb-2">
            Priority Distribution
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
              <div className="font-bold text-sm">{issueData.byPriority.critical}</div>
              <div className="text-[10px] uppercase font-semibold">Critical</div>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <div className="font-bold text-sm">{issueData.byPriority.high}</div>
              <div className="text-[10px] uppercase font-semibold">High</div>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
              <div className="font-bold text-sm">{issueData.byPriority.medium}</div>
              <div className="text-[10px] uppercase font-semibold">Medium</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
              <div className="font-bold text-sm">{issueData.byPriority.low}</div>
              <div className="text-[10px] uppercase font-semibold">Low</div>
            </div>
          </div>
        </div>

        {/* Problem Areas Breakdown */}
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
            <span>Root Cause Areas</span>
            <span className="text-[10px] text-slate-400 font-normal">Categorized by issue text</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {[
              { label: "Transport & Chauffeurs", count: issueData.problemAreas.transport },
              { label: "Hotels & Stays", count: issueData.problemAreas.hotel },
              { label: "Activities & Sightseeing", count: issueData.problemAreas.activities },
              { label: "Guest Service & Requests", count: issueData.problemAreas.guestService },
              { label: "Other Operations", count: issueData.problemAreas.other },
            ].map((p, idx) => (
              <div key={idx} className="flex items-center justify-between text-slate-600">
                <span className="w-32 sm:w-44 truncate text-[11px] sm:text-xs">{p.label}</span>
                <div className="flex-1 mx-2 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-slate-600 rounded-full"
                    style={{ width: `${getPercentage(p.count)}%` }}
                  />
                </div>
                <span className="w-12 text-right font-medium text-slate-800 text-[11px] sm:text-xs shrink-0">
                  {p.count} <span className="text-slate-400 text-[10px]">({getPercentage(p.count)}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
