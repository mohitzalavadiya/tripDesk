"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Archive,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Users,
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
import { supplierClient, SupplierWithCounts } from "@/lib/api-client";
import { toast } from "sonner";

const AVATAR_GRADIENTS = [
  "from-blue-600 to-indigo-700",
  "from-emerald-600 to-teal-700",
  "from-violet-600 to-purple-700",
  "from-amber-600 to-orange-700",
  "from-rose-600 to-pink-700",
];

function getInitials(name: string) {
  if (!name) return "S";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export default function SuppliersPage() {
  const router = useRouter();

  // Data states
  const [suppliers, setSuppliers] = React.useState<SupplierWithCounts[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Search & Filter states
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
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

  // Fetch suppliers from PostgreSQL API
  const fetchSuppliers = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await supplierClient.getSuppliers({
        search: debouncedSearch || undefined,
        type: typeFilter !== "all" ? typeFilter : undefined,
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
        includeArchived,
        page,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (res.success && res.data) {
        setSuppliers(res.data);
        setPagination(res.meta);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load suppliers from database.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter, statusFilter, includeArchived, page]);

  React.useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setIncludeArchived(false);
    setPage(1);
  };

  const isFilterActive =
    search.trim() !== "" || typeFilter !== "all" || statusFilter !== "all" || includeArchived;

  // Handle Archive
  const handleArchive = async (id: string, name: string, code?: string | null) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    const ref = code ? `${code} (${name})` : name;
    if (!confirm(`Archive supplier ${ref}? Linked rate sheets and historical records remain intact.`)) {
      return;
    }

    try {
      await supplierClient.archiveSupplier(id);
      toast.success(`Supplier ${ref} archived successfully.`);
      await fetchSuppliers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive supplier.");
    }
  };

  // Handle Reactivate
  const handleReactivate = async (id: string, name: string, code?: string | null) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    const ref = code ? `${code} (${name})` : name;
    try {
      await supplierClient.reactivateSupplier(id);
      toast.success(`Supplier ${ref} reactivated successfully.`);
      await fetchSuppliers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reactivate supplier.");
    }
  };

  // Telemetry Aggregates
  const totalSuppliers = pagination.total;
  const activeSuppliers = React.useMemo(
    () => suppliers.filter((s) => s.status === "ACTIVE" && !s.archivedAt).length,
    [suppliers]
  );
  const totalRateSheets = React.useMemo(
    () => suppliers.reduce((sum, s) => sum + (s._count?.rateSheets || 0), 0),
    [suppliers]
  );
  const totalHotels = React.useMemo(
    () => suppliers.reduce((sum, s) => sum + (s._count?.hotels || 0), 0),
    [suppliers]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Supplier Directory" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Title & Info */}
          <div className="space-y-2 z-10">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Truck className="h-3 w-3 text-emerald-500" />
                Commercial Vendors
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {pagination.total} registered suppliers & DMCs
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Suppliers & Vendors
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Manage B2B partners, DMCs, hotel chains, fleet operators, and contracted rate sheets
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            <Button
              onClick={() => router.push("/suppliers/new")}
              disabled={isReadOnly}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9.5 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Supplier
            </Button>
          </div>
        </div>

        {/* KPI Telemetry Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Partners</span>
              <h4 className="text-lg font-black text-slate-900">{totalSuppliers}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Active Status</span>
              <h4 className="text-lg font-black text-emerald-700">{activeSuppliers}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Contracted Hotels</span>
              <h4 className="text-lg font-black text-slate-900">{totalHotels}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Active Rate Sheets</span>
              <h4 className="text-lg font-black text-purple-700">{totalRateSheets}</h4>
            </div>
          </div>
        </div>

        {/* Master Card (Search & Table) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Search Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3.5 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by supplier code, name, contact person, phone, email, city..."
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
              <p className="text-xs text-slate-500 font-medium">Fetching supplier directory...</p>
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
                onClick={() => fetchSuppliers()}
                className="text-xs h-8 rounded-lg cursor-pointer"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Table View */}
          {!loading && !error && suppliers.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={Truck}
                title={isFilterActive ? "No matching suppliers found" : "No suppliers registered yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search criteria."
                    : "Add B2B travel suppliers, DMCs, hotel chains, and fleet operators to maintain seasonal purchase rates."
                }
                actionText={isFilterActive ? "Clear Filter" : "Add First Supplier"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/suppliers/new")}
              />
            </div>
          ) : !loading && !error && (
            <div>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[260px]">Supplier / Vendor</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Category / Type</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Contact Person & Phone</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Location</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Rate Sheets</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Status</TableHead>
                      <TableHead className="py-3 px-4 w-[80px] text-right font-bold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((s) => {
                      const isArchived = Boolean(s.archivedAt);

                      return (
                        <TableRow
                          key={s.id}
                          onClick={() => router.push(`/suppliers/${s.id}`)}
                          className={`hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80 ${
                            isArchived ? "opacity-60 bg-slate-50/40" : ""
                          }`}
                        >
                          {/* Name & Code */}
                          <TableCell className="py-3 px-4 font-medium text-slate-900">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-8 w-8 rounded-full bg-gradient-to-tr ${getGradient(
                                  s.name
                                )} text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0`}
                              >
                                {getInitials(s.name)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                    {s.name}
                                  </span>
                                  {isArchived && (
                                    <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-200">
                                      Archived
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {s.supplierCode || "SUP-LEGACY"}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Type */}
                          <TableCell className="py-3 px-4 text-xs text-slate-700">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold">
                              {s.type || "Vendor"}
                            </span>
                          </TableCell>

                          {/* Contact */}
                          <TableCell className="py-3 px-4 text-xs text-slate-600">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                                <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                                <span>{s.phone || "—"}</span>
                              </div>
                              {s.contactPerson && (
                                <span className="text-[11px] text-slate-500 truncate">{s.contactPerson}</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Location */}
                          <TableCell className="py-3 px-4 text-xs text-slate-600">
                            <span>{s.city ? `${s.city}, ${s.state || s.country}` : "—"}</span>
                          </TableCell>

                          {/* Rate Sheets & Inventory Counts */}
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-bold text-[11px] border border-purple-100" title="Rate Sheets">
                                <Sparkles className="h-3 w-3" /> {s._count?.rateSheets || 0} Rates
                              </span>
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold text-[11px] border border-blue-100" title="Hotels">
                                <Hotel className="h-3 w-3" /> {s._count?.hotels || 0}
                              </span>
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                s.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {s.status}
                            </Badge>
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
                                    onClick={() => router.push(`/suppliers/${s.id}`)}
                                    className="text-xs cursor-pointer rounded-md"
                                  >
                                    <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                    View Supplier Profile
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => router.push(`/rate-sheets/new?supplierId=${s.id}`)}
                                    disabled={isReadOnly}
                                    className="text-xs cursor-pointer rounded-md text-indigo-600"
                                  >
                                    <Plus className="mr-2 h-3.5 w-3.5" />
                                    Add Rate Sheet
                                  </DropdownMenuItem>

                                  {isArchived || s.status === "INACTIVE" ? (
                                    <DropdownMenuItem
                                      onClick={() => handleReactivate(s.id, s.name, s.supplierCode)}
                                      disabled={isReadOnly}
                                      className="text-xs text-emerald-600 hover:bg-emerald-50 cursor-pointer rounded-md"
                                    >
                                      <RotateCcw className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                                      Reactivate Supplier
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => handleArchive(s.id, s.name, s.supplierCode)}
                                      disabled={isReadOnly}
                                      className="text-xs text-rose-600 hover:bg-rose-50 cursor-pointer rounded-md"
                                    >
                                      <Archive className="mr-2 h-3.5 w-3.5 text-rose-500" />
                                      Archive Supplier
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
                {suppliers.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => router.push(`/suppliers/${s.id}`)}
                    className="p-4 space-y-2 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{s.name}</h4>
                        <p className="text-[11px] text-slate-500 font-mono">{s.supplierCode || "SUP"} • {s.city || "Vendor"}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {s.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                      <span>{s._count?.rateSheets || 0} Rates</span>
                      <span>•</span>
                      <span>{s.type || "Supplier"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Master Footer with Pagination */}
          <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{suppliers.length}</strong> of{" "}
              <strong className="text-slate-800">{pagination.total}</strong> suppliers
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
