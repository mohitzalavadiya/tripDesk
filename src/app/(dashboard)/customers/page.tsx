"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { EmptyState } from "@/components/shared/empty-state"
import { useEnquiry } from "@/context/enquiry-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Users,
  Search,
  Plus,
  MoreVertical,
  Eye,
  Phone,
  Mail,
  MapPin,
  RotateCcw,
  Sparkles,
  Luggage,
  Calendar,
  X,
  ArrowUpRight,
  UserCheck,
} from "lucide-react"

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
]

function getInitials(name: string) {
  if (!name) return "C"
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

export default function CustomersPage() {
  const router = useRouter()
  const { customers, enquiries, trips } = useEnquiry()

  // Filter & Search states
  const [search, setSearch] = React.useState("")
  const [segmentFilter, setSegmentFilter] = React.useState<string>("ALL")

  const handleClearFilters = () => {
    setSearch("")
    setSegmentFilter("ALL")
  }

  const isFilterActive = search !== "" || segmentFilter !== "ALL"

  // Calculations for each customer
  const getCustomerStats = React.useCallback((customerId: string) => {
    const customerEnquiries = enquiries.filter((e) => e.customerId === customerId)
    const customerTrips = trips.filter((t) => t.customerId === customerId)
    
    const activeEnquiries = customerEnquiries.filter(
      (e) => e.status !== "Lost" && e.status !== "Cancelled" && e.status !== "Confirmed"
    )

    let lastTripStr = "-"
    if (customerTrips.length > 0) {
      const sortedTrips = [...customerTrips].sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      )
      const lastTrip = sortedTrips[0]
      const tripDate = new Date(lastTrip.startDate)
      const formattedDate = isNaN(tripDate.getTime())
        ? ""
        : tripDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
      lastTripStr = `${lastTrip.destination} (${formattedDate})`
    }

    return {
      tripsCount: customerTrips.length,
      activeEnquiriesCount: activeEnquiries.length,
      lastTrip: lastTripStr,
    }
  }, [enquiries, trips])

  // Segment counters
  const segmentCounts = React.useMemo(() => {
    let withTrips = 0
    let withActiveEnq = 0
    let newLeads = 0

    customers.forEach((c) => {
      const stats = getCustomerStats(c.id)
      if (stats.tripsCount > 0) withTrips++
      if (stats.activeEnquiriesCount > 0) withActiveEnq++
      if (stats.tripsCount === 0 && stats.activeEnquiriesCount === 0) newLeads++
    })

    return {
      ALL: customers.length,
      WITH_TRIPS: withTrips,
      WITH_ACTIVE_ENQ: withActiveEnq,
      NEW_LEADS: newLeads,
    }
  }, [customers, getCustomerStats])

  // Filter logic
  const filteredCustomers = React.useMemo(() => {
    return customers.filter((cust) => {
      const { tripsCount, activeEnquiriesCount } = getCustomerStats(cust.id)
      
      if (search.trim() !== "") {
        const q = search.toLowerCase().trim()
        const matchesName = cust.name.toLowerCase().includes(q)
        const matchesPhone = cust.phone.includes(q)
        const matchesEmail = cust.email?.toLowerCase().includes(q)
        const matchesCity = cust.city?.toLowerCase().includes(q)
        const matchesNotes = cust.notes?.toLowerCase().includes(q)
        const matchesId = cust.id.toLowerCase().includes(q)
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesCity && !matchesNotes && !matchesId) {
          return false
        }
      }

      if (segmentFilter !== "ALL") {
        if (segmentFilter === "WITH_TRIPS" && tripsCount === 0) return false
        if (segmentFilter === "WITH_ACTIVE_ENQ" && activeEnquiriesCount === 0) return false
        if (segmentFilter === "NEW_LEADS" && (tripsCount > 0 || activeEnquiriesCount > 0)) return false
      }

      return true
    })
  }, [customers, search, segmentFilter, getCustomerStats])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
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
                <Users className="h-3 w-3 text-indigo-500" />
                Customer Directory
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {customers.length} client accounts
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Customers & Profiles
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                View customer booking history, contact profiles, and repeat travel insights
              </span>
            </div>

            {/* Micro-Telemetry Stat Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-950">{segmentCounts.WITH_TRIPS}</span> Confirmed Bookers
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 font-medium border border-amber-100/60">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="font-bold text-amber-950">{segmentCounts.WITH_ACTIVE_ENQ}</span> Active Enquiries
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                <UserCheck className="h-3 w-3 text-slate-500" />
                <span className="font-bold text-slate-900">
                  {customers.length > 0 ? `${Math.round((segmentCounts.WITH_TRIPS / customers.length) * 100)}%` : "0%"}
                </span> Booked Ratio
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            <Button
              onClick={() => router.push("/customers/new")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              New Customer
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
                  placeholder="Search by customer name, phone, email, city, notes, ID..."
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

            {/* Segment Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {(
                [
                  { id: "ALL", label: "All Customers" },
                  { id: "WITH_TRIPS", label: "Confirmed Bookers" },
                  { id: "WITH_ACTIVE_ENQ", label: "Active Enquiries" },
                  { id: "NEW_LEADS", label: "New Leads" },
                ] as const
              ).map((tab) => {
                const isActive = segmentFilter === tab.id
                const count = segmentCounts[tab.id as keyof typeof segmentCounts] ?? 0

                return (
                  <button
                    key={tab.id}
                    onClick={() => setSegmentFilter(tab.id)}
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
          {filteredCustomers.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={Users}
                title={isFilterActive ? "No matching customers found" : "No customers yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search criteria or resetting filters."
                    : "Create your first customer profile to start managing travel enquiries and trips."
                }
                actionText={isFilterActive ? "Clear Search" : "New Customer"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/customers/new")}
              />
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[260px]">Customer Profile</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Contact Channels</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">City / Origin</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Tags</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Enquiries / Trips</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Status</TableHead>
                      <TableHead className="py-3 px-4 w-[60px] text-right font-bold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((cust) => {
                      const stats = getCustomerStats(cust.id)
                      const gradient = getGradient(cust.name)

                      return (
                        <TableRow
                          key={cust.id}
                          onClick={() => router.push(`/customers/${cust.id}`)}
                          className="hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80"
                        >
                          <TableCell className="py-3.5 px-4 font-medium text-slate-900">
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${gradient} text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0`}>
                                {getInitials(cust.name)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                  {cust.name}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  ID: {cust.id}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {cust.phone}
                              </span>
                              {cust.email && (
                                <span className="text-slate-500 text-[11px] flex items-center gap-1.5 truncate max-w-[180px]">
                                  <Mail className="h-3 w-3 text-slate-400" />
                                  {cust.email}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-xs font-medium text-slate-600">
                            {cust.city ? (
                              <span className="inline-flex items-center gap-1 text-slate-700">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                {cust.city}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-center">
                            {stats.tripsCount > 0 ? (
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                {stats.tripsCount} {stats.tripsCount === 1 ? "Trip" : "Trips"}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">0</span>
                            )}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-center">
                            {stats.activeEnquiriesCount > 0 ? (
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                {stats.activeEnquiriesCount} Active
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">0</span>
                            )}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-xs font-medium text-slate-700">
                            {stats.lastTrip !== "-" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] font-semibold">
                                {stats.lastTrip}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-xs text-slate-500 font-medium">
                            {formatDate(cust.createdAt)}
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
                                  <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">Customer</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => router.push(`/customers/${cust.id}`)} className="text-xs cursor-pointer rounded-md">
                                    <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                    View Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/enquiries/new?customerId=${cust.id}`)} className="text-xs text-indigo-600 font-semibold cursor-pointer rounded-md">
                                    <Plus className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                                    New Enquiry
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
                {filteredCustomers.map((cust) => {
                  const stats = getCustomerStats(cust.id)
                  const gradient = getGradient(cust.name)

                  return (
                    <div
                      key={cust.id}
                      onClick={() => router.push(`/customers/${cust.id}`)}
                      className="p-4 space-y-3 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${gradient} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                            {getInitials(cust.name)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-xs truncate">{cust.name}</h4>
                            <p className="text-[11px] text-slate-500 truncate">{cust.phone}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {cust.id}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-lg text-xs">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Trips Booked</span>
                          <span className="font-bold text-slate-900">{stats.tripsCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Active Enquiries</span>
                          <span className="font-bold text-indigo-600">{stats.activeEnquiriesCount}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Joined: {formatDate(cust.createdAt)}</span>
                        <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                          Profile <ArrowUpRight className="h-3 w-3" />
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
              Showing <strong className="text-slate-800">{filteredCustomers.length}</strong> of{" "}
              <strong className="text-slate-800">{customers.length}</strong> customers
            </span>
            <span className="text-[11px] text-slate-400">
              TripDesk CRM • Verified Client Records
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
