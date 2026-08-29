"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { PipelineStageMetric } from "@/lib/services/dashboard-service";

interface PipelineViewProps {
  pipeline?: PipelineStageMetric[];
  loading?: boolean;
}

export function PipelineView({ pipeline = [], loading = false }: PipelineViewProps) {
  const router = useRouter();

  const totalEnquiries = React.useMemo(() => {
    return pipeline.reduce((acc, curr) => acc + curr.count, 0);
  }, [pipeline]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 animate-pulse shadow-2xs">
        <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-7">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-xs animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Enquiry Pipeline
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Active enquiries across stages
          </p>
        </div>
        <button
          onClick={() => router.push("/enquiries")}
          className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-0.5 rounded-sm transition-colors cursor-pointer"
        >
          {totalEnquiries} Leads In Pipeline
        </button>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 mt-4">
        {pipeline.map((stage, idx) => {
          const percentage = totalEnquiries > 0 ? (stage.count / totalEnquiries) * 100 : 0;

          return (
            <div
              key={stage.status}
              onClick={() => router.push(`/enquiries?status=${stage.status}`)}
              className="relative flex flex-col justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all group cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-semibold text-slate-700 truncate" title={stage.label}>
                    {stage.label}
                  </span>
                  {idx < pipeline.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-slate-300 hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10" />
                  )}
                </div>
                <div className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {stage.count}
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>{percentage.toFixed(0)}%</span>
                  <span>₹{Number(stage.value).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
