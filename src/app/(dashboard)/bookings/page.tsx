"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBooking } from "@/context/booking-context";
import { BookingStatus, PaymentStatus } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
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
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/booking/booking-status-badge";
import { formatCurrency } from "@/lib/costing-engine";
import {
  CalendarCheck,
  Plus,
  Search,
  RotateCcw,
  MoreVertical,
  Eye,
  CreditCard,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  Users,
  AlertTriangle,
  IndianRupee,
  Phone,
} from "lucide-react";

export default function BookingsDashboardPage() {
  const router = useRouter();
  const { bookings } = useBooking();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [paymentFilter, setPaymentFilter] = React.useState<string>("ALL");

  // Derive KPIs dynamically
  const kpis = React.useMemo(() => {
    const total = bookings.length;
    const pendingConfirmation = bookings.filter(
      (b) => b.status === "Pending Confirmation" || b.status === "Partially Confirmed"
    ).length;
    const confirmed = bookings.filter((b) => b.status === "Confirmed").length;
    const upcoming = bookings.filter(
      (b) => new Date(b.startDate) >= new Date() && b.status !== "Cancelled"
    ).length;
    const paymentPending = bookings.filter(
      (b) => b.paymentStatus === "Unpaid" || b.paymentStatus === "Partially Paid"
    ).length;

    return { total, pendingConfirmation, confirmed, upcoming, paymentPending };
  }, [bookings]);

  // Upcoming Trips highlight
  const upcomingTrips = React.useMemo(() => {
    return bookings
      .filter((b) => b.status !== "Cancelled")
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 3);
  }, [bookings]);

  // Filter Bookings
  const filteredBookings = React.useMemo(() => {
    return bookings.filter((b) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = b.bookingNumber.toLowerCase().includes(q);
        const matchesCust = b.customerSnapshot.name.toLowerCase().includes(q);
        const matchesTrip = b.title.toLowerCase().includes(q);
        const matchesDest = b.destination.toLowerCase().includes(q);
        const matchesPhone = b.customerSnapshot.phone?.includes(q);

        if (!matchesId && !matchesCust && !matchesTrip && !matchesDest && !matchesPhone) {
          return false;
        }
      }

      // Status
      if (statusFilter !== "ALL" && b.status !== statusFilter) {
        return false;
      }

      // Payment
      if (paymentFilter !== "ALL" && b.paymentStatus !== paymentFilter) {
        return false;
      }

      return true;
    });
  }, [bookings, searchQuery, statusFilter, paymentFilter]);

  const isFilterActive = searchQuery || statusFilter !== "ALL" || paymentFilter !== "ALL";

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPaymentFilter("ALL");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header */}
        <PageHeader
          title="Bookings"
          description="Manage confirmed, pending, and upcoming travel bookings."
          breadcrumbs={[{ label: "Bookings" }]}
          primaryAction={{
            label: "New Booking",
            onClick: () => router.push("/bookings/new"),
            icon: Plus,
          }}
        />

        {/* ─── 5 SUMMARY KPI CARDS ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Bookings</span>
              <CalendarCheck className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{kpis.total}</p>
            <p className="text-[11px] text-slate-500 font-medium">All active & past files</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Pending Confirmation</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-700 tracking-tight">{kpis.pendingConfirmation}</p>
            <p className="text-[11px] text-amber-600/80 font-medium">Supplier block required</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-emerald-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Confirmed</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-700 tracking-tight">{kpis.confirmed}</p>
            <p className="text-[11px] text-emerald-600/80 font-medium">All services blocked</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-indigo-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Upcoming Trips</span>
              <Calendar className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-700 tracking-tight">{kpis.upcoming}</p>
            <p className="text-[11px] text-slate-500 font-medium">Departures upcoming</p>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-rose-600">
              <span className="text-[11px] font-bold uppercase tracking-wider">Payment Pending</span>
              <IndianRupee className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-700 tracking-tight">{kpis.paymentPending}</p>
            <p className="text-[11px] text-slate-500 font-medium">Awaiting balance</p>
          </div>
        </div>

        {/* ─── UPCOMING TRIP ALERT SECTION ───────────────────────────────── */}
        {upcomingTrips.length > 0 && (
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Operational Watch: Immediate Upcoming Departures
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600">Next 3 departures</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {upcomingTrips.map((tr) => (
                <div
                  key={tr.id}
                  onClick={() => router.push(`/bookings/${tr.id}`)}
                  className="bg-white border border-indigo-100/80 rounded-xl p-3 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0 space-y-0.5">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors block truncate">
                      {tr.customerSnapshot.name}
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate">
                      {tr.title} • {tr.startDate}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-semibold">
                      {tr.bookingNumber} ({tr.adults} Adults)
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <BookingStatusBadge status={tr.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── SEARCH & FILTER CONTROLS ───────────────────────────────────── */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search Booking ID, Customer, Trip..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
                <SelectTrigger className="h-9 text-xs w-44">
                  <SelectValue placeholder="Booking Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="ALL">All Booking Statuses</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Pending Confirmation">Pending Confirmation</SelectItem>
                  <SelectItem value="Partially Confirmed">Partially Confirmed</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="On Trip">On Trip</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentFilter} onValueChange={(val) => setPaymentFilter(val || "ALL")}>
                <SelectTrigger className="h-9 text-xs w-40">
                  <SelectValue placeholder="Payment Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="ALL">All Payment States</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Refund Pending">Refund Pending</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              {isFilterActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-9 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ─── DATA TABLE ─────────────────────────────────────────────────── */}
        <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs bg-white">
          {filteredBookings.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={CalendarCheck}
                title={isFilterActive ? "No matching bookings found" : "No bookings yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search criteria or resetting filters."
                    : "Convert an accepted quotation or create a new booking to start managing supplier confirmations."
                }
                actionText={isFilterActive ? "Clear Search" : "New Booking"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/bookings/new")}
              />
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                  <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                    <TableHead className="py-3 px-4 font-bold text-slate-600 w-[140px]">Booking ID</TableHead>
                    <TableHead className="py-3 px-4 font-bold text-slate-600">Customer</TableHead>
                    <TableHead className="py-3 px-4 font-bold text-slate-600">Trip Package</TableHead>
                    <TableHead className="py-3 px-4 font-bold text-slate-600">Travel Dates</TableHead>
                    <TableHead className="py-3 px-4 font-bold text-slate-600">Guests</TableHead>
                    <TableHead className="py-3 px-4 font-bold text-slate-600 text-right">Total Package</TableHead>
                    <TableHead className="py-3 px-4 font-bold text-slate-600 text-center">Payment</TableHead>
                    <TableHead className="py-3 px-4 font-bold text-slate-600">Booking Status</TableHead>
                    <TableHead className="py-3 px-4 w-[60px] text-right font-bold text-slate-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow
                      key={booking.id}
                      onClick={() => router.push(`/bookings/${booking.id}`)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80"
                    >
                      {/* Booking ID */}
                      <TableCell className="py-3.5 px-4 font-mono font-bold text-xs text-indigo-600">
                        {booking.bookingNumber}
                      </TableCell>

                      {/* Customer */}
                      <TableCell className="py-3.5 px-4">
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                            {booking.customerSnapshot.name}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            {booking.customerSnapshot.phone || "-"}
                          </span>
                        </div>
                      </TableCell>

                      {/* Trip & Destination */}
                      <TableCell className="py-3.5 px-4">
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-800 text-xs truncate">
                            {booking.title}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            {booking.destination}
                          </span>
                        </div>
                      </TableCell>

                      {/* Travel Dates */}
                      <TableCell className="py-3.5 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>
                            {booking.startDate} → {booking.endDate}
                          </span>
                        </div>
                      </TableCell>

                      {/* Guests */}
                      <TableCell className="py-3.5 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>
                            {booking.adults}A {booking.children > 0 ? `+ ${booking.children}C` : ""}
                          </span>
                        </div>
                      </TableCell>

                      {/* Total Amount & Balance */}
                      <TableCell className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-black text-xs text-slate-900">
                            {formatCurrency(booking.totalAmount)}
                          </span>
                          {booking.pendingAmount > 0 ? (
                            <span className="text-[10px] font-semibold text-amber-600">
                              {formatCurrency(booking.pendingAmount)} due
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-600">
                              Fully Settled
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Payment Status */}
                      <TableCell className="py-3.5 px-4 text-center">
                        <PaymentStatusBadge status={booking.paymentStatus} />
                      </TableCell>

                      {/* Booking Status */}
                      <TableCell className="py-3.5 px-4">
                        <BookingStatusBadge status={booking.status} />
                      </TableCell>

                      {/* Actions */}
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
                                Options
                              </DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => router.push(`/bookings/${booking.id}`)}
                                className="text-xs cursor-pointer rounded-md"
                              >
                                <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                View Workspace
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
          )}
        </div>
      </div>
    </div>
  );
}
