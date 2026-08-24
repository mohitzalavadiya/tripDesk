"use client"

import * as React from "react"
import Link from "next/link"
import {
  Inbox,
  FileText,
  Compass,
  IndianRupee,
  ArrowUpRight,
  Hotel,
  Car,
  Ticket,
  Building2,
  FileSpreadsheet,
  ChevronRight,
} from "lucide-react"
import { useEnquiry } from "@/context/enquiry-context"
import { useInventory } from "@/context/inventory-context"

export function KpiCards() {
  const { enquiries, trips } = useEnquiry()
  const { hotels, vehicles, activities, suppliers, rateSheets } = useInventory()

  // Compute KPI values
  const newEnquiriesCount = enquiries.filter((e) => e.status === "New").length
  const quotedCount = enquiries.filter((e) => e.status === "Quoted").length
  const confirmedCount = trips.length

  // Calculate revenue from confirmed trips
  const totalRevenue = enquiries
    .filter((e) => e.status === "Confirmed" || e.status === "Quoted" || e.status === "Follow-up")
    .reduce((acc, curr) => acc + (curr.budget || 0), 0)

  const formatRupees = (val: number) => {
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)}L`
    }
    return `₹${val.toLocaleString("en-IN")}`
  }

  const kpiItems = [
    {
      title: "New Enquiries",
      value: String(newEnquiriesCount).padStart(2, "0"),
      trend: "+18%",
      comparison: "vs last month",
      icon: Inbox,
    },
    {
      title: "Quotations",
      value: String(quotedCount).padStart(2, "0"),
      trend: "+12%",
      comparison: "vs last month",
      icon: FileText,
    },
    {
      title: "Confirmed Trips",
      value: String(confirmedCount).padStart(2, "0"),
      trend: "+22%",
      comparison: "vs last month",
      icon: Compass,
    },
    {
      title: "Pipeline Value",
      value: formatRupees(totalRevenue),
      trend: "+16%",
      comparison: "vs last month",
      icon: IndianRupee,
    },
  ]

  const activeHotels = hotels.filter((h) => h.status === "Active").length
  const activeVehicles = vehicles.filter((v) => v.status === "Active").length
  const activeActivities = activities.filter((a) => a.status === "Active").length
  const activeSuppliers = suppliers.filter((s) => s.status === "Active").length

  return (
    <div className="space-y-4">
      {/* 4 Core Sales KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiItems.map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <div
              key={idx}
              className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-xs group/card animate-in fade-in duration-200 slide-in-from-bottom-2"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {kpi.title}
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600 group-hover/card:bg-indigo-50 group-hover/card:text-indigo-600 transition-colors">
                  <Icon className="h-4 w-4 stroke-[1.8]" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                  {kpi.value}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <span className="flex items-center font-semibold text-emerald-650 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                  <ArrowUpRight className="mr-0.5 h-3 w-3" />
                  {kpi.trend}
                </span>
                <span className="text-slate-400 font-medium">
                  {kpi.comparison}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Inventory & Supplier Quick Strip */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Travel Inventory & B2B Rates Network
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {rateSheets.length} Active Supplier Contracts Loaded
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
          <Link
            href="/hotels"
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/75 hover:bg-indigo-50/60 border border-slate-100 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-white border border-slate-200/80 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Hotel className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-semibold">Hotels</div>
                <div className="text-sm font-bold text-slate-900">{activeHotels} Active</div>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600" />
          </Link>

          <Link
            href="/vehicles"
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/75 hover:bg-blue-50/60 border border-slate-100 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-white border border-slate-200/80 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Car className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-semibold">Vehicles</div>
                <div className="text-sm font-bold text-slate-900">{activeVehicles} Fleet</div>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600" />
          </Link>

          <Link
            href="/activities"
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/75 hover:bg-emerald-50/60 border border-slate-100 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-white border border-slate-200/80 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Ticket className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-semibold">Activities</div>
                <div className="text-sm font-bold text-slate-900">{activeActivities} Tours</div>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600" />
          </Link>

          <Link
            href="/suppliers"
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/75 hover:bg-purple-50/60 border border-slate-100 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-white border border-slate-200/80 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] text-slate-500 font-semibold">Suppliers</div>
                <div className="text-sm font-bold text-slate-900">{activeSuppliers} Vendors</div>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-purple-600" />
          </Link>
        </div>
      </div>
    </div>
  )
}
