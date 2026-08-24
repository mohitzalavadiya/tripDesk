"use client"

import * as React from "react"
import { Compass, Calendar, ArrowRight } from "lucide-react"
import { useEnquiry } from "@/context/enquiry-context"
import { useRouter } from "next/navigation"

export function UpcomingTripsList() {
  const router = useRouter()
  const { trips, customers } = useEnquiry()

  const getCustomerName = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId)
    return customer ? customer.name : "Unknown"
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    })
  }

  const getDurationString = (start: string, end: string) => {
    if (!start || !end) return ""
    const s = new Date(start)
    const e = new Date(end)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return ""
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
    return `${diff} Nights / ${diff + 1} Days`
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-xs flex flex-col h-full animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
            Upcoming Trips
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Confirmed and planning travel schedules
          </p>
        </div>
        <button 
          onClick={() => router.push("/enquiries")}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
        >
          Manage
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="flex-1 space-y-3">
        {trips.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-8">
            No confirmed trips created yet.
          </div>
        ) : (
          trips.map((trip) => (
            <div
              key={trip.id}
              onClick={() => router.push(`/trips/${trip.id}`)}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all group cursor-pointer"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900 truncate">
                    {trip.name}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold select-none capitalize ${
                      trip.status.toLowerCase() === "confirmed" || trip.status.toLowerCase() === "completed"
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-105"
                        : "bg-blue-50 text-blue-600 border border-blue-105"
                    }`}
                  >
                    {trip.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <span className="font-bold text-slate-650 truncate">{getCustomerName(trip.customerId)}</span>
                  <span>•</span>
                  <span>{getDurationString(trip.startDate, trip.endDate)}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(trip.startDate)} – {formatDate(trip.endDate)}</span>
                </div>
              </div>

              <button
                onClick={() => router.push(`/trips/${trip.id}`)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-100 hover:border-indigo-100 transition-all cursor-pointer"
              >
                <Compass className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
