"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Hotel as HotelIcon,
  Plus,
  Search,
  Star,
  Building2,
  MapPin,
  Sparkles,
  BedDouble,
  Tag,
  ExternalLink,
  RotateCcw,
  X,
  Eye,
  CheckCircle2,
  ArrowUpRight,
  MoreVertical,
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
import { Hotel as HotelType, HotelStatus } from "@/types"

export default function HotelsPage() {
  const router = useRouter()
  const { hotels, suppliers, hotelRooms, hotelRates } = useInventory()

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
      all: hotels.length,
      Active: 0,
      Inactive: 0,
      Archived: 0,
    }
    hotels.forEach((h) => {
      if (counts[h.status] !== undefined) {
        counts[h.status]++
      }
    })
    return counts
  }, [hotels])

  // Key KPI numbers
  const stats = React.useMemo(() => {
    const total = hotels.length
    const active = hotels.filter((h) => h.status === "Active").length
    const luxury = hotels.filter((h) => (h.starCategory || 0) >= 5).length
    const totalRooms = hotelRooms.length

    return { total, active, luxury, totalRooms }
  }, [hotels, hotelRooms])

  // Filter hotels
  const filteredHotels = React.useMemo(() => {
    return hotels.filter((hotel) => {
      const q = searchQuery.toLowerCase().trim()
      const supplier = suppliers.find((s) => s.id === hotel.supplierId)
      const supplierName = supplier ? supplier.name.toLowerCase() : ""

      // 1. Multi-column search
      const matchesSearch =
        !q ||
        hotel.name.toLowerCase().includes(q) ||
        hotel.id.toLowerCase().includes(q) ||
        hotel.destination.toLowerCase().includes(q) ||
        (hotel.area && hotel.area.toLowerCase().includes(q)) ||
        (hotel.address && hotel.address.toLowerCase().includes(q)) ||
        (hotel.contactPerson && hotel.contactPerson.toLowerCase().includes(q)) ||
        (hotel.phone && hotel.phone.includes(q)) ||
        (hotel.email && hotel.email.toLowerCase().includes(q)) ||
        (hotel.description && hotel.description.toLowerCase().includes(q)) ||
        (hotel.starCategory !== undefined && `${hotel.starCategory} star`.includes(q)) ||
        (hotel.starCategory !== undefined && `${hotel.starCategory}★`.includes(q)) ||
        (hotel.starCategory !== undefined && String(hotel.starCategory) === q) ||
        (hotel.amenities && hotel.amenities.some((am) => am.toLowerCase().includes(q))) ||
        supplierName.includes(q)

      // 2. Status filter
      const matchesStatus =
        statusFilter === "all" || hotel.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [hotels, suppliers, searchQuery, statusFilter])

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
                <HotelIcon className="h-3 w-3 text-indigo-500" />
                Hotel Inventory
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {hotels.length} contracted properties
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Hotels & Resorts
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Manage room categories, star ratings, amenities and seasonal contracted meal plan rates
              </span>
            </div>

            {/* Micro-Telemetry Stat Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-950">{stats.active}</span> Active Tariffs
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 font-medium border border-amber-100/60">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                <span className="font-bold text-amber-950">{stats.luxury}</span> 5-Star Luxury
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-800 font-medium border border-blue-100/60">
                <BedDouble className="h-3 w-3 text-blue-600" />
                <span className="font-bold text-blue-950">{stats.totalRooms}</span> Room Types
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            <Button
              onClick={() => router.push("/hotels/new")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              New Hotel
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
                  placeholder="Search by hotel name, destination, 5 star, amenities, supplier partner..."
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
                  { id: "all", label: "All Hotels" },
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
          {filteredHotels.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={HotelIcon}
                title={isFilterActive ? "No matching hotels found" : "No hotels in inventory"}
                description={
                  isFilterActive
                    ? "Try adjusting your search criteria or resetting filters."
                    : "Add properties, contracted room types, and seasonal meal plans to your inventory."
                }
                actionText={isFilterActive ? "Clear Search" : "New Hotel"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/hotels/new")}
              />
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[260px]">Property Name</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Destination</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Star Rating</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Supplier Partner</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Rooms & Rates</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Status</TableHead>
                      <TableHead className="py-3 px-4 w-[60px] text-right font-bold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHotels.map((hotel) => {
                      const supplier = suppliers.find((s) => s.id === hotel.supplierId)
                      const rooms = hotelRooms.filter((r) => r.hotelId === hotel.id)
                      const rates = hotelRates.filter((rt) => rt.hotelId === hotel.id)

                      return (
                        <TableRow
                          key={hotel.id}
                          onClick={() => router.push(`/hotels/${hotel.id}`)}
                          className="hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80"
                        >
                          <TableCell className="py-3.5 px-4 font-medium text-slate-900">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs shrink-0">
                                <HotelIcon className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                  {hotel.name}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  ID: {hotel.id}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50/60 text-indigo-900 border border-indigo-100/60">
                              <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
                              <span className="truncate max-w-[130px]">{hotel.destination}</span>
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            {hotel.starCategory ? (
                              <div className="flex items-center gap-1 text-amber-500 font-semibold text-xs">
                                {Array.from({ length: hotel.starCategory }).map((_, i) => (
                                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                                ))}
                                <span className="ml-1 text-slate-600 text-[11px]">{hotel.starCategory}★</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">Standard</span>
                            )}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-xs font-medium text-slate-700">
                            {supplier?.name || "Direct Contract"}
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700 text-[11px]">
                                {rooms.length} {rooms.length === 1 ? "Room" : "Rooms"}
                              </span>
                              <span className="bg-indigo-50 px-2 py-0.5 rounded font-semibold text-indigo-700 text-[11px]">
                                {rates.length} {rates.length === 1 ? "Rate" : "Rates"}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <Badge
                              variant="outline"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-full ${
                                hotel.status === "Active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                  : hotel.status === "Inactive"
                                  ? "bg-amber-50 text-amber-700 border-amber-200/60"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  hotel.status === "Active"
                                    ? "bg-emerald-500"
                                    : hotel.status === "Inactive"
                                    ? "bg-amber-500"
                                    : "bg-slate-400"
                                }`}
                              />
                              <span>{hotel.status}</span>
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
                                  <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">Hotel</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => router.push(`/hotels/${hotel.id}`)} className="text-xs cursor-pointer rounded-md">
                                    <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                    Manage Rooms & Rates
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
                {filteredHotels.map((hotel) => {
                  const rooms = hotelRooms.filter((r) => r.hotelId === hotel.id)

                  return (
                    <div
                      key={hotel.id}
                      onClick={() => router.push(`/hotels/${hotel.id}`)}
                      className="p-4 space-y-3 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs truncate">{hotel.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {hotel.id}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            hotel.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {hotel.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-lg text-xs">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Destination</span>
                          <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-indigo-500" />
                            {hotel.destination}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Room Types</span>
                          <span className="font-semibold text-slate-800 mt-0.5 block">{rooms.length} Categories</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>{hotel.starCategory ? `${hotel.starCategory} Star Property` : "Standard Hotel"}</span>
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
              Showing <strong className="text-slate-800">{filteredHotels.length}</strong> of{" "}
              <strong className="text-slate-800">{hotels.length}</strong> properties
            </span>
            <span className="text-[11px] text-slate-400">
              TripDesk Accommodations Database
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
