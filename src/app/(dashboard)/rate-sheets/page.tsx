"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  FileSpreadsheet,
  Plus,
  Search,
  Calendar,
  Sparkles,
  Building2,
  FileUp,
  FileCheck,
  RotateCcw,
  X,
  Eye,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
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
import { RateSheet, RateSheetStatus, RateSheetSourceType } from "@/types"

export default function RateSheetsPage() {
  const router = useRouter()
  const { rateSheets, suppliers, hotelRates } = useInventory()

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
      all: rateSheets.length,
      Active: 0,
      Draft: 0,
      Expired: 0,
      Archived: 0,
    }
    rateSheets.forEach((rs) => {
      if (counts[rs.status] !== undefined) {
        counts[rs.status]++
      }
    })
    return counts
  }, [rateSheets])

  // Key KPI numbers
  const stats = React.useMemo(() => {
    const total = rateSheets.length
    const active = rateSheets.filter((rs) => rs.status === "Active").length
    const excelImports = rateSheets.filter((rs) => rs.sourceType === "Excel" || rs.sourceType === "CSV").length
    const totalRates = hotelRates.length

    return { total, active, excelImports, totalRates }
  }, [rateSheets, hotelRates])

  const filteredSheets = React.useMemo(() => {
    return rateSheets.filter((rs) => {
      const q = searchQuery.toLowerCase().trim()
      const supplier = suppliers.find((s) => s.id === rs.supplierId)
      const supplierName = supplier ? supplier.name.toLowerCase() : ""

      // 1. Multi-column search
      const matchesSearch =
        !q ||
        rs.name.toLowerCase().includes(q) ||
        rs.id.toLowerCase().includes(q) ||
        (rs.fileName && rs.fileName.toLowerCase().includes(q)) ||
        (rs.sourceType && rs.sourceType.toLowerCase().includes(q)) ||
        (rs.description && rs.description.toLowerCase().includes(q)) ||
        supplierName.includes(q)

      // 2. Status filter
      const matchesStatus = statusFilter === "all" || rs.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [rateSheets, suppliers, searchQuery, statusFilter])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
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
                <FileSpreadsheet className="h-3 w-3 text-indigo-500" />
                Contracts & Tariffs
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {rateSheets.length} rate contracts
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Rate Sheets & Excel Tariffs
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Upload supplier contract Excel/CSV sheets, manage validity periods and bulk meal plan tariffs
              </span>
            </div>

            {/* Micro-Telemetry Stat Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-950">{stats.active}</span> Valid Active Tariffs
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-800 font-medium border border-blue-100/60">
                <FileUp className="h-3 w-3 text-blue-600" />
                <span className="font-bold text-blue-950">{stats.excelImports}</span> Excel / CSV Spreadsheets
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-medium border border-indigo-100/60">
                <Sparkles className="h-3 w-3 text-indigo-600" />
                <span className="font-bold text-indigo-950">{stats.totalRates}</span> B2B Rates Loaded
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            <Button
              onClick={() => router.push("/rate-sheets/new")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              New Rate Sheet
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
                  placeholder="Search by contract name, file name (.xlsx/.csv), supplier partner, format..."
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
                  { id: "all", label: "All Rate Sheets" },
                  { id: "Active", label: "Active" },
                  { id: "Draft", label: "Draft" },
                  { id: "Expired", label: "Expired" },
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
          {filteredSheets.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={FileSpreadsheet}
                title={isFilterActive ? "No matching rate sheets found" : "No rate sheets yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search criteria or resetting filters."
                    : "Upload supplier contract Excel/CSV files to populate B2B hotel rates in bulk."
                }
                actionText={isFilterActive ? "Clear Search" : "New Rate Sheet"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/rate-sheets/new")}
              />
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[260px]">Rate Sheet Contract</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Supplier Partner</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Source Format</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Validity Period</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Loaded Rates</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Status</TableHead>
                      <TableHead className="py-3 px-4 w-[60px] text-right font-bold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSheets.map((rs) => {
                      const supplier = suppliers.find((s) => s.id === rs.supplierId)
                      const ratesCount = hotelRates.filter((r) => r.rateSheetId === rs.id).length

                      return (
                        <TableRow
                          key={rs.id}
                          onClick={() => router.push(`/rate-sheets/${rs.id}`)}
                          className="hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80"
                        >
                          <TableCell className="py-3.5 px-4 font-medium text-slate-900">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-2xs shrink-0">
                                <FileSpreadsheet className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                  {rs.name}
                                </span>
                                {rs.fileName && (
                                  <span className="text-[11px] text-slate-500 font-mono truncate max-w-[200px]">
                                    {rs.fileName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-xs font-medium text-slate-700">
                            {supplier?.name || "Direct / Internal"}
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/50">
                              {rs.sourceType}
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>
                                {formatDate(rs.validFrom)} - {formatDate(rs.validTo)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-3.5 px-4 text-xs">
                            <span className="bg-indigo-50 px-2 py-0.5 rounded font-semibold text-indigo-700 text-[11px]">
                              {ratesCount} {ratesCount === 1 ? "Rate" : "Rates"}
                            </span>
                          </TableCell>

                          <TableCell className="py-3.5 px-4">
                            <Badge
                              variant="outline"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-full ${
                                rs.status === "Active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                  : rs.status === "Draft"
                                  ? "bg-amber-50 text-amber-700 border-amber-200/60"
                                  : rs.status === "Expired"
                                  ? "bg-rose-50 text-rose-700 border-rose-200/60"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  rs.status === "Active"
                                    ? "bg-emerald-500"
                                    : rs.status === "Draft"
                                    ? "bg-amber-500"
                                    : rs.status === "Expired"
                                    ? "bg-rose-500"
                                    : "bg-slate-400"
                                }`}
                              />
                              <span>{rs.status}</span>
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
                                  <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">Rate Sheet</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => router.push(`/rate-sheets/${rs.id}`)} className="text-xs cursor-pointer rounded-md">
                                    <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                    View Rates
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
                {filteredSheets.map((rs) => {
                  const ratesCount = hotelRates.filter((r) => r.rateSheetId === rs.id).length

                  return (
                    <div
                      key={rs.id}
                      onClick={() => router.push(`/rate-sheets/${rs.id}`)}
                      className="p-4 space-y-3 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs truncate">{rs.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{rs.sourceType} Format</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            rs.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {rs.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-lg text-xs">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Validity</span>
                          <span className="font-semibold text-slate-800 mt-0.5 block">{formatDate(rs.validFrom)} - {formatDate(rs.validTo)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Rates Imported</span>
                          <span className="font-semibold text-indigo-600 mt-0.5 block">{ratesCount} Rates</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>{rs.fileName || "Manual Entry Tariff"}</span>
                        <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                          View <ArrowUpRight className="h-3 w-3" />
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
              Showing <strong className="text-slate-800">{filteredSheets.length}</strong> of{" "}
              <strong className="text-slate-800">{rateSheets.length}</strong> rate sheets
            </span>
            <span className="text-[11px] text-slate-400">
              TripDesk Tariff Engine
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
