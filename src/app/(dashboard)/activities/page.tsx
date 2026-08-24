"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Ticket,
  Plus,
  Search,
  MapPin,
  Clock,
  Sparkles,
  Compass,
  Users,
  RotateCcw,
  X,
  Eye,
  MoreVertical,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useInventory } from "@/context/inventory-context"
import { ActivityCategory, ActivityStatus } from "@/types"

export default function ActivitiesPage() {
  const router = useRouter()
  const { activities, activityRates, suppliers } = useInventory()

  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")

  const handleClearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
  }

  const isFilterActive = searchQuery !== "" || statusFilter !== "all"

  // Status counts
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      all: activities.length,
      Active: 0,
      Inactive: 0,
      Archived: 0,
    }
    activities.forEach((a) => {
      if (counts[a.status] !== undefined) {
        counts[a.status]++
      }
    })
    return counts
  }, [activities])

  // Key KPI numbers
  const stats = React.useMemo(() => {
    const total = activities.length
    const active = activities.filter((a) => a.status === "Active").length
    const adventure = activities.filter((a) => ["Adventure", "Water Activity", "Wildlife"].includes(a.category)).length
    const sightseeing = activities.filter((a) => ["Sightseeing", "Cultural", "Experience"].includes(a.category)).length

    return { total, active, adventure, sightseeing }
  }, [activities])

  // Filter activities
  const filteredActivities = React.useMemo(() => {
    return activities.filter((act) => {
      const q = searchQuery.toLowerCase().trim()
      const supplier = suppliers.find((s) => s.id === act.supplierId)
      const supplierName = supplier ? supplier.name.toLowerCase() : ""

      // 1. Multi-column search
      const matchesSearch =
        !q ||
        act.name.toLowerCase().includes(q) ||
        act.id.toLowerCase().includes(q) ||
        act.destination.toLowerCase().includes(q) ||
        act.category.toLowerCase().includes(q) ||
        (act.duration && act.duration.toLowerCase().includes(q)) ||
        (act.operatingDays && act.operatingDays.some((d) => d.toLowerCase().includes(q))) ||
        (act.ageRestrictions && act.ageRestrictions.toLowerCase().includes(q)) ||
        (act.description && act.description.toLowerCase().includes(q)) ||
        (act.notes && act.notes.toLowerCase().includes(q)) ||
        supplierName.includes(q)

      // 2. Status filter
      const matchesStatus =
        statusFilter === "all" || act.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [activities, suppliers, searchQuery, statusFilter])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Left Title & Telemetry */}
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Ticket className="h-3 w-3 text-indigo-500" />
                Experiences & Sightseeing
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {activities.length} excursion packages
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Activities & Excursions
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Manage sightseeing day-tours, adventure activities, ticket passes, and per-person tariffs
              </span>
            </div>

            {/* Micro-Telemetry Stat Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-950">{stats.active}</span> Active Tours
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 text-purple-800 font-medium border border-purple-100/60">
                <Sparkles className="h-3 w-3 text-purple-600" />
                <span className="font-bold text-purple-950">{stats.adventure}</span> Adventure & Sports
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-800 font-medium border border-blue-100/60">
                <Compass className="h-3 w-3 text-blue-600" />
                <span className="font-bold text-blue-950">{stats.sightseeing}</span> Sightseeing & City
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            <Button
              onClick={() => router.push("/activities/new")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              New Activity
            </Button>
          </div>
        </div>

        {/* Master Workspace Card (Unified Filter Bar + Table) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          
          {/* Master Toolbar Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3.5 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by activity name, destination, category (Sightseeing, Adventure), duration, supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-9 h-9.5 text-xs bg-slate-50/70 border-slate-200 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 focus-visible:bg-white rounded-xl transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

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

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {(
                [
                  { id: "all", label: "All Activities" },
                  { id: "Active", label: "Active" },
                  { id: "Inactive", label: "Inactive" },
                  { id: "Archived", label: "Archived" },
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

          {/* Content Table */}
          {filteredActivities.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={Ticket}
                title={isFilterActive ? "No matching activities found" : "No activities in inventory"}
                description={
                  isFilterActive
                    ? "Try adjusting your search criteria or resetting filters."
                    : "Add sightseeing excursions, adventure sports, and day tours to include in customer trip itineraries."
                }
                actionText={isFilterActive ? "Clear Search" : "New Activity"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/activities/new")}
              />
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[260px]">Activity & Tour</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Category</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Destination</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Duration</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Supplier</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Pricing Tariffs</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Status</TableHead>
                      <TableHead className="py-3 px-4 w-[60px] text-right font-bold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActivities.map((act) => {
                      const supplier = suppliers.find((s) => s.id === act.supplierId)
                      const rates = activityRates.filter((r) => r.activityId === act.id)

                      return (
                        <TableRow
                          key={act.id}
                          onClick={() => router.push(`/activities/${act.id}`)}
                          className="hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80"
                        >
                          <TableCell className="py-3.5 px-4 font-medium text-slate-900">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shadow-2xs shrink-0">
                                <Ticket className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                  {act.name}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  ID: {act.id}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/50">
                              {act.category}
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50/60 text-indigo-900 border border-indigo-100/60">
                              <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{act.destination}</span>
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-xs font-medium text-slate-600">
                            {act.duration ? (
                              <span className="inline-flex items-center gap-1 text-slate-700">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {act.duration}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-xs font-medium text-slate-700">
                            {supplier?.name || "Direct Activity"}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-xs">
                            <span className="bg-indigo-50 px-2 py-0.5 rounded font-semibold text-indigo-700 text-[11px]">
                              {rates.length} {rates.length === 1 ? "Tariff" : "Tariffs"}
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <Badge
                              variant="outline"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-full ${
                                act.status === "Active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                  : act.status === "Inactive"
                                  ? "bg-amber-50 text-amber-700 border-amber-200/60"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  act.status === "Active"
                                    ? "bg-emerald-500"
                                    : act.status === "Inactive"
                                    ? "bg-amber-500"
                                    : "bg-slate-400"
                                }`}
                              />
                              <span>{act.status}</span>
                            </Badge>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end" className="bg-white border border-slate-200 shadow-md rounded-xl p-1 w-44">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">Activity</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => router.push(`/activities/${act.id}`)} className="text-xs cursor-pointer rounded-md">
                                    <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                    Manage Tariffs
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="block lg:hidden divide-y divide-slate-100">
                {filteredActivities.map((act) => {
                  return (
                    <div
                      key={act.id}
                      onClick={() => router.push(`/activities/${act.id}`)}
                      className="p-4 space-y-3 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs truncate">{act.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{act.category}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            act.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {act.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-lg text-xs">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Destination</span>
                          <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-indigo-500" />
                            {act.destination}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Duration</span>
                          <span className="font-semibold text-slate-800 mt-0.5 block">{act.duration || "—"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>{act.operatingDays ? act.operatingDays.join(", ") : "Operating daily"}</span>
                        <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                          Manage <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Master Card Footer Strip */}
          <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{filteredActivities.length}</strong> of{" "}
              <strong className="text-slate-800">{activities.length}</strong> experiences
            </span>
            <span className="text-[11px] text-slate-400">
              TripDesk Excursions Catalog
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
