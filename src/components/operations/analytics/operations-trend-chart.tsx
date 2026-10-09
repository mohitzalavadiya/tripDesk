"use client";

import * as React from "react";
import { TrendTimePoint } from "@/lib/api-client/operations-client";
import {
  Activity,
  CheckCircle2,
  Calendar,
  AlertCircle,
  TrendingUp,
  Layers,
  ShieldCheck,
  Clock,
  Compass,
} from "lucide-react";

interface OperationsTrendChartProps {
  trends?: TrendTimePoint[];
  loading?: boolean;
}

function formatDate(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split("-");
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

export function OperationsTrendChart({
  trends = [],
  loading = false,
}: OperationsTrendChartProps) {
  const [metric, setMetric] = React.useState<"OPERATIONS" | "ISSUES">("OPERATIONS");

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 animate-pulse h-80">
        <div className="h-5 w-48 bg-slate-200 rounded mb-4" />
        <div className="h-20 bg-slate-100 rounded-lg mb-4" />
        <div className="h-40 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  // Aggregate velocity metrics across timepoints
  let totalOpsCreated = 0;
  let totalOpsCompleted = 0;
  let totalOpsCancelled = 0;
  let totalIssuesCreated = 0;
  let totalIssuesResolved = 0;
  let activeDaysCount = 0;

  for (const t of trends) {
    totalOpsCreated += t.operationsCount;
    totalOpsCompleted += t.operationsCompleted;
    totalOpsCancelled += t.operationsCancelled || 0;
    totalIssuesCreated += t.issuesCreated;
    totalIssuesResolved += t.issuesResolved;
    if (
      t.operationsCount > 0 ||
      t.operationsCompleted > 0 ||
      t.issuesCreated > 0 ||
      t.issuesResolved > 0
    ) {
      activeDaysCount++;
    }
  }

  const opCompletionRate =
    totalOpsCreated > 0
      ? Math.round((totalOpsCompleted / totalOpsCreated) * 100)
      : totalOpsCompleted > 0
      ? 100
      : 100;

  const issueResolutionRate =
    totalIssuesCreated > 0
      ? Math.round((totalIssuesResolved / totalIssuesCreated) * 100)
      : 100;

  // Filter days that had events for the active metric (newest first)
  const activeEvents = trends
    .filter((t) =>
      metric === "OPERATIONS"
        ? t.operationsCount > 0 ||
          t.operationsCompleted > 0 ||
          (t.operationsCancelled || 0) > 0
        : t.issuesCreated > 0 || t.issuesResolved > 0
    )
    .slice()
    .reverse();

  // Most recent 3 days as baseline context when zero events occurred
  const recentDays = trends.slice(-3).reverse();

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
      <div>
        {/* Card Header & Metric Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Operational Velocity & Execution Log
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Cadence metrics, completion milestones, and resolution velocity
              </p>
            </div>
          </div>

          <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50 self-start sm:self-auto shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setMetric("OPERATIONS")}
              className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-md text-xs font-medium text-center transition-colors ${
                metric === "OPERATIONS"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Tour Operations
            </button>
            <button
              onClick={() => setMetric("ISSUES")}
              className={`flex-1 sm:flex-initial px-2.5 py-1 rounded-md text-xs font-medium text-center transition-colors ${
                metric === "ISSUES"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Issues Velocity
            </button>
          </div>
        </div>

        {/* Velocity Metric Summary Cards (2x2 on mobile, 4 columns on sm+) */}
        {metric === "OPERATIONS" ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
            <div className="rounded-lg bg-blue-50/50 border border-blue-200/80 p-2.5 sm:p-3">
              <div className="text-[10px] sm:text-xs font-medium text-blue-700">Tours Initiated</div>
              <div className="text-lg sm:text-2xl font-bold text-blue-900 mt-0.5">
                {totalOpsCreated}
              </div>
              <div className="text-[10px] text-blue-600/80 mt-0.5 truncate">Active in period</div>
            </div>

            <div className="rounded-lg bg-emerald-50/50 border border-emerald-200/80 p-2.5 sm:p-3">
              <div className="text-[10px] sm:text-xs font-medium text-emerald-700">Tours Completed</div>
              <div className="text-lg sm:text-2xl font-bold text-emerald-900 mt-0.5">
                {totalOpsCompleted}
              </div>
              <div className="text-[10px] text-emerald-600/80 mt-0.5 truncate">Fully executed</div>
            </div>

            <div className="rounded-lg bg-indigo-50/50 border border-indigo-200/80 p-2.5 sm:p-3">
              <div className="text-[10px] sm:text-xs font-medium text-indigo-700">Completion Efficacy</div>
              <div className="text-lg sm:text-2xl font-bold text-indigo-900 mt-0.5">
                {opCompletionRate}%
              </div>
              <div className="text-[10px] text-indigo-600/80 mt-0.5 truncate">Completion ratio</div>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 sm:p-3">
              <div className="text-[10px] sm:text-xs font-medium text-slate-600">Active Cadence</div>
              <div className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5">
                {activeDaysCount} <span className="text-xs font-normal text-slate-500">Days</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">With operation events</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
            <div className="rounded-lg bg-rose-50/50 border border-rose-200/80 p-2.5 sm:p-3">
              <div className="text-[10px] sm:text-xs font-medium text-rose-700">Issues Reported</div>
              <div className="text-lg sm:text-2xl font-bold text-rose-900 mt-0.5">
                {totalIssuesCreated}
              </div>
              <div className="text-[10px] text-rose-600/80 mt-0.5 truncate">Total incidents</div>
            </div>

            <div className="rounded-lg bg-emerald-50/50 border border-emerald-200/80 p-2.5 sm:p-3">
              <div className="text-[10px] sm:text-xs font-medium text-emerald-700">Issues Resolved</div>
              <div className="text-lg sm:text-2xl font-bold text-emerald-900 mt-0.5">
                {totalIssuesResolved}
              </div>
              <div className="text-[10px] text-emerald-600/80 mt-0.5 truncate">Remediated & closed</div>
            </div>

            <div className="rounded-lg bg-teal-50/50 border border-teal-200/80 p-2.5 sm:p-3">
              <div className="text-[10px] sm:text-xs font-medium text-teal-700">Resolution Rate</div>
              <div className="text-lg sm:text-2xl font-bold text-teal-900 mt-0.5">
                {issueResolutionRate}%
              </div>
              <div className="text-[10px] text-teal-600/80 mt-0.5 truncate">Turnaround efficiency</div>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 sm:p-3">
              <div className="text-[10px] sm:text-xs font-medium text-slate-600">Operational Health</div>
              <div className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5">
                {totalIssuesCreated === 0 ? "100%" : totalIssuesCreated === totalIssuesResolved ? "Healthy" : "Active"}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                {totalIssuesCreated === 0 ? "Zero blockers logged" : `${totalIssuesCreated - totalIssuesResolved} pending`}
              </div>
            </div>
          </div>
        )}

        {/* Daily Activity Log */}
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {metric === "OPERATIONS" ? "Tour Execution Events" : "Issue Resolution Events"}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              {activeEvents.length > 0 ? `${activeEvents.length} Active Days` : "Clean execution"}
            </span>
          </div>

          {activeEvents.length > 0 ? (
            <div className="space-y-2">
              {activeEvents.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-[11px] sm:text-xs">
                      {formatDate(item.dateLabel)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({item.dateLabel})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {metric === "OPERATIONS" ? (
                      <>
                        {item.operationsCount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            +{item.operationsCount} Initiated
                          </span>
                        )}
                        {item.operationsCompleted > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ {item.operationsCompleted} Completed
                          </span>
                        )}
                        {(item.operationsCancelled || 0) > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                            ✕ {item.operationsCancelled} Cancelled
                          </span>
                        )}
                        {item.averageReadiness > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            Readiness: {item.averageReadiness}%
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        {item.issuesCreated > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                            +{item.issuesCreated} Reported
                          </span>
                        )}
                        {item.issuesResolved > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ {item.issuesResolved} Resolved
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 p-4 text-center">
              <div className="inline-flex p-2 rounded-full bg-emerald-50 text-emerald-600 mb-2">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-xs font-semibold text-slate-800">
                {metric === "OPERATIONS"
                  ? "Zero Operational Disruptions"
                  : "Zero Active Roadblocks"}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
                {metric === "OPERATIONS"
                  ? "All tours in this timeframe are operating on schedule without recorded status exceptions."
                  : "No operational issues or resolution delays were filed in this date range."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
