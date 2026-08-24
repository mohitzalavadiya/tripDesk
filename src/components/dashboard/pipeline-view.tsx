"use client"

import * as React from "react"
import { useEnquiry } from "@/context/enquiry-context"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

const STAGES_CONFIG = [
  { stage: "New", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { stage: "Contacted", color: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  { stage: "Qualified", color: "bg-teal-500/10 text-teal-600 border-teal-500/20" },
  { stage: "Quoted", color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  { stage: "Follow-up", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
]

export function PipelineView() {
  const router = useRouter()
  const { enquiries } = useEnquiry()

  const stageCounts = React.useMemo(() => {
    return STAGES_CONFIG.map((config) => {
      const count = enquiries.filter((e) => e.status === config.stage).length
      return {
        ...config,
        count,
      }
    })
  }, [enquiries])

  const totalEnquiries = stageCounts.reduce((acc, curr) => acc + curr.count, 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-xs animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Enquiry Pipeline
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active enquiries across stages
          </p>
        </div>
        <button
          onClick={() => router.push("/enquiries")}
          className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100/70 px-2 py-0.5 rounded-sm transition-colors cursor-pointer"
        >
          {totalEnquiries} Active Leads
        </button>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5 mt-4">
        {stageCounts.map((stage, idx) => {
          const percentage = totalEnquiries > 0 ? (stage.count / totalEnquiries) * 100 : 0
          
          return (
            <div
              key={stage.stage}
              onClick={() => router.push(`/enquiries?status=${stage.stage}`)}
              className="relative flex flex-col justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3 hover:border-indigo-100 hover:bg-indigo-50/10 transition-all group cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-semibold text-slate-700 truncate">
                    {stage.stage}
                  </span>
                  {idx < stageCounts.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-slate-350 hidden sm:block absolute -right-2 top-1/2 -translate-y-1/2 z-10" />
                  )}
                </div>
                <div className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {stage.count}
                </div>
              </div>
              
              <div className="mt-3 space-y-1">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {percentage.toFixed(0)}% of active
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
