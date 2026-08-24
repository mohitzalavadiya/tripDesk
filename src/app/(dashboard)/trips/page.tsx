"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { EmptyState } from "@/components/shared/empty-state"
import { useEnquiry } from "@/context/enquiry-context"
import { TripStatus } from "@/types"
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
import {
  Compass,
  Search,
  Plus,
  MoreVertical,
  Eye,
  Calendar,
  MapPin,
  Users,
  RotateCcw,
  Plane,
  Luggage,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  ArrowUpRight,
} from "lucide-react"

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-blue-500 to-sky-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
]

function getInitials(name: string) {
  if (!name) return "T"
  const parts = name.trim().split(" ")
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[index]
}

export function getTripStatusBadgeColor(status: TripStatus) {
  switch (status) {
    case "Planning":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "Quoting":
      return "bg-purple-50 text-purple-700 border-purple-200"
    case "Confirmed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "In Progress":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "Completed":
      return "bg-slate-100 text-slate-700 border-slate-200"
    case "Cancelled":
      return "bg-rose-50 text-rose-700 border-rose-200"
    default:
      return "bg-slate-100 text-slate-700 border-slate-200"
  }
}

export function TripStatusBadge({ status }: { status: TripStatus }) {
  const getStyle = (s: TripStatus) => {
    switch (s) {
      case "Planning":
        return {
          badge: "bg-blue-50/80 text-blue-700 border-blue-200/60",
          dot: "bg-blue-500",
        }
      case "Quoting":
        return {
          badge: "bg-purple-50/80 text-purple-700 border-purple-200/60",
          dot: "bg-purple-500",
        }
      case "Confirmed":
        return {
          badge: "bg-emerald-50/80 text-emerald-700 border-emerald-200/60 font-semibold",
          dot: "bg-emerald-500",
        }
      case "In Progress":
        return {
          badge: "bg-amber-50/80 text-amber-700 border-amber-200/60 font-semibold",
          dot: "bg-amber-500 animate-pulse",
        }
      case "Completed":
        return {
          badge: "bg-slate-100 text-slate-700 border-slate-200",
          dot: "bg-slate-500",
        }
      case "Cancelled":
        return {
          badge: "bg-rose-50/80 text-rose-700 border-rose-200/60",
          dot: "bg-rose-500",
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-full border shadow-2xs select-none ${badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
      <span>{status}</span>
    </Badge>
  )
}

export default function TripsPage() {
  const router = useRouter()
  const { trips, customers } = useEnquiry()

  // Filter & Search states
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL")

  const handleClearFilters = () => {
    setSearch("")
    setStatusFilter("ALL")
  }

  const isFilterActive = search !== "" || statusFilter !== "ALL"

  // Status counts
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      ALL: trips.length,
      Planning: 0,
      Quoting: 0,
      Confirmed: 0,
      "In Progress": 0,
      Completed: 0,
      Cancelled: 0,
    }
    trips.forEach((t) => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++
      }
    })
    return counts
  }, [trips])

  // Key KPI numbers
  const stats = React.useMemo(() => {
    const total = trips.length
    const running = trips.filter((t) => t.status === "In Progress").length
    const confirmed = trips.filter((t) => t.status === "Confirmed").length
    const completed = trips.filter((t) => t.status === "Completed").length

    return { total, running, confirmed, completed }
  }, [trips])

  // Composable Filter logic
  const filteredTrips = React.useMemo(() => {
    return trips.filter((trip) => {
      const customer = customers.find((c) => c.id === trip.customerId)
      
      if (search.trim() !== "") {
        const q = search.toLowerCase().trim()
        const matchesDest = trip.destination.toLowerCase().includes(q)
        const matchesId = trip.id.toLowerCase().includes(q)
        const matchesCustomer = customer?.name.toLowerCase().includes(q)
        const matchesPhone = customer?.phone.includes(q)
        const matchesEmail = customer?.email?.toLowerCase().includes(q)
        const matchesNotes = trip.notes?.toLowerCase().includes(q)
        const matchesDates = trip.startDate.includes(q) || trip.endDate.includes(q)
        
        if (!matchesDest && !matchesId && !matchesCustomer && !matchesPhone && !matchesEmail && !matchesNotes && !matchesDates) {
          return false
        }
      }

      if (statusFilter !== "ALL" && trip.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [trips, customers, search, statusFilter])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getDurationDays = (start: string, end: string) => {
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()
    if (isNaN(s) || isNaN(e)) return 0
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24))
    return diff > 0 ? diff : 1
  }

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
                <Compass className="h-3 w-3 text-indigo-500" />
                Operations & Itineraries
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {trips.length} holiday workspaces
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Trip Workspaces
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Build day-by-day itineraries, manage vouchers, and track running travel operations
              </span>
            </div>

            {/* Micro-Telemetry Stat Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 font-medium border border-amber-100/60">
                <Plane className="h-3 w-3 text-amber-600 animate-pulse" />
                <span className="font-bold text-amber-950">{stats.running}</span> Travelling Now
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span className="font-bold text-emerald-950">{stats.confirmed}</span> Upcoming Confirmed
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                <Luggage className="h-3 w-3 text-slate-500" />
                <span className="font-bold text-slate-900">{stats.completed}</span> Completed
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            <Button
              onClick={() => router.push("/trips/new")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              New Trip
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
                  placeholder="Search by destination, customer name, dates, notes, ID..."
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
                  { id: "ALL", label: "All Trips" },
                  { id: "Planning", label: "Planning" },
                  { id: "Quoting", label: "Quoting" },
                  { id: "Confirmed", label: "Confirmed" },
                  { id: "In Progress", label: "In Progress" },
                  { id: "Completed", label: "Completed" },
                  { id: "Cancelled", label: "Cancelled" },
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
          {filteredTrips.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={Compass}
                title={isFilterActive ? "No matching trips found" : "No trips yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search criteria or resetting filters."
                    : "Convert an enquiry to a trip or create a new trip to build day-by-day itineraries."
                }
                actionText={isFilterActive ? "Clear Search" : "New Trip"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/trips/new")}
              />
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[240px]">Trip Destination</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Customer</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Destination</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Travel Window</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Duration</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Travellers</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Status</TableHead>
                      <TableHead className="py-3 px-4 w-[60px] text-right font-bold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrips.map((trip) => {
                      const customer = customers.find((c) => c.id === trip.customerId)
                      const custName = customer?.name || "Unknown Customer"
                      const gradient = getGradient(custName)
                      const duration = getDurationDays(trip.startDate, trip.endDate)

                      return (
                        <TableRow
                          key={trip.id}
                          onClick={() => router.push(`/trips/${trip.id}`)}
                          className="hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80"
                        >
                          <TableCell className="py-3.5 px-4 font-medium text-slate-900">
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                Trip to {trip.destination}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                                ID: {trip.id}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`h-7 w-7 rounded-full bg-gradient-to-tr ${gradient} text-white font-bold text-[11px] flex items-center justify-center shadow-2xs shrink-0`}>
                                {getInitials(custName)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-slate-800 text-xs truncate">
                                  {custName}
                                </span>
                                <span className="text-[11px] text-slate-500 truncate">
                                  {customer?.phone || "-"}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50/60 text-indigo-900 border border-indigo-100/60">
                              <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{trip.destination}</span>
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-xs font-medium text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>
                                {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700 text-[11px]">
                              <Clock className="h-2.5 w-2.5 text-slate-400" />
                              {duration}D / {Math.max(0, duration - 1)}N
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-xs font-medium text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>{trip.adults}A {trip.children > 0 && `+ ${trip.children}C`}</span>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <TripStatusBadge status={trip.status} />
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
                                  <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">Trip Options</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => router.push(`/trips/${trip.id}`)} className="text-xs cursor-pointer rounded-md">
                                    <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                    Open Workspace
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
                {filteredTrips.map((trip) => {
                  const customer = customers.find((c) => c.id === trip.customerId)
                  const custName = customer?.name || "Unknown Customer"
                  const gradient = getGradient(custName)

                  return (
                    <div
                      key={trip.id}
                      onClick={() => router.push(`/trips/${trip.id}`)}
                      className="p-4 space-y-3 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs truncate">Trip to {trip.destination}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {trip.id}</span>
                        </div>
                        <TripStatusBadge status={trip.status} />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`h-6 w-6 rounded-full bg-gradient-to-tr ${gradient} text-white font-bold text-[10px] flex items-center justify-center shrink-0`}>
                          {getInitials(custName)}
                        </div>
                        <span className="text-xs font-semibold text-slate-800">{custName}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-lg text-xs">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Destination</span>
                          <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-indigo-500" />
                            {trip.destination}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Travel Dates</span>
                          <span className="font-semibold text-slate-800 mt-0.5 block">{formatDate(trip.startDate)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>{trip.adults} Adults {trip.children > 0 && `+ ${trip.children} Kids`}</span>
                        <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                          Workspace <ArrowUpRight className="h-3 w-3" />
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
              Showing <strong className="text-slate-800">{filteredTrips.length}</strong> of{" "}
              <strong className="text-slate-800">{trips.length}</strong> trips
            </span>
            <span className="text-[11px] text-slate-400">
              TripDesk Itinerary & Ops Engine
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
