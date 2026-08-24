import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { EnquiryStatus } from "@/types"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: EnquiryStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStyle = (s: EnquiryStatus) => {
    switch (s) {
      case "New":
        return {
          badge: "bg-blue-50/80 text-blue-700 border-blue-200/60 hover:bg-blue-50",
          dot: "bg-blue-500",
        }
      case "Contacted":
        return {
          badge: "bg-purple-50/80 text-purple-700 border-purple-200/60 hover:bg-purple-50",
          dot: "bg-purple-500",
        }
      case "Qualified":
        return {
          badge: "bg-teal-50/80 text-teal-700 border-teal-200/60 hover:bg-teal-50",
          dot: "bg-teal-500",
        }
      case "Quoted":
        return {
          badge: "bg-indigo-50/80 text-indigo-700 border-indigo-200/60 hover:bg-indigo-50",
          dot: "bg-indigo-500",
        }
      case "Follow-up":
        return {
          badge: "bg-amber-50/80 text-amber-700 border-amber-200/60 hover:bg-amber-50",
          dot: "bg-amber-500 animate-pulse",
        }
      case "Confirmed":
        return {
          badge: "bg-emerald-50/80 text-emerald-700 border-emerald-200/60 hover:bg-emerald-50 font-semibold",
          dot: "bg-emerald-500",
        }
      case "Lost":
        return {
          badge: "bg-rose-50/80 text-rose-700 border-rose-200/60 hover:bg-rose-50",
          dot: "bg-rose-500",
        }
      case "Cancelled":
        return {
          badge: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100",
          dot: "bg-slate-400",
        }
      default:
        return {
          badge: "bg-slate-50 text-slate-700 border-slate-200",
          dot: "bg-slate-400",
        }
    }
  }

  const { badge, dot } = getStyle(status)

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium tracking-tight rounded-full border shadow-2xs select-none",
        badge,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dot)} />
      <span>{status.replace("_", " ")}</span>
    </Badge>
  )
}

