"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  Plus,
  Search,
  Users,
  RotateCcw,
  X,
  Eye,
  MoreVertical,
  Archive,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Phone,
  UserCheck,
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
import { vehicleClient } from "@/lib/api-client";
import { Vehicle } from "@prisma/client";
import { toast } from "sonner";

export default function VehiclesPage() {
  const router = useRouter();

  // Data states
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [archivingId, setArchivingId] = React.useState<string | null>(null);

  // Filter & Search states
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
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

  // Fetch real vehicles from API
  const fetchVehicles = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await vehicleClient.getVehicles({
        search: debouncedSearch || undefined,
        page,
        limit: 20,
      });

      if (res.success && res.data) {
        setVehicles(res.data);
        setPagination(res.meta);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load vehicles from database.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  React.useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  };

  const isFilterActive = search.trim() !== "";

  // Archive Vehicle
  const handleArchive = async (id: string, name: string) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Modifications are restricted to read-only mode.");
      return;
    }

    if (!confirm(`Archive vehicle "${name}"? This soft-deletes the record while keeping historical trip assignments safe.`)) {
      return;
    }

    try {
      setArchivingId(id);
      await vehicleClient.archiveVehicle(id);
      toast.success(`Vehicle "${name}" archived successfully.`);
      await fetchVehicles();
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
        toast.error("Subscription expired. Read-only mode is active.");
      } else {
        toast.error(err?.message || "Failed to archive vehicle.");
      }
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Vehicle Fleet" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Left Title & Telemetry */}
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Car className="h-3 w-3 text-indigo-500" />
                Fleet & Mobility
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {pagination.total} vehicles registered
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Vehicles & Transport
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Manage sedans, SUVs, tempo travellers, chauffeur details, and vehicle tariffs
              </span>
            </div>

            {/* Micro-Telemetry Stat Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                <Car className="h-3 w-3 text-emerald-600" />
                <span className="font-bold text-emerald-950">{pagination.total}</span> Fleet Units
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100/80 text-slate-700 font-medium">
                <span>Page</span>
                <strong className="text-slate-900">{pagination.page}</strong>
                <span>of</span>
                <strong className="text-slate-900">{pagination.totalPages}</strong>
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            <Button
              onClick={() => router.push("/vehicles/new")}
              disabled={isReadOnly}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </div>
        </div>

        {/* Master Card (Filter Bar + Table) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Search Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3.5 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search vehicles by name, type, registration number, or driver..."
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
                  className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 shrink-0 cursor-pointer font-semibold rounded-lg"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset Filter
                </Button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-16 text-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Fetching vehicles from database...</p>
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
                onClick={() => fetchVehicles()}
                className="text-xs h-8 rounded-lg cursor-pointer"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Table Content */}
          {!loading && !error && vehicles.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={Car}
                title={isFilterActive ? "No matching vehicles found" : "No vehicle fleet registered yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search query."
                    : "Add your first vehicle model or transport option to assign it to travel itineraries."
                }
                actionText={isFilterActive ? "Clear Filter" : "Add Vehicle"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/vehicles/new")}
              />
            </div>
          ) : !loading && !error && (
            <div className="overflow-hidden">
              <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[300px]">Vehicle & Type</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Capacity</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Registration</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Driver Contact</TableHead>
                      <TableHead className="py-3 px-4 w-[80px] text-right font-bold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicles.map((v) => (
                      <TableRow
                        key={v.id}
                        onClick={() => router.push(`/vehicles/${v.id}`)}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80"
                      >
                        <TableCell className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center border border-emerald-100 shrink-0">
                              <Car className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                {v.name}
                              </span>
                              <span className="text-[10px] text-slate-500">{v.type}</span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-xs text-slate-700">
                            <Users className="h-3.5 w-3.5 text-slate-400" />
                            <span>{v.capacity} Seats</span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <span className="text-xs font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {v.registrationNumber || "Unassigned"}
                          </span>
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5 text-xs text-slate-600">
                            {v.driverName ? (
                              <span className="font-medium text-slate-800">{v.driverName}</span>
                            ) : (
                              <span className="text-slate-400">Self-drive / Assigned on booking</span>
                            )}
                            {v.driverPhone && (
                              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {v.driverPhone}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
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
                                  Vehicle Options
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/vehicles/${v.id}`)}
                                  className="text-xs cursor-pointer rounded-md"
                                >
                                  <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleArchive(v.id, v.name)}
                                  disabled={isReadOnly || archivingId === v.id}
                                  className="text-xs text-rose-600 hover:bg-rose-50 cursor-pointer rounded-md disabled:opacity-50"
                                >
                                  <Archive className="mr-2 h-3.5 w-3.5 text-rose-500" />
                                  {archivingId === v.id ? "Archiving..." : "Archive Vehicle"}
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="block lg:hidden divide-y divide-slate-100">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => router.push(`/vehicles/${v.id}`)}
                    className="p-4 space-y-2.5 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{v.name}</h4>
                        <p className="text-[11px] text-slate-500">{v.type} • {v.capacity} Seats</p>
                      </div>
                      {v.registrationNumber && (
                        <Badge variant="outline" className="text-[10px] font-mono bg-slate-50">
                          {v.registrationNumber}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Master Footer with Pagination */}
          <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{vehicles.length}</strong> of{" "}
              <strong className="text-slate-800">{pagination.total}</strong> vehicles
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
