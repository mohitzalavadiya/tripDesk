"use client";

import * as React from "react";
import {
  MapPin,
  Plus,
  Search,
  RotateCcw,
  X,
  Edit2,
  MoreVertical,
  Trash2,
  Globe,
  Compass,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/loading-skeletons";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { StatusBadge } from "@/components/shared/status-badge";
import { DestinationDialog } from "@/components/destinations/destination-dialog";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { destinationClient } from "@/lib/api-client";
import { Destination, DestinationStatus } from "@prisma/client";
import { toast } from "sonner";

export default function DestinationsPage() {
  // Data states
  const [destinations, setDestinations] = React.useState<Destination[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Search & Filter states
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Modal states
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingDestination, setEditingDestination] = React.useState<Destination | null>(null);

  // Confirmation Dialog state
  const [confirmAction, setConfirmAction] = React.useState<{
    title: string;
    description: string;
    confirmText: string;
    variant?: "destructive" | "default" | "warning";
    action: () => Promise<void>;
  } | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  // Debounce search (300ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch destinations from API
  const fetchDestinations = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await destinationClient.getDestinations({
        search: debouncedSearch || undefined,
        status: statusFilter !== "ALL" ? (statusFilter as DestinationStatus) : undefined,
        page,
        limit: 20,
      });

      if (res.success && res.data) {
        setDestinations(res.data);
        setPagination(res.meta);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(getErrorMessage(err, "Unable to load destination catalog. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page]);

  React.useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("ALL");
    setPage(1);
  };

  const isFilterActive = search.trim() !== "" || statusFilter !== "ALL";

  // Open Create Modal
  const handleCreate = () => {
    if (isReadOnly) {
      toast.error("Subscription expired. Modifications are restricted to read-only mode.");
      return;
    }
    setEditingDestination(null);
    setDialogOpen(true);
  };

  // Open Edit Modal
  const handleEdit = (dest: Destination) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Modifications are restricted to read-only mode.");
      return;
    }
    setEditingDestination(dest);
    setDialogOpen(true);
  };

  // Toggle Active / Inactive Status
  const handleToggleStatus = async (dest: Destination) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Modifications are restricted to read-only mode.");
      return;
    }

    const nextStatus =
      dest.status === DestinationStatus.ACTIVE
        ? DestinationStatus.INACTIVE
        : DestinationStatus.ACTIVE;

    try {
      await destinationClient.updateDestination(dest.id, { status: nextStatus });
      toast.success(
        `Destination "${dest.name}" marked as ${
          nextStatus === DestinationStatus.ACTIVE ? "Active" : "Inactive"
        }.`
      );
      await fetchDestinations();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to update destination status."));
    }
  };

  // Delete Destination with ConfirmDialog
  const handleDelete = (dest: Destination) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Modifications are restricted to read-only mode.");
      return;
    }

    setConfirmAction({
      title: "Delete Destination?",
      description: `Are you sure you want to delete "${dest.name}"? If it is referenced by any hotel, activity, or trip, deletion will be blocked by system dependency rules.`,
      confirmText: "Delete Destination",
      variant: "destructive",
      action: async () => {
        try {
          setActionLoading(true);
          await destinationClient.deleteDestination(dest.id);
          toast.success(`Destination "${dest.name}" deleted successfully.`);
          setConfirmAction(null);
          await fetchDestinations();
        } catch (err: any) {
          toast.error(
            getErrorMessage(
              err,
              "Cannot delete destination because it is actively referenced in the system. Change status to Inactive instead."
            )
          );
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Destination Master" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-emerald-50/70 via-emerald-50/20 to-transparent pointer-events-none" />

          {/* Left Title & Telemetry */}
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                <MapPin className="h-3 w-3 text-emerald-500" />
                Geographic Masters
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {pagination.total} destinations catalogued
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Destinations
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Manage geographic territories, destination hubs, states, and regional areas for travel itineraries
              </span>
            </div>

            {/* Micro-Telemetry Stat Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100/60">
                <Compass className="h-3 w-3 text-emerald-600" />
                <span className="font-bold text-emerald-950">{pagination.total}</span> Registered Destinations
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
              onClick={handleCreate}
              disabled={isReadOnly}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9.5 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add Destination
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
                  placeholder="Search destinations by name, state, city area, or country..."
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

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    if (val) {
                      setStatusFilter(val);
                      setPage(1);
                    }
                  }}
                >
                  <SelectTrigger className="h-9.5 text-xs w-[140px] bg-slate-50/70 border-slate-200 rounded-xl">
                    <SelectValue placeholder="Status: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE" className="text-xs">Active Only</SelectItem>
                    <SelectItem value="INACTIVE" className="text-xs">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>

                {isFilterActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-9.5 text-xs text-slate-500 hover:text-slate-900 rounded-xl gap-1"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-4">
              <TableSkeleton rows={6} />
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-8">
              <ErrorState
                title="Unable to load destinations"
                description={error}
                onRetry={() => fetchDestinations()}
              />
            </div>
          )}

          {/* Table Content */}
          {!loading && !error && destinations.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={MapPin}
                title={isFilterActive ? "No matching destinations found" : "No destinations registered yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search query or status filter."
                    : "Add your first geographic destination to link hotels, activities, and travel itineraries."
                }
                actionText={isFilterActive ? "Clear Filter" : "Add Destination"}
                onAction={isFilterActive ? handleClearFilters : handleCreate}
              />
            </div>
          ) : !loading && !error && (
            <div className="overflow-hidden">
              <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[280px]">Destination & Region</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">City / Specific Area</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Country</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Status</TableHead>
                      <TableHead className="py-3 px-4 w-[80px] text-right font-bold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {destinations.map((dest) => (
                      <TableRow
                        key={dest.id}
                        className="hover:bg-slate-50/70 transition-colors group border-b border-slate-100/80"
                      >
                        {/* Name & State */}
                        <TableCell className="py-3 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center border border-emerald-100 shrink-0">
                              <MapPin className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                {dest.name}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {dest.state || "State Unspecified"}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* City / Area */}
                        <TableCell className="py-3 px-4 text-xs text-slate-700">
                          {dest.cityArea ? (
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-medium">
                              {dest.cityArea}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* Country */}
                        <TableCell className="py-3 px-4 text-xs text-slate-600">
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <Globe className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{dest.country || "India"}</span>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3 px-4">
                          <StatusBadge
                            status={dest.status}
                            label={dest.status === DestinationStatus.ACTIVE ? "Active" : "Inactive"}
                          />
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
                            <DropdownMenuContent align="end" className="bg-white border border-slate-200 shadow-md rounded-xl p-1 w-48">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">
                                  Destination Options
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handleEdit(dest)}
                                  className="text-xs cursor-pointer rounded-md"
                                >
                                  <Edit2 className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                  Edit Destination
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(dest)}
                                  disabled={isReadOnly}
                                  className="text-xs cursor-pointer rounded-md"
                                >
                                  {dest.status === DestinationStatus.ACTIVE ? (
                                    <>
                                      <XCircle className="mr-2 h-3.5 w-3.5 text-amber-500" />
                                      Mark Inactive
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                                      Mark Active
                                    </>
                                  )}
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleDelete(dest)}
                                  disabled={isReadOnly}
                                  className="text-xs text-rose-600 hover:bg-rose-50 cursor-pointer rounded-md disabled:opacity-50"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-500" />
                                  Delete Destination
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

              {/* Mobile Card List */}
              <div className="block lg:hidden divide-y divide-slate-100">
                {destinations.map((dest) => (
                  <div
                    key={dest.id}
                    onClick={() => handleEdit(dest)}
                    className="p-4 space-y-2 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{dest.name}</h4>
                        <p className="text-[11px] text-slate-500">
                          {dest.state ? `${dest.state}, ` : ""}
                          {dest.country || "India"}
                        </p>
                      </div>
                      <StatusBadge
                        status={dest.status}
                        label={dest.status === DestinationStatus.ACTIVE ? "Active" : "Inactive"}
                      />
                    </div>
                    {dest.cityArea && (
                      <div className="text-[11px] text-slate-600">
                        <span className="font-semibold text-slate-700">Area:</span> {dest.cityArea}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Master Footer with Pagination */}
          <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{destinations.length}</strong> of{" "}
              <strong className="text-slate-800">{pagination.total}</strong> destinations
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

      {/* Add / Edit Destination Modal */}
      <DestinationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        destination={editingDestination}
        onSuccess={fetchDestinations}
        isReadOnly={isReadOnly}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open && !actionLoading) setConfirmAction(null);
        }}
        title={confirmAction?.title || ""}
        description={confirmAction?.description || ""}
        confirmText={confirmAction?.confirmText || "Confirm"}
        variant={confirmAction?.variant || "destructive"}
        loading={actionLoading}
        onConfirm={async () => {
          if (confirmAction?.action) {
            await confirmAction.action();
          }
        }}
      />
    </div>
  );
}
