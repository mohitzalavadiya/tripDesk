"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  operationsClient,
  OperationListItem,
  ApiClientError,
} from "@/lib/api-client";
import { OperationStatus } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton, PageSkeleton, CardSkeleton } from "@/components/shared/loading-skeletons";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TripOperationsStatusBadge,
  TransportStatusBadge,
} from "@/components/operations/operations-status-badge";
import { CreateIssueModal } from "@/components/operations/create-issue-modal";
import { toast } from "sonner";
import {
  Activity,
  Car,
  Compass,
  Clock,
  AlertTriangle,
  AlertCircle,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  RotateCcw,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  BarChart3,
} from "lucide-react";

export default function OperationsDashboardPage() {
  const router = useRouter();

  // Data states
  const [operations, setOperations] = React.useState<OperationListItem[]>([]);
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

  // Modals
  const [isIssueModalOpen, setIsIssueModalOpen] = React.useState(false);

  // Debounce search (300ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch real operations from API
  const fetchOperations = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await operationsClient.getOperations({
        page,
        limit: 20,
        status: statusFilter !== "ALL" ? (statusFilter as OperationStatus) : undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      setOperations(res.data || []);
      if (res.meta) {
        setPagination({
          total: res.meta.total,
          page: res.meta.page,
          limit: res.meta.limit,
          totalPages: res.meta.totalPages,
        });
      }
    } catch (err: any) {
      if (err.statusCode === 403 && err.code === "READ_ONLY_ACCESS") {
        setIsReadOnly(true);
      } else {
        setError(err.message || "Failed to load operations.");
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  React.useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  // Derive KPIs from real operations data
  const kpis = React.useMemo(() => {
    const activeTrips = operations.filter(
      (o) => o.status === OperationStatus.ONGOING
    ).length;

    const upcomingTrips = operations.filter(
      (o) =>
        o.status === OperationStatus.PREPARING ||
        o.status === OperationStatus.READY ||
        o.status === OperationStatus.PENDING
    ).length;

    let pendingActions = 0;
    operations.forEach((op) => {
      const pendingHotels = op.hotelConfirmations?.filter((h) => h.status === "PENDING").length || 0;
      const pendingVehicles = op.vehicleDispatches?.filter((v) => v.status === "PENDING").length || 0;
      const pendingActivities = op.activityConfirmations?.filter((a) => a.status === "PENDING").length || 0;
      pendingActions += pendingHotels + pendingVehicles + pendingActivities;
    });

    const openIssues = operations.reduce(
      (sum, op) => sum + (op.issues?.length || 0),
      0
    );

    const todayPickups = operations.reduce(
      (sum, op) => sum + (op.vehicleDispatches?.filter((v) => v.status === "ASSIGNED" || v.status === "ON_DUTY").length || 0),
      0
    );

    return {
      activeTrips,
      todayPickups,
      pendingActions,
      openIssues,
      upcomingTrips,
    };
  }, [operations]);

  // Client-side search filtering over current batch
  const filteredOperations = React.useMemo(() => {
    if (!debouncedSearch.trim()) return operations;
    const q = debouncedSearch.toLowerCase();
    return operations.filter(
      (op) =>
        op.trip.title.toLowerCase().includes(q) ||
        op.trip.tripNumber.toLowerCase().includes(q) ||
        op.trip.customer.name.toLowerCase().includes(q) ||
        (op.booking?.bookingNumber && op.booking.bookingNumber.toLowerCase().includes(q))
    );
  }, [operations, debouncedSearch]);

  // Active trips list
  const activeTrips = React.useMemo(() => {
    return filteredOperations.filter(
      (o) => o.status === OperationStatus.ONGOING
    );
  }, [filteredOperations]);

  // Upcoming departures list
  const upcomingTrips = React.useMemo(() => {
    return filteredOperations.filter(
      (o) =>
        o.status === OperationStatus.PREPARING ||
        o.status === OperationStatus.READY ||
        o.status === OperationStatus.PENDING
    );
  }, [filteredOperations]);

  // Action Items requiring attention
  const pendingActionItems = React.useMemo(() => {
    const items: Array<{
      operationId: string;
      tripId: string;
      tripNumber: string;
      tripTitle: string;
      customerName: string;
      warning: string;
      pendingCount: number;
    }> = [];

    operations.forEach((op) => {
      const pendingHotels = op.hotelConfirmations?.filter((h) => h.status === "PENDING").length || 0;
      const pendingVehicles = op.vehicleDispatches?.filter((v) => v.status === "PENDING").length || 0;
      const pendingActivities = op.activityConfirmations?.filter((a) => a.status === "PENDING").length || 0;
      const openIssuesCount = op.issues?.length || 0;

      const totalPending = pendingHotels + pendingVehicles + pendingActivities + openIssuesCount;
      if (totalPending > 0) {
        const parts: string[] = [];
        if (pendingHotels > 0) parts.push(`${pendingHotels} Hotel(s) unconfirmed`);
        if (pendingVehicles > 0) parts.push(`${pendingVehicles} Driver(s) unassigned`);
        if (pendingActivities > 0) parts.push(`${pendingActivities} Activity unconfirmed`);
        if (openIssuesCount > 0) parts.push(`${openIssuesCount} Open Issue(s)`);

        items.push({
          operationId: op.id,
          tripId: op.trip.id,
          tripNumber: op.trip.tripNumber,
          tripTitle: op.trip.title,
          customerName: op.trip.customer.name,
          warning: parts.join(" • "),
          pendingCount: totalPending,
        });
      }
    });

    return items;
  }, [operations]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-only Banner */}
        {isReadOnly && (
          <ReadOnlyBanner moduleName="Operations" />
        )}

        {/* Top Header */}
        <PageHeader
          title="Operations Command Center"
          description="Manage live trips, hotel confirmations, chauffeur dispatch, and operational readiness."
          breadcrumbs={[{ label: "Operations" }]}
          primaryAction={{
            label: "Log Issue",
            onClick: () => {
              if (!isReadOnly) setIsIssueModalOpen(true);
            },
            icon: AlertCircle,
          }}
          secondaryActions={[
            {
              label: "Analytics & Insights",
              onClick: () => router.push("/operations/analytics"),
              icon: BarChart3,
              variant: "outline",
            },
            {
              label: "Issues Tracker",
              onClick: () => router.push("/operations/issues"),
              icon: AlertTriangle,
              variant: "outline",
            },
          ]}
        />

        {/* ─── 5 OPERATIONAL KPI CARDS ────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Active Trips */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Trips</span>
              <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{kpis.activeTrips}</p>
            <p className="text-[11px] text-slate-500 font-medium">Currently on tour</p>
          </div>

          {/* 2. Today's Pickups / Dispatches */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Active Dispatches</span>
              <Car className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-700 tracking-tight">{kpis.todayPickups}</p>
            <p className="text-[11px] text-slate-500 font-medium">Assigned & on-duty fleet</p>
          </div>

          {/* 3. Pending Actions */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending Actions</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700 tracking-tight">{kpis.pendingActions}</p>
            <p className="text-[11px] text-amber-600/80 font-medium">Confirmations & drivers needed</p>
          </div>

          {/* 4. Open Issues */}
          <div
            onClick={() => router.push("/operations/issues")}
            className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 cursor-pointer hover:border-rose-300 transition-colors group"
          >
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[11px] font-bold uppercase tracking-wider group-hover:text-rose-700">
                Open Issues
              </span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-700 tracking-tight">{kpis.openIssues}</p>
            <p className="text-[11px] text-slate-500 font-medium">Customer & supplier tickets</p>
          </div>

          {/* 5. Upcoming Trips */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-blue-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Upcoming Departures</span>
              <Compass className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-blue-700 tracking-tight">{kpis.upcomingTrips}</p>
            <p className="text-[11px] text-slate-500 font-medium">In preparation / ready</p>
          </div>
        </div>

        {/* ─── FILTERS & SEARCH BAR ────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by trip, client, or booking ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9.5 text-xs"
            />
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val || "ALL");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9.5 text-xs font-semibold w-full sm:w-48 bg-white">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PREPARING">Preparing</SelectItem>
                <SelectItem value="READY">Ready for Trip</SelectItem>
                <SelectItem value="ONGOING">On Trip (Ongoing)</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>

            {(search || statusFilter !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setPage(1);
                }}
                className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* ─── MAIN CONTENT ──────────────────────────────────────────────── */}
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <ErrorState
            title="Unable to load operations"
            description={error}
            onRetry={fetchOperations}
          />
        ) : filteredOperations.length === 0 ? (
          <EmptyState
            icon={Activity}
            title={debouncedSearch || statusFilter !== "ALL" ? "No matching operations found" : "No operations initialized yet"}
            description={
              debouncedSearch || statusFilter !== "ALL"
                ? "Try clearing your search query or selecting a different status filter."
                : "Operations records are initialized automatically when quotations are accepted or bookings are confirmed."
            }
            actionText={debouncedSearch || statusFilter !== "ALL" ? "Clear Filters" : undefined}
            onAction={
              debouncedSearch || statusFilter !== "ALL"
                ? () => {
                    setSearch("");
                    setStatusFilter("ALL");
                    setPage(1);
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ─── LEFT 7 COLS: PENDING ACTIONS & ALL OPERATIONS LIST ────────── */}
            <div className="lg:col-span-7 space-y-5">
              {/* ─── PENDING ACTIONS (READINESS BLOCKERS) ────────────────────── */}
              {pendingActionItems.length > 0 && (
                <div className="bg-white border border-amber-200/90 rounded-2xl p-5 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-amber-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Operational Attention Required ({pendingActionItems.length})
                      </h3>
                    </div>
                    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Immediate Action
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    {pendingActionItems.slice(0, 6).map((item, idx) => (
                      <div
                        key={idx}
                        className="py-3 flex items-center justify-between gap-3 group"
                      >
                        <div className="space-y-1 min-w-0">
                          <span className="font-bold text-slate-900 block truncate group-hover:text-indigo-600 transition-colors">
                            {item.tripTitle} ({item.customerName})
                          </span>
                          <span className="text-[11px] text-amber-700 font-medium block truncate">
                            ⚠ {item.warning}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/operations/${item.tripId}`)}
                          className="text-xs font-bold h-7.5 px-3 rounded-lg text-indigo-600 hover:bg-indigo-50 border-indigo-200 cursor-pointer shrink-0"
                        >
                          Resolve →
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── OPERATIONS MASTER LIST ─────────────────────────────────── */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Operations Directory ({pagination.total})
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                </div>

                <div className="space-y-3">
                  {filteredOperations.map((op) => {
                    const totalHotels = op._count?.hotelConfirmations || 0;
                    const confirmedHotels = op.hotelConfirmations?.filter((h) => h.status === "CONFIRMED").length || 0;
                    const totalVehicles = op._count?.vehicleDispatches || 0;
                    const assignedVehicles = op.vehicleDispatches?.filter((v) => v.status === "ASSIGNED" || v.status === "CONFIRMED" || v.status === "ON_DUTY").length || 0;
                    const totalActivities = op._count?.activityConfirmations || 0;
                    const confirmedActivities = op.activityConfirmations?.filter((a) => a.status === "CONFIRMED").length || 0;
                    const openIssues = op.issues?.length || 0;

                    return (
                      <div
                        key={op.id}
                        onClick={() => router.push(`/operations/${op.trip.id}`)}
                        className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-100/60 hover:border-slate-300 transition-all cursor-pointer space-y-3 group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors block">
                              {op.trip.title}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-slate-500 pt-0.5 flex-wrap">
                              <span className="font-mono font-semibold text-slate-700">
                                {op.booking?.bookingNumber || op.trip.tripNumber}
                              </span>
                              <span>•</span>
                              <span>{op.trip.customer.name}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-slate-600">
                                <Calendar className="h-3 w-3 text-slate-400" />
                                {new Date(op.trip.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} → {new Date(op.trip.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0 space-y-1">
                            <TripOperationsStatusBadge status={op.status} />
                          </div>
                        </div>

                        {/* Status Check Chips */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                          <div className="bg-white border border-slate-100 rounded-lg px-2.5 py-1 text-slate-600">
                            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Hotels</span>
                            <span className={`font-bold ${totalHotels > 0 && confirmedHotels === totalHotels ? "text-emerald-700" : "text-amber-700"}`}>
                              {confirmedHotels}/{totalHotels} Confirmed
                            </span>
                          </div>

                          <div className="bg-white border border-slate-100 rounded-lg px-2.5 py-1 text-slate-600">
                            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Fleet</span>
                            <span className={`font-bold ${totalVehicles > 0 && assignedVehicles === totalVehicles ? "text-emerald-700" : "text-amber-700"}`}>
                              {assignedVehicles}/{totalVehicles} Assigned
                            </span>
                          </div>

                          <div className="bg-white border border-slate-100 rounded-lg px-2.5 py-1 text-slate-600">
                            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Activities</span>
                            <span className={`font-bold ${totalActivities > 0 && confirmedActivities === totalActivities ? "text-emerald-700" : "text-amber-700"}`}>
                              {confirmedActivities}/{totalActivities} Confirmed
                            </span>
                          </div>

                          <div className="bg-white border border-slate-100 rounded-lg px-2.5 py-1 text-slate-600">
                            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Tickets</span>
                            <span className={`font-bold ${openIssues > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                              {openIssues} Open Issue(s)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">
                      Showing {(pagination.page - 1) * pagination.limit + 1}–
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} operations
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="h-8 px-2.5 text-xs cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                        className="h-8 px-2.5 text-xs cursor-pointer"
                      >
                        Next
                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── RIGHT 5 COLS: ACTIVE & UPCOMING DEPARTURES ─────────────────── */}
            <div className="lg:col-span-5 space-y-5">
              {/* Active Trips Card */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Active Trips On Tour
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {activeTrips.length} Live
                  </span>
                </div>

                {activeTrips.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No active trips currently in transit.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeTrips.map((trip) => (
                      <div
                        key={trip.id}
                        onClick={() => router.push(`/operations/${trip.trip.id}`)}
                        className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-100/60 transition-all cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors block">
                              {trip.trip.title}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {trip.booking?.bookingNumber || trip.trip.tripNumber} • {trip.trip.customer.name}
                            </span>
                          </div>
                          <TripOperationsStatusBadge status={trip.status} />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {new Date(trip.trip.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} → {new Date(trip.trip.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                          <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                            View File →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Departures Watch */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Compass className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Upcoming Departures Watch
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">{upcomingTrips.length} Upcoming</span>
                </div>

                {upcomingTrips.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No upcoming departures scheduled.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingTrips.slice(0, 5).map((uTrip) => (
                      <div
                        key={uTrip.id}
                        onClick={() => router.push(`/operations/${uTrip.trip.id}`)}
                        className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 hover:bg-slate-100/60 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors block truncate">
                            {uTrip.trip.title}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {new Date(uTrip.trip.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} • {uTrip.trip.customer.name}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <TripOperationsStatusBadge status={uTrip.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── LOG ISSUE MODAL ──────────────────────────────────────────────── */}
      <CreateIssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        operationList={operations.map((op) => ({
          id: op.id,
          title: op.trip.title,
          bookingNumber: op.booking?.bookingNumber || op.trip.tripNumber,
          customerName: op.trip.customer.name,
        }))}
        onSuccess={fetchOperations}
      />
    </div>
  );
}
