"use client";

import * as React from "react";
import { TrendTimePoint } from "@/lib/api-client/operations-client";
import { TrendingUp, Calendar } from "lucide-react";

interface OperationsTrendChartProps {
  trends?: TrendTimePoint[];
  loading?: boolean;
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
        <div className="h-48 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  const maxVal = Math.max(
    ...trends.map((t) =>
      metric === "OPERATIONS"
        ? Math.max(t.operationsCount, t.operationsCompleted)
        : Math.max(t.issuesCreated, t.issuesResolved)
    ),
    5
  );

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Operations & Issue Velocity Trends
              </h3>
              <p className="text-xs text-slate-500">
                Time-series progression of tour execution and issue resolution velocity
              </p>
            </div>
          </div>

          <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              onClick={() => setMetric("OPERATIONS")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                metric === "OPERATIONS"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Tour Operations
            </button>
            <button
              onClick={() => setMetric("ISSUES")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                metric === "ISSUES"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Issues Velocity
            </button>
          </div>
        </div>

        {/* SVG / Bar Chart Area */}
        <div className="h-44 w-full flex items-end gap-1 pt-4 pb-2 border-b border-slate-100">
          {trends.map((t, idx) => {
            const val1 = metric === "OPERATIONS" ? t.operationsCount : t.issuesCreated;
            const val2 = metric === "OPERATIONS" ? t.operationsCompleted : t.issuesResolved;
            const height1 = maxVal > 0 ? (val1 / maxVal) * 100 : 0;
            const height2 = maxVal > 0 ? (val2 / maxVal) * 100 : 0;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                {/* Tooltip */}
                <div className="absolute -top-10 bg-slate-900 text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-md">
                  <div>{t.dateLabel}</div>
                  <div>
                    {metric === "OPERATIONS"
                      ? `Active: ${val1} | Completed: ${val2}`
                      : `Created: ${val1} | Resolved: ${val2}`}
                  </div>
                </div>

                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                  <div
                    className={`w-2 rounded-t transition-all ${
                      metric === "OPERATIONS" ? "bg-blue-400 group-hover:bg-blue-600" : "bg-rose-400 group-hover:bg-rose-600"
                    }`}
                    style={{ height: `${Math.max(4, height1)}%` }}
                  />
                  <div
                    className={`w-2 rounded-t transition-all ${
                      metric === "OPERATIONS"
                        ? "bg-emerald-400 group-hover:bg-emerald-600"
                        : "bg-teal-400 group-hover:bg-teal-600"
                    }`}
                    style={{ height: `${Math.max(4, height2)}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 mt-1 truncate w-full text-center">
                  {idx % Math.ceil(trends.length / 7) === 0 ? t.dateLabel.slice(5) : ""}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                metric === "OPERATIONS" ? "bg-blue-500" : "bg-rose-500"
              }`}
            />
            <span>{metric === "OPERATIONS" ? "Active Tours Created" : "Issues Reported"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                metric === "OPERATIONS" ? "bg-emerald-500" : "bg-teal-500"
              }`}
            />
            <span>{metric === "OPERATIONS" ? "Tours Completed" : "Issues Resolved"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
