"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import {
  customerClient,
  CustomerWithCounts,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Users,
  Search,
  Plus,
  MoreVertical,
  Eye,
  Phone,
  Mail,
  MapPin,
  RotateCcw,
  X,
  Compass,
  Archive,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Inbox,
  CheckCircle2,
  IndianRupee,
  Building,
} from "lucide-react";
import { toast } from "sonner";

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
];

function getInitials(name: string) {
  if (!name) return "C";
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

export default function CustomersPage() {
  const router = useRouter();

  // Data states
  const [customers, setCustomers] = React.useState<CustomerWithCounts[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Search & Filter states
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [cityFilter, setCityFilter] = React.useState("");
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

  // Fetch real customers from PostgreSQL API
  const fetchCustomers = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await customerClient.getCustomers({
        search: debouncedSearch || undefined,
        city: cityFilter || undefined,
        includeArchived,
        page,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (res.success && res.data) {
        setCustomers(res.data);
        setPagination(res.meta);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load customers from database.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, cityFilter, includeArchived, page]);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCityFilter("");
    setIncludeArchived(false);
    setPage(1);
  };

  const isFilterActive = search.trim() !== "" || cityFilter !== "" || includeArchived;

  // Archive Customer
  const handleArchive = async (id: string, name: string, customerNumber?: string | null) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Read-only mode is active.");
      return;
    }

    const ref = customerNumber ? `${customerNumber} (${name})` : name;
    if (!confirm(`Archive customer ${ref}? Historical trips and bookings will remain intact.`)) {
      return;
    }

    try {
      await customerClient.archiveCustomer(id);
      toast.success(`Customer ${ref} archived successfully.`);
      await fetchCustomers();
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive customer.");
    }
  };

  // Telemetry Aggregates
  const totalCustomers = pagination.total;
  const totalEnquiries = React.useMemo(
    () => customers.reduce((sum, c) => sum + (c._count?.enquiries || 0), 0),
    [customers]
  );
  const totalTrips = React.useMemo(
    () => customers.reduce((sum, c) => sum + (c._count?.trips || 0), 0),
    [customers]
  );
  const totalBookings = React.useMemo(
    () => customers.reduce((sum, c) => sum + (c._count?.bookings || 0), 0),
    [customers]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Customer Directory" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Title & Info */}
          <div className="space-y-2 z-10">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-100">
                <Users className="h-3 w-3 text-blue-500" />
                Customer 360
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {pagination.total} registered travelers & clients
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Customers & Profiles
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Unified customer directory with multi-module history, lifetime value, and CRM timelines
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            <Button
              onClick={() => router.push("/customers/new")}
              disabled={isReadOnly}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9.5 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* KPI Telemetry Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Clients</span>
              <h4 className="text-lg font-black text-slate-900">{totalCustomers}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Inquiries Generated</span>
              <h4 className="text-lg font-black text-slate-900">{totalEnquiries}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Trips Planned</span>
              <h4 className="text-lg font-black text-slate-900">{totalTrips}</h4>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Confirmed Bookings</span>
              <h4 className="text-lg font-black text-emerald-700">{totalBookings}</h4>
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
                  placeholder="Search by customer #, name, phone, alternate phone, email, city..."
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
              <p className="text-xs text-slate-500 font-medium">Fetching customer directory...</p>
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
                onClick={() => fetchCustomers()}
                className="text-xs h-8 rounded-lg cursor-pointer"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Table View */}
          {!loading && !error && customers.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={Users}
                title={isFilterActive ? "No matching customers found" : "No customers registered yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search keywords."
                    : "Add clients to track their inquiries, trip itineraries, costing proposals, and booking payments."
                }
                actionText={isFilterActive ? "Clear Filter" : "Add First Customer"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/customers/new")}
              />
            </div>
          ) : !loading && !error && (
            <div>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[240px]">Customer</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Contact Details</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Location</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">History Matrix</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Source</TableHead>
                      <TableHead className="py-3 px-4 w-[80px] text-right font-bold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((c) => {
                      const isArchived = Boolean(c.archivedAt);

                      return (
                        <TableRow
                          key={c.id}
                          onClick={() => router.push(`/customers/${c.id}`)}
                          className={`hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80 ${
                            isArchived ? "opacity-60 bg-slate-50/40" : ""
                          }`}
                        >
                          {/* Name & Customer Number */}
                          <TableCell className="py-3 px-4 font-medium text-slate-900">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-8 w-8 rounded-full bg-gradient-to-tr ${getGradient(
                                  c.name
                                )} text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0`}
                              >
                                {getInitials(c.name)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                    {c.name}
                                  </span>
                                  {isArchived && (
                                    <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-200">
                                      Archived
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  {c.customerNumber || "CUS-LEGACY"}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Contact Info */}
                          <TableCell className="py-3 px-4 text-xs text-slate-600">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                                <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                                <span>{c.phone}</span>
                              </div>
                              {c.email && (
                                <div className="flex items-center gap-1.5 text-slate-500">
                                  <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{c.email}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* Location */}
                          <TableCell className="py-3 px-4 text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>{c.city || c.address || "—"}</span>
                            </div>
                          </TableCell>

                          {/* History Matrix Counts */}
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold text-[11px] border border-blue-100" title="Enquiries">
                                <Inbox className="h-3 w-3" /> {c._count?.enquiries || 0}
                              </span>
                              <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md font-bold text-[11px] border border-teal-100" title="Trips">
                                <Compass className="h-3 w-3" /> {c._count?.trips || 0}
                              </span>
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold text-[11px] border border-emerald-100" title="Bookings">
                                <CheckCircle2 className="h-3 w-3" /> {c._count?.bookings || 0}
                              </span>
                            </div>
                          </TableCell>

                          {/* Source */}
                          <TableCell className="py-3 px-4 text-xs text-slate-600">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                              {c.source || "Direct"}
                            </span>
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
                                    onClick={() => router.push(`/customers/${c.id}`)}
                                    className="text-xs cursor-pointer rounded-md"
                                  >
                                    <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                    View 360 Profile
                                  </DropdownMenuItem>

                                  {!isArchived && (
                                    <DropdownMenuItem
                                      onClick={() => handleArchive(c.id, c.name, c.customerNumber)}
                                      disabled={isReadOnly}
                                      className="text-xs text-rose-600 hover:bg-rose-50 cursor-pointer rounded-md"
                                    >
                                      <Archive className="mr-2 h-3.5 w-3.5 text-rose-500" />
                                      Archive Client
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
                {customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/customers/${c.id}`)}
                    className="p-4 space-y-2 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{c.name}</h4>
                        <p className="text-[11px] text-slate-500 font-mono">{c.customerNumber || "CUS-LEGACY"} • {c.phone}</p>
                      </div>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {c.city || "Client"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                      <span>{c._count?.trips || 0} Trips</span>
                      <span>•</span>
                      <span>{c._count?.bookings || 0} Bookings</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Master Footer with Pagination */}
          <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{customers.length}</strong> of{" "}
              <strong className="text-slate-800">{pagination.total}</strong> customers
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
