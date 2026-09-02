"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  Search,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  AlertCircle,
  Sparkles,
  MoreVertical,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  Compass,
  CreditCard,
  Phone,
  IndianRupee,
  Layers,
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
  BookingStatusBadge,
  PaymentStatusBadge,
} from "@/components/booking/booking-status-badge";
import { bookingClient, BookingWithRelations } from "@/lib/api-client";
import { BookingStatus, BookingPaymentStatus } from "@prisma/client";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";

export default function BookingsDashboardPage() {
  const router = useRouter();

  // Data states
  const [bookings, setBookings] = React.useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  // Search & Filter states
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [paymentFilter, setPaymentFilter] = React.useState<string>("all");
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

  // Fetch real bookings from database API
  const fetchBookings = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await bookingClient.getBookings({
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? (statusFilter as BookingStatus) : undefined,
        paymentStatus: paymentFilter !== "all" ? (paymentFilter as BookingPaymentStatus) : undefined,
        page,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (res.success && res.data) {
        setBookings(res.data);
        setPagination(res.meta);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load bookings from database.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, paymentFilter, page]);

  React.useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setPage(1);
  };

  const isFilterActive = search.trim() !== "" || statusFilter !== "all" || paymentFilter !== "all";

  // Soft Archive Booking
  const handleDelete = async (id: string, number: string) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Modifications are restricted to read-only mode.");
      return;
    }

    if (!confirm(`Archive booking ${number}? This will preserve historical payment audit trails.`)) {
      return;
    }

    try {
      setDeletingId(id);
      await bookingClient.deleteBooking(id);
      toast.success(`Booking ${number} archived successfully.`);
      await fetchBookings();
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive booking.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDateDisplay = (date: Date | string | null | undefined) => {
    if (!date) return "TBD";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Bookings & Reservations" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Left Title & Telemetry */}
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CalendarCheck className="h-3 w-3 text-emerald-500" />
                Active Operations
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {pagination.total} bookings managed
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Bookings & Operations
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Confirmed client itineraries, travel schedules, and payment ledger tracking
              </span>
            </div>

            {/* Status Quick Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              {[
                { label: "All", value: "all" },
                { label: "Confirmed", value: BookingStatus.CONFIRMED },
                { label: "On Trip", value: BookingStatus.ONGOING },
                { label: "Completed", value: BookingStatus.COMPLETED },
                { label: "Cancelled", value: BookingStatus.CANCELLED },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => {
                    setStatusFilter(tab.value);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                    statusFilter === tab.value
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            <Button
              onClick={() => router.push("/bookings/new")}
              disabled={isReadOnly}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              New Booking
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
                  placeholder="Search by booking number, trip title, customer name, phone..."
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

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Payment:</span>
                  <select
                    value={paymentFilter}
                    onChange={(e) => {
                      setPaymentFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value={BookingPaymentStatus.UNPAID}>Unpaid</option>
                    <option value={BookingPaymentStatus.PARTIALLY_PAID}>Partially Paid</option>
                    <option value={BookingPaymentStatus.PAID}>Fully Paid</option>
                  </select>
                </div>

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
              <p className="text-xs text-slate-500 font-medium">Fetching bookings from database...</p>
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
                onClick={() => fetchBookings()}
                className="text-xs h-8 rounded-lg cursor-pointer"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Table Content */}
          {!loading && !error && bookings.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={CalendarCheck}
                title={isFilterActive ? "No matching bookings found" : "No bookings confirmed yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search or status filter."
                    : "Convert accepted client quotations or create a new booking to start managing operations and payments."
                }
                actionText={isFilterActive ? "Clear Filter" : "Create New Booking"}
                onAction={isFilterActive ? handleClearFilters : () => router.push("/bookings/new")}
              />
            </div>
          ) : !loading && !error && (
            <div className="overflow-hidden">
              <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[240px]">Booking</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Customer & Contact</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Travel Schedule</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Status</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Financial Ledger</TableHead>
                      <TableHead className="py-3 px-4 w-[110px] text-right font-bold text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((b) => (
                      <TableRow
                        key={b.id}
                        onClick={() => router.push(`/bookings/${b.id}`)}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80"
                      >
                        <TableCell className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center border border-emerald-100 shrink-0">
                              <CalendarCheck className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                {b.bookingNumber}
                              </span>
                              <span className="text-[11px] text-slate-500 truncate">
                                {b.trip?.title || "Direct Itinerary"}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <div className="flex flex-col text-xs">
                            <span className="font-semibold text-slate-800">{b.customer?.name}</span>
                            <span className="text-[11px] text-slate-500">
                              {b.customer?.phone} {b.customer?.email ? `• ${b.customer.email}` : ""}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-xs text-slate-600">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800">
                              {formatDateDisplay(b.travelStartDate)} → {formatDateDisplay(b.travelEndDate)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Booked on {formatDateDisplay(b.bookingDate)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <BookingStatusBadge status={b.status} />
                            <PaymentStatusBadge status={b.paymentStatus} />
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <div className="flex flex-col text-xs">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {formatCurrency(Number(b.totalAmount))}
                            </span>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-emerald-700 font-bold">
                                Paid: {formatCurrency(Number(b.paidAmount))}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-rose-700 font-bold">
                                Due: {formatCurrency(Number(b.balanceAmount))}
                              </span>
                            </div>
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
                                  Booking Actions
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/bookings/${b.id}`)}
                                  className="text-xs cursor-pointer rounded-md"
                                >
                                  <Eye className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                  View Booking Workspace
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/operations/${b.tripId}`)}
                                  className="text-xs cursor-pointer rounded-md text-indigo-600 font-medium"
                                >
                                  <Compass className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                                  Operations Workspace
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/trips/${b.tripId}`)}
                                  className="text-xs cursor-pointer rounded-md"
                                >
                                  <Layers className="mr-2 h-3.5 w-3.5 text-slate-400" />
                                  Open Trip Workspace
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(b.id, b.bookingNumber)}
                                  disabled={isReadOnly || deletingId === b.id}
                                  className="text-xs text-rose-600 hover:bg-rose-50 cursor-pointer rounded-md disabled:opacity-50"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-500" />
                                  {deletingId === b.id ? "Archiving..." : "Archive Booking"}
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
                {bookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => router.push(`/bookings/${b.id}`)}
                    className="p-4 space-y-2.5 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{b.bookingNumber}</h4>
                        <p className="text-[11px] text-slate-500">{b.trip?.title} • {b.customer?.name}</p>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <BookingStatusBadge status={b.status} />
                        <PaymentStatusBadge status={b.paymentStatus} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 pt-1">
                      <span>{formatCurrency(Number(b.totalAmount))}</span>
                      <span className="text-[11px] font-semibold text-rose-600">
                        Due: {formatCurrency(Number(b.balanceAmount))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Master Footer with Pagination */}
          <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{bookings.length}</strong> of{" "}
              <strong className="text-slate-800">{pagination.total}</strong> bookings
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
