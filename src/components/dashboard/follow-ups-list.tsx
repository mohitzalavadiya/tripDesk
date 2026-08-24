"use client"

import * as React from "react"
import { PhoneCall, ArrowRight, CheckCircle2 } from "lucide-react"
import { useEnquiry } from "@/context/enquiry-context"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function FollowUpsList() {
  const router = useRouter()
  const { followups, enquiries, customers, completeFollowUp } = useEnquiry()

  // Get active (incomplete) followups
  const activeFollowups = React.useMemo(() => {
    return followups.filter((f) => f.status !== "Completed")
  }, [followups])

  // Get count due today
  const dueTodayCount = React.useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0]
    return activeFollowups.filter((f) => f.date === todayStr).length
  }, [activeFollowups])

  const handleCall = (client: string) => {
    toast.success(`Dialing ${client} (Integration coming in Phase 3)`)
  }

  const formatRupees = (val: number) => {
    return `₹${val.toLocaleString("en-IN")}`
  }

  const getEnquiryInfo = (enquiryId: string) => {
    const enq = enquiries.find((e) => e.id === enquiryId)
    if (!enq) return { customerName: "Unknown", destination: "Unknown", budget: 0 }
    
    const customer = customers.find((c) => c.id === enq.customerId)
    return {
      customerName: customer ? customer.name : "Unknown",
      destination: enq.destination,
      budget: enq.budget || 0,
    }
  }

  const getDueDateLabel = (dateStr: string) => {
    const todayStr = new Date().toISOString().split("T")[0]
    if (dateStr === todayStr) return "Today"
    
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split("T")[0]
    if (dateStr === tomorrowStr) return "Tomorrow"
    
    if (dateStr < todayStr) return "Overdue"
    
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
  }

  const handleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    completeFollowUp(id)
    toast.success("Follow-up marked as completed")
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-xs flex flex-col h-full animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Today&apos;s Follow-ups
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Key conversations required today
          </p>
        </div>
        <span className="text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded-full select-none">
          {dueTodayCount} Due
        </span>
      </div>

      <div className="flex-1 space-y-3">
        {activeFollowups.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-8">
            All follow-ups completed! No tasks due.
          </div>
        ) : (
          activeFollowups.map((item) => {
            const { customerName, destination, budget } = getEnquiryInfo(item.enquiryId)
            const dueLabel = getDueDateLabel(item.date)
            const isOverdue = dueLabel === "Overdue"
            const isToday = dueLabel === "Today"

            return (
              <div
                key={item.id}
                onClick={() => router.push(`/enquiries/${item.enquiryId}`)}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all group cursor-pointer"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-sm text-slate-900 truncate">
                      {customerName}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold select-none ${
                        isOverdue
                          ? "bg-rose-50 text-rose-600 border border-rose-100 animate-pulse"
                          : isToday
                          ? "bg-amber-50 text-amber-600 border border-amber-100"
                          : "bg-slate-50 text-slate-500 border border-slate-100"
                      }`}
                    >
                      {dueLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                    <span className="font-bold text-slate-600 truncate max-w-[80px]">{destination}</span>
                    <span>•</span>
                    <span>{formatRupees(budget)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate max-w-[170px]" title={item.note}>
                    {item.note}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleComplete(item.id, e)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-100 hover:border-emerald-100 transition-all cursor-pointer"
                    title="Mark completed"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleCall(customerName)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100 hover:border-indigo-100 transition-all cursor-pointer"
                    title={`Call ${customerName}`}
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => router.push(`/enquiries/${item.enquiryId}`)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-450 hover:text-slate-600 cursor-pointer"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
