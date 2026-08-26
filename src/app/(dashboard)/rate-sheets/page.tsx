"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Archive,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Hotel,
  Car,
  Ticket,
  Truck,
  IndianRupee,
  HelpCircle,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rateSheetClient, RateSheetWithRelations, MatchedRateResult } from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";

export default function RateSheetsPage() {
  const router = useRouter();

  // Data states
  const [rateSheets, setRateSheets] = React.useState<RateSheetWithRelations[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Search & Filter states
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [includeArchived, setIncludeArchived] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Debounce search (300ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Rate Sheets from PostgreSQL API
  const fetchRateSheets = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await rateSheetClient.getRateSheets({
        search: debouncedSearch || undefined,
        inventoryType: typeFilter !== "ALL" ? (typeFilter as any) : undefined,
        status: statusFilter !== "ALL" ? (statusFilter as any) : undefined,
        includeArchived,
        page,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (res.success && res.data) {
        setRateSheets(res.data);
        setPagination(res.meta);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load rate sheets from database.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter, statusFilter, includeArchived, page]);

  React.useEffect(() => {
    fetchRateSheets();
  }, [fetchRateSheets]);

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setIncludeArchived(false);
    setPage(1);
  };

  const isFilterActive =
    search.trim() !== "" || typeFilter !== "ALL" || statusFilter !== "ALL" || includeArchived;

  // Handle Archive
  const handleArchive = async (id: string, name: string, number?: string | null) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    const ref = number ? `${number} (${name})` : name;
    if (!confirm(`Archive rate sheet ${ref}? Historical quotations will remain intact.`)) {
      return;
    }

    try {
      await rateSheetClient.archiveRateSheet(id);
      toast.success(`Rate sheet ${ref} archived.`);
      await fetchRateSheets();
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive rate sheet.");
    }
  };

  const formatDateDisplay = (date: Date | string | null | undefined) => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Telemetry
  const totalRates = pagination.total;
  const activeRates = React.useMemo(
    () => rateSheets.filter((r) => r.status === "ACTIVE" && !r.archivedAt).length,
    [rateSheets]
  );
  const hotelTariffs = React.useMemo(
    () => rateSheets.filter((r) => r.inventoryType === "HOTEL").length,
    [rateSheets]
  );
  const transportTariffs = React.useMemo(
    () => rateSheets.filter((r) => r.inventoryType === "VEHICLE").length,
    [rateSheets]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Rate Sheets" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-purple-50/70 via-purple-50/20 to-transparent pointer-events-none" />

          {/* Title & Info */}
          <div className="space-y-2 z-10">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-purple-50 text-purple-700 border border-purple-100">
                <Sparkles className="h-3 w-3 text-purple-500" />
                Commercial Tariffs
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {pagination.total} contracted rate sheets
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Rate Sheets & Supplier Tariffs
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Central purchase rate engine for hotels, vehicles, and activities with seasonal validity
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            <Button
              onClick={() => router.push("/rate-sheets/new")}
              disabled={isReadOnly}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9.5 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Rate Sheet
            </Button>
          </div>
        </div>

        {/* KPI Telemetry Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Tariffs</span>
              <h4 className="text-lg font-black text-slate-900">{totalRates}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Active Status</span>
              <h4 className="text-lg font-black text-emerald-700">{activeRates}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Hotel className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Hotel Rates</span>
              <h4 className="text-lg font-black text-slate-900">{hotelTariffs}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Fleet Rates</span>
              <h4 className="text-lg font-black text-slate-900">{transportTariffs}</h4>
            </div>
          </div>
        </div>

        {/* Master Card (Search & Table) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Search Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3.5 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by rate #, tariff name, inventory item, room type, season, supplier..."
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

              {/* Type Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "ALL", label: "All Items" },
                  { id: "HOTEL", label: "Hotels" },
                  { id: "VEHICLE", label: "Vehicles" },
                  { id: "ACTIVITY", label: "Activities" },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setTypeFilter(type.id);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      typeFilter === type.id
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/60"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(e) => setIncludeArchived(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Show Archived</span>
                </label>

                {isFilterActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 shrink-0 cursor-pointer font-semibold rounded-lg"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-16 text-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Fetching rate sheets...</p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-12 text-center space-y-3">
              <div className="h-10 w-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchRateSheets()}
                className="text-xs h-8 rounded-lg cursor-pointer"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Table View */}
          {!loading && !error && rateSheets.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={FileSpreadsheet}
                title={isFilterActive ? "No matching rate sheets found" : "No rate sheets registered yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search criteria."
                    : "Add supplier rate sheets for hotels, vehicles, and activities with seasonal validity to automate trip costing."
                }
                actionText={isFilterActive ? "Clear Filter" : "Add First Rate Sheet"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/rate-sheets/new")}
              />
            </div>
          ) : !loading && !error && (
            <div>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[240px]">Tariff / Sheet #</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Inventory Item</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Supplier / Vendor</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Season & Validity</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Purchase Cost</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Priority & Status</TableHead>
                      <TableHead className="py-3 px-4 w-[80px] text-right font-bold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateSheets.map((rs) => {
                      const isArchived = Boolean(rs.archivedAt);
                      const isExpired = new Date(rs.validTo) < new Date();

                      return (
                        <TableRow
                          key={rs.id}
                          onClick={() => router.push(`/rate-sheets/${rs.id}`)}
                          className={`hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80 ${
                            isArchived ? "opacity-60 bg-slate-50/40" : ""
                          }`}
                        >
                          {/* Name & Rate Number */}
                          <TableCell className="py-3 px-4 font-medium text-slate-900">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-100">
                                {rs.inventoryType === "HOTEL" ? (
                                  <Hotel className="h-4 w-4" />
                                ) : rs.inventoryType === "VEHICLE" ? (
                                  <Car className="h-4 w-4" />
                                ) : (
                                  <Ticket className="h-4 w-4" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                    {rs.name}
                                  </span>
                                  {isArchived && (
                                    <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-200">
                                      Archived
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {rs.rateSheetNumber || "RAT-LEGACY"}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Inventory Item Link */}
                          <TableCell className="py-3 px-4 text-xs text-slate-700">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">
                                {rs.hotel?.name || rs.vehicle?.name || rs.activity?.name || "Generic Tariff"}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {rs.roomType ? `${rs.roomType} • ${rs.mealPlan || "CP"}` : rs.vehiclePricingType ? `Pricing: ${rs.vehiclePricingType}` : rs.inventoryType}
                              </span>
                            </div>
                          </TableCell>

                          {/* Supplier */}
                          <TableCell className="py-3 px-4 text-xs text-slate-600">
                            {rs.supplier ? (
                              <span className="font-semibold text-slate-800">{rs.supplier.name}</span>
                            ) : (
                              <span className="text-slate-400 italic">Direct / In-house</span>
                            )}
                          </TableCell>

                          {/* Season & Dates */}
                          <TableCell className="py-3 px-4 text-xs text-slate-600">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{rs.seasonName || "Regular Season"}</span>
                              <span className="text-[11px] text-slate-500">
                                {formatDateDisplay(rs.validFrom)} → {formatDateDisplay(rs.validTo)}
                              </span>
                            </div>
                          </TableCell>

                          {/* Cost Price */}
                          <TableCell className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="font-black text-emerald-700 text-xs">
                                {formatCurrency(Number(rs.costPrice))}
                                {rs.inventoryType === "HOTEL" ? " / night" : rs.inventoryType === "VEHICLE" && rs.ratePerKm ? " / km" : ""}
                              </span>
                              {rs.extraAdultRate && (
                                <span className="text-[10px] text-slate-500">
                                  Ex Adult: {formatCurrency(Number(rs.extraAdultRate))}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* Priority & Status */}
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px] font-mono font-bold bg-slate-50">
                                P-{rs.priority}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  isExpired
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : rs.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                }`}
                              >
                                {isExpired ? "EXPIRED" : rs.status}
                              </Badge>
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                }
                              />
                              <DropdownMenuContent align="end" className="bg-white border border-slate-200 shadow-md rounded-xl p-1 w-44">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">
                                    Actions
                                  </DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => router.push(`/rate-sheets/${rs.id}`)}
                                    className="text-xs cursor-pointer rounded-md"
                                  >
                                    <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                    View Details
                                  </DropdownMenuItem>

                                  {!isArchived && (
                                    <DropdownMenuItem
                                      onClick={() => handleArchive(rs.id, rs.name, rs.rateSheetNumber)}
                                      disabled={isReadOnly}
                                      className="text-xs text-rose-600 hover:bg-rose-50 cursor-pointer rounded-md"
                                    >
                                      <Archive className="mr-2 h-3.5 w-3.5 text-rose-500" />
                                      Archive Rate
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="block lg:hidden divide-y divide-slate-100">
                {rateSheets.map((rs) => (
                  <div
                    key={rs.id}
                    onClick={() => router.push(`/rate-sheets/${rs.id}`)}
                    className="p-4 space-y-2 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{rs.name}</h4>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {rs.rateSheetNumber || "RAT"} • {rs.inventoryType}
                        </p>
                      </div>
                      <span className="font-black text-emerald-700 text-xs">
                        {formatCurrency(Number(rs.costPrice))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                      <span>{rs.seasonName || "Season"}</span>
                      <span>•</span>
                      <span>{formatDateDisplay(rs.validFrom)} - {formatDateDisplay(rs.validTo)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Master Footer with Pagination */}
          <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{rateSheets.length}</strong> of{" "}
              <strong className="text-slate-800">{pagination.total}</strong> rate sheets
            </span>

            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
                </Button>
                <span className="text-xs font-bold text-slate-700 px-1">
                  {page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages || loading}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
                >
                  Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
