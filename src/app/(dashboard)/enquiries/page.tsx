"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { EmptyState } from "@/components/shared/empty-state"
import { EnquiryTable } from "@/components/enquiries/enquiry-table"
import { EnquiryPipeline } from "@/components/enquiries/enquiry-pipeline"
import { useEnquiry } from "@/context/enquiry-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Inbox,
  Plus,
  List,
  KanbanSquare,
  Search,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  X,
  Compass,
  ArrowRight,
  Filter,
} from "lucide-react"

export default function EnquiriesPage() {
  const router = useRouter()
  const { enquiries, customers } = useEnquiry()
  
  // View mode
  const [view, setView] = React.useState<"list" | "pipeline">(() => {
    if (typeof window !== "undefined") {
      const savedView = localStorage.getItem("enquiry_view_preference")
      if (savedView === "list" || savedView === "pipeline") {
        return savedView
      }
    }
    return "list"
  })
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")

  const handleViewChange = (newView: "list" | "pipeline") => {
    setView(newView)
    localStorage.setItem("enquiry_view_preference", newView)
  }

  const handleClearFilters = () => {
    setSearch("")
    setStatusFilter("ALL")
  }

  const isFilterActive = search !== "" || statusFilter !== "ALL"

  // Status counts
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      ALL: enquiries.length,
      New: 0,
      Contacted: 0,
      Qualified: 0,
      Quoted: 0,
      "Follow-up": 0,
      Confirmed: 0,
      Lost: 0,
    }
    enquiries.forEach((e) => {
      if (counts[e.status] !== undefined) {
        counts[e.status]++
      }
    })
    return counts
  }, [enquiries])

  // Key KPI numbers
  const stats = React.useMemo(() => {
    const total = enquiries.length
    const active = enquiries.filter((e) => ["New", "Contacted", "Qualified", "Quoted", "Follow-up"].includes(e.status)).length
    const confirmed = enquiries.filter((e) => e.status === "Confirmed").length
    const quotedValue = enquiries
      .filter((e) => e.budget && ["Quoted", "Confirmed"].includes(e.status))
      .reduce((acc, e) => acc + (e.budget || 0), 0)

    return { total, active, confirmed, quotedValue }
  }, [enquiries])

  // Filtered list
  const filteredEnquiries = React.useMemo(() => {
    return enquiries.filter((enq) => {
      const customer = customers.find((c) => c.id === enq.customerId)
      
      if (search.trim() !== "") {
        const q = search.toLowerCase().trim()
        const matchesName = customer?.name.toLowerCase().includes(q)
        const matchesPhone = customer?.phone.includes(q)
        const matchesEmail = customer?.email?.toLowerCase().includes(q)
        const matchesCity = customer?.city?.toLowerCase().includes(q)
        const matchesDest = enq.destination.toLowerCase().includes(q)
        const matchesId = enq.id.toLowerCase().includes(q)
        const matchesNotes = enq.notes?.toLowerCase().includes(q)
        const matchesBudget = enq.budget ? String(enq.budget).includes(q) : false
        
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesCity && !matchesDest && !matchesId && !matchesNotes && !matchesBudget) {
          return false
        }
      }

      if (statusFilter !== "ALL" && enq.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [enquiries, customers, search, statusFilter])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          {/* Subtle Decorative Accent Glow */}
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Left Title & Telemetry */}
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Compass className="h-3 w-3 text-indigo-500" />
                Lead Management
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {enquiries.length} total entries
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Travel Enquiries
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Track, qualify, and convert lead inquiries into confirmed trips
              </span>
            </div>

            {/* Micro-Telemetry Stat Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="font-bold text-slate-900">{stats.active}</span> Active Leads
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-950">{stats.confirmed}</span> Confirmed ({stats.total > 0 ? `${Math.round((stats.confirmed / stats.total) * 100)}%` : "0%"})
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-medium border border-indigo-100/60">
                <TrendingUp className="h-3 w-3 text-indigo-600" />
                <span className="font-bold text-indigo-950">₹{(stats.quotedValue / 100000).toFixed(1)}L</span> Pipeline Value
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            {/* View Switcher */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1">
              <button
                onClick={() => handleViewChange("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  view === "list"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
              <button
                onClick={() => handleViewChange("pipeline")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  view === "pipeline"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <KanbanSquare className="h-3.5 w-3.5" />
                Pipeline
              </button>
            </div>

            {/* Primary Action Button */}
            <Button
              onClick={() => router.push("/enquiries/new")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              New Enquiry
            </Button>
          </div>
        </div>

        {/* Master Workspace Card (Unified Filter Bar + Table) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          
          {/* Master Toolbar Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3.5 bg-white">
            
            {/* Search Input and Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by customer name, destination, phone, email, notes, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-9 h-9.5 text-xs bg-slate-50/70 border-slate-200 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 focus-visible:bg-white rounded-xl transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Reset Action */}
              {isFilterActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 shrink-0 cursor-pointer font-semibold rounded-lg self-start sm:self-auto"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset Filters
                </Button>
              )}
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {(
                [
                  { id: "ALL", label: "All Enquiries" },
                  { id: "New", label: "New" },
                  { id: "Contacted", label: "Contacted" },
                  { id: "Qualified", label: "Qualified" },
                  { id: "Quoted", label: "Quoted" },
                  { id: "Follow-up", label: "Follow-up" },
                  { id: "Confirmed", label: "Confirmed" },
                  { id: "Lost", label: "Lost" },
                ] as const
              ).map((tab) => {
                const isActive = statusFilter === tab.id
                const count = statusCounts[tab.id] ?? 0

                return (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none shrink-0 ${
                      isActive
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-slate-100/75 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-white text-slate-500 border border-slate-200/60"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Master Content: Table or Pipeline */}
          {filteredEnquiries.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={Inbox}
                title={isFilterActive ? "No matching enquiries found" : "No enquiries yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search criteria or resetting filters."
                    : "Create your first enquiry to begin tracking lead lifecycle and holiday itineraries."
                }
                actionText={isFilterActive ? "Clear Search" : "New Enquiry"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/enquiries/new")}
              />
            </div>
          ) : (
            <div>
              {view === "list" ? (
                <EnquiryTable enquiries={filteredEnquiries} />
              ) : (
                <div className="p-5 bg-slate-50/50">
                  <EnquiryPipeline enquiries={filteredEnquiries} />
                </div>
              )}
            </div>
          )}

          {/* Master Card Footer Strip */}
          <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{filteredEnquiries.length}</strong> of{" "}
              <strong className="text-slate-800">{enquiries.length}</strong> enquiries
            </span>
            <span className="text-[11px] text-slate-400">
              TripDesk Lead Engine • Auto-synced
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
