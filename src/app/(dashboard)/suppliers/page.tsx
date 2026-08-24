"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Truck,
  Plus,
  Search,
  Hotel,
  Car,
  Ticket,
  MoreVertical,
  Mail,
  Phone,
  Building2,
  ExternalLink,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  X,
  Eye,
  ArrowUpRight,
  ShieldCheck,
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
import { Supplier, SupplierService, SupplierStatus } from "@/types"

const AVATAR_GRADIENTS = [
  "from-blue-600 to-indigo-700",
  "from-emerald-600 to-teal-700",
  "from-violet-600 to-purple-700",
  "from-amber-600 to-orange-700",
  "from-rose-600 to-pink-700",
]

function getInitials(name: string) {
  if (!name) return "S"
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

export default function SuppliersPage() {
  const router = useRouter()
  const { suppliers, hotels, vehicles, activities, rateSheets } = useInventory()

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
      all: suppliers.length,
      Active: 0,
      Inactive: 0,
    }
    suppliers.forEach((s) => {
      if (counts[s.status] !== undefined) {
        counts[s.status]++
      }
    })
    return counts
  }, [suppliers])

  // Key KPI numbers
  const stats = React.useMemo(() => {
    const total = suppliers.length
    const active = suppliers.filter((s) => s.status === "Active").length
    const hotelVendors = suppliers.filter((s) => s.services.includes("Hotel")).length
    const transportVendors = suppliers.filter((s) => s.services.includes("Vehicle")).length

    return { total, active, hotelVendors, transportVendors }
  }, [suppliers])

  // Filter suppliers
  const filteredSuppliers = React.useMemo(() => {
    return suppliers.filter((sup) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        sup.name.toLowerCase().includes(q) ||
        (sup.contactPerson && sup.contactPerson.toLowerCase().includes(q)) ||
        (sup.city && sup.city.toLowerCase().includes(q)) ||
        (sup.email && sup.email.toLowerCase().includes(q)) ||
        (sup.phone && sup.phone.includes(q)) ||
        (sup.type && sup.type.toLowerCase().includes(q)) ||
        (sup.notes && sup.notes.toLowerCase().includes(q)) ||
        (sup.website && sup.website.toLowerCase().includes(q)) ||
        sup.services.some((s) => s.toLowerCase().includes(q)) ||
        sup.id.toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === "all" || sup.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [suppliers, searchQuery, statusFilter])

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
                <Truck className="h-3 w-3 text-indigo-500" />
                Vendor Management
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {suppliers.length} contracted partners
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Suppliers & Partners
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Manage B2B hoteliers, vehicle transporters, and local destination DMCs
              </span>
            </div>

            {/* Micro-Telemetry Stat Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-950">{stats.active}</span> Verified Active
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-800 font-medium border border-blue-100/60">
                <Hotel className="h-3 w-3 text-blue-600" />
                <span className="font-bold text-blue-950">{stats.hotelVendors}</span> Hoteliers
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 text-amber-800 font-medium border border-amber-100/60">
                <Car className="h-3 w-3 text-amber-600" />
                <span className="font-bold text-amber-950">{stats.transportVendors}</span> Fleet Transporters
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            <Button
              onClick={() => router.push("/suppliers/new")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              New Supplier
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
                  placeholder="Search by supplier name, contact person, city, phone, email, partner type..."
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
                  { id: "all", label: "All Suppliers" },
                  { id: "Active", label: "Active" },
                  { id: "Inactive", label: "Inactive" },
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
          {filteredSuppliers.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={Truck}
                title={isFilterActive ? "No matching suppliers found" : "No suppliers yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search criteria or resetting filters."
                    : "Add your first hotel supplier, cab vendor or DMC partner to manage B2B contracted rates."
                }
                actionText={isFilterActive ? "Clear Search" : "New Supplier"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/suppliers/new")}
              />
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[260px]">Supplier / Company</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Partner Type</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Services Offered</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Contact Person</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Location</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Status</TableHead>
                      <TableHead className="py-3 px-4 w-[60px] text-right font-bold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((sup) => {
                      const gradient = getGradient(sup.name)

                      return (
                        <TableRow
                          key={sup.id}
                          onClick={() => router.push(`/suppliers/${sup.id}`)}
                          className="hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80"
                        >
                          <TableCell className="py-3.5 px-4 font-medium text-slate-900">
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${gradient} text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0`}>
                                {getInitials(sup.name)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                  {sup.name}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  ID: {sup.id}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/50">
                              {sup.type}
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1">
                              {sup.services.map((srv) => {
                                const srvColors: Record<string, string> = {
                                  Hotel: "bg-blue-50 text-blue-700 border-blue-200/60",
                                  Vehicle: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
                                  Activity: "bg-purple-50 text-purple-700 border-purple-200/60",
                                  Package: "bg-amber-50 text-amber-700 border-amber-200/60",
                                  Other: "bg-slate-100 text-slate-700 border-slate-200/60",
                                }
                                return (
                                  <Badge
                                    key={srv}
                                    variant="outline"
                                    className={`text-[10px] px-1.5 py-0 font-medium ${srvColors[srv] || srvColors.Other}`}
                                  >
                                    {srv}
                                  </Badge>
                                )
                              })}
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <div className="flex flex-col text-xs">
                              <span className="font-medium text-slate-800">{sup.contactPerson || "—"}</span>
                              {sup.phone && (
                                <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Phone className="h-2.5 w-2.5 text-slate-400" />
                                  {sup.phone}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-xs font-medium text-slate-600">
                            {sup.city || "—"}
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <Badge
                              variant="outline"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-full ${
                                sup.status === "Active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  sup.status === "Active" ? "bg-emerald-500" : "bg-slate-400"
                                }`}
                              />
                              <span>{sup.status}</span>
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
                                  <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">Supplier</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => router.push(`/suppliers/${sup.id}`)} className="text-xs cursor-pointer rounded-md">
                                    <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                    View Details
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
                {filteredSuppliers.map((sup) => {
                  const gradient = getGradient(sup.name)

                  return (
                    <div
                      key={sup.id}
                      onClick={() => router.push(`/suppliers/${sup.id}`)}
                      className="p-4 space-y-3 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${gradient} text-white font-bold text-xs flex items-center justify-center shrink-0`}>
                            {getInitials(sup.name)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-xs truncate">{sup.name}</h4>
                            <p className="text-[11px] text-slate-500 truncate">{sup.type}</p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            sup.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {sup.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {sup.services.map((s) => (
                          <span key={s} className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600">
                            {s}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>{sup.city || "No location specified"}</span>
                        <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                          Details <ArrowUpRight className="h-3 w-3" />
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
              Showing <strong className="text-slate-800">{filteredSuppliers.length}</strong> of{" "}
              <strong className="text-slate-800">{suppliers.length}</strong> partners
            </span>
            <span className="text-[11px] text-slate-400">
              TripDesk Supplier Network • B2B Contracts
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
