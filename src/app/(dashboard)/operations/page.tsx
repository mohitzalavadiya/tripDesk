"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOperations } from "@/context/operations-context";
import { useBooking } from "@/context/booking-context";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  TripOperationsStatusBadge,
  TransportStatusBadge,
  IssuePriorityBadge,
} from "@/components/operations/operations-status-badge";
import { CreateIssueModal } from "@/components/operations/create-issue-modal";
import {
  Activity,
  Car,
  Compass,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Users,
  MapPin,
  Calendar,
  ChevronRight,
  Phone,
  Filter,
  UserCheck,
  Hotel,
  Ticket,
  Plus,
} from "lucide-react";

export default function OperationsDashboardPage() {
  const router = useRouter();
  const { operations } = useOperations();
  const { bookings } = useBooking();

  // Modals
  const [isIssueModalOpen, setIsIssueModalOpen] = React.useState(false);

  // Filters for Today's Operations
  const [todayFilter, setTodayFilter] = React.useState<
    "ALL" | "Pickup" | "Transfer" | "Hotel" | "Activity" | "Drop"
  >("ALL");

  // Derive KPIs dynamically
  const kpis = React.useMemo(() => {
    const activeTrips = operations.filter(
      (o) => o.operationsStatus === "On Trip" || o.operationsStatus === "Pickup Pending"
    ).length;

    // Flatten all today's transports
    const allTransports = operations.flatMap((o) => o.transports);
    const todayPickups = allTransports.filter(
      (t) => t.type === "Pickup" && t.status !== "Completed" && t.status !== "Cancelled"
    ).length;

    // Pending Actions calculation
    let pendingActions = 0;
    operations.forEach((op) => {
      op.readiness.checks.forEach((c) => {
        if (!c.passed) pendingActions += 1;
      });
    });

    // Open Issues
    const openIssues = operations.flatMap((o) => o.issues).filter(
      (i) => i.status === "Open" || i.status === "In Progress"
    ).length;

    // Upcoming Trips
    const upcomingTrips = operations.filter(
      (o) => o.operationsStatus === "Upcoming" || o.operationsStatus === "Ready for Trip"
    ).length;

    return {
      activeTrips,
      todayPickups,
      pendingActions,
      openIssues,
      upcomingTrips,
    };
  }, [operations]);

  // Active trips list
  const activeTrips = React.useMemo(() => {
    return operations.filter(
      (o) => o.operationsStatus === "On Trip" || o.operationsStatus === "Pickup Pending"
    );
  }, [operations]);

  // Upcoming trips list
  const upcomingTrips = React.useMemo(() => {
    return operations.filter(
      (o) => o.operationsStatus === "Upcoming" || o.operationsStatus === "Ready for Trip"
    );
  }, [operations]);

  // Flatten Today's operations schedule
  const todayOperations = React.useMemo(() => {
    const list: Array<{
      id: string;
      tripId: string;
      bookingNumber: string;
      customerName: string;
      customerPhone?: string;
      tripTitle: string;
      time: string;
      type: "Pickup" | "Transfer" | "Hotel" | "Activity" | "Drop";
      title: string;
      location: string;
      vehicleName?: string;
      driverName?: string;
      status: string;
    }> = [];

    operations.forEach((op) => {
      const todayPlan = op.dailyPlans.find(
        (dp) => dp.status === "Today" || dp.dayNumber === op.currentDay
      );
      if (todayPlan) {
        // Transports
        todayPlan.transports.forEach((tr) => {
          list.push({
            id: tr.id,
            tripId: op.tripId,
            bookingNumber: op.bookingNumber,
            customerName: op.customerSnapshot.name,
            customerPhone: op.customerSnapshot.phone,
            tripTitle: op.title,
            time: tr.time || "10:30 AM",
            type: tr.type as any,
            title: tr.title,
            location: `${tr.pickupLocation} → ${tr.dropLocation}`,
            vehicleName: tr.vehicleName,
            driverName: tr.driverName,
            status: tr.status,
          });
        });

        // Activities
        todayPlan.activities.forEach((act) => {
          list.push({
            id: act.id,
            tripId: op.tripId,
            bookingNumber: op.bookingNumber,
            customerName: op.customerSnapshot.name,
            customerPhone: op.customerSnapshot.phone,
            tripTitle: op.title,
            time: act.time || "Scheduled",
            type: "Activity",
            title: act.title,
            location: act.location || op.currentLocation,
            status: act.status,
          });
        });
      }
    });

    return list.filter((item) => {
      if (todayFilter === "ALL") return true;
      return item.type === todayFilter;
    });
  }, [operations, todayFilter]);

  // Operational Action Items (Tasks pending resolution)
  const pendingActionItems = React.useMemo(() => {
    const items: Array<{
      tripId: string;
      bookingNumber: string;
      tripTitle: string;
      customerName: string;
      warning: string;
      type: string;
    }> = [];

    operations.forEach((op) => {
      op.readiness.checks.forEach((check) => {
        if (!check.passed && check.message) {
          items.push({
            tripId: op.tripId,
            bookingNumber: op.bookingNumber,
            tripTitle: op.title,
            customerName: op.customerSnapshot.name,
            warning: check.message,
            type: check.key,
          });
        }
      });
    });

    return items;
  }, [operations]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Operations Command Center"
          description="Manage today's trips, pickups, pending tasks, and active travel operations."
          breadcrumbs={[{ label: "Operations" }]}
          primaryAction={{
            label: "Log Issue",
            onClick: () => setIsIssueModalOpen(true),
            icon: AlertCircle,
          }}
          secondaryActions={[
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

          {/* 2. Today's Pickups */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Today&apos;s Pickups</span>
              <Car className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-700 tracking-tight">{kpis.todayPickups}</p>
            <p className="text-[11px] text-slate-500 font-medium">Arrivals & transfers</p>
          </div>

          {/* 3. Pending Actions */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending Actions</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700 tracking-tight">{kpis.pendingActions}</p>
            <p className="text-[11px] text-amber-600/80 font-medium">Readiness blockers</p>
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
            <p className="text-[11px] text-slate-500 font-medium">Customer & fleet tickets</p>
          </div>

          {/* 5. Upcoming Trips */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-blue-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Upcoming Trips</span>
              <Compass className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-blue-700 tracking-tight">{kpis.upcomingTrips}</p>
            <p className="text-[11px] text-slate-500 font-medium">Starting in next 7 days</p>
          </div>
        </div>

        {/* ─── 2-COLUMN MAIN WORKSPACE: TODAY'S TIMELINE | ACTIVE & UPCOMING ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ─── LEFT 7 COLS: TODAY'S OPERATIONS TIMELINE FEED ──────────────── */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Today&apos;s Live Operations Feed
                  </h3>
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {[
                    { id: "ALL", label: "All" },
                    { id: "Pickup", label: "Pickups" },
                    { id: "Transfer", label: "Transfers" },
                    { id: "Activity", label: "Activities" },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setTodayFilter(chip.id as any)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        todayFilter === chip.id
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {todayOperations.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No operational events scheduled for today in this filter category.
                </div>
              ) : (
                <div className="space-y-3">
                  {todayOperations.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => router.push(`/operations/${item.tripId}`)}
                      className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="bg-white border border-slate-200/80 rounded-lg px-2 py-1 text-center font-mono font-bold text-xs text-indigo-600 shrink-0">
                            {item.time}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-900 block group-hover:text-indigo-600 transition-colors">
                              {item.customerName} • {item.tripTitle}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-700 block">
                              {item.title}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <TransportStatusBadge status={item.status as any} />
                        </div>
                      </div>

                      {/* Details row */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {item.location}
                        </span>
                        {item.vehicleName && (
                          <span className="flex items-center gap-1">
                            <Car className="h-3 w-3 text-slate-400" />
                            {item.vehicleName}
                          </span>
                        )}
                        {item.driverName && (
                          <span className="flex items-center gap-1 font-semibold text-indigo-600">
                            <UserCheck className="h-3 w-3" />
                            {item.driverName}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── PENDING ACTION ITEMS (READINESS BLOCKERS) ─────────────────── */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Pending Operational Actions ({pendingActionItems.length})
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">Immediate attention</span>
              </div>

              {pendingActionItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-emerald-600 font-medium">
                  ✓ All active and upcoming trips are 100% operational ready!
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {pendingActionItems.slice(0, 5).map((item, idx) => (
                    <div
                      key={idx}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-bold text-slate-900 block truncate">
                          ⚠ {item.warning}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {item.tripTitle} ({item.customerName})
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/operations/${item.tripId}`)}
                        className="text-xs font-bold h-7.5 px-3 rounded-lg text-indigo-600 hover:bg-indigo-50 border-indigo-200 cursor-pointer shrink-0"
                      >
                        Resolve
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── RIGHT 5 COLS: ACTIVE & UPCOMING TRIPS ───────────────────────── */}
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

              <div className="space-y-3">
                {activeTrips.map((trip) => (
                  <div
                    key={trip.id}
                    onClick={() => router.push(`/operations/${trip.tripId}`)}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 hover:bg-slate-100/60 transition-all cursor-pointer space-y-2.5 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-black text-xs text-slate-900 group-hover:text-indigo-600 transition-colors block">
                          {trip.title}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {trip.bookingNumber} • {trip.customerSnapshot.name}
                        </span>
                      </div>
                      <TripOperationsStatusBadge status={trip.operationsStatus} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-white border border-slate-100 rounded-lg p-2.5">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Progress</span>
                        <span className="font-bold text-slate-800">
                          Day {trip.currentDay} of {trip.totalDays}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Current City</span>
                        <span className="font-bold text-indigo-600">{trip.currentLocation}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
                <span className="text-[10px] text-slate-400 font-semibold">Starting soon</span>
              </div>

              <div className="space-y-3">
                {upcomingTrips.map((uTrip) => (
                  <div
                    key={uTrip.id}
                    onClick={() => router.push(`/operations/${uTrip.tripId}`)}
                    className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 hover:bg-slate-100/60 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors block truncate">
                        {uTrip.title}
                      </span>
                      <span className="text-[11px] text-slate-500 block truncate">
                        {uTrip.startDate} • {uTrip.adults} Adults ({uTrip.destination})
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                          uTrip.readiness.score === 100
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {uTrip.readiness.score}% Ready
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── LOG ISSUE MODAL ──────────────────────────────────────────────── */}
      <CreateIssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
      />
    </div>
  );
}
