"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IndianRupee,
  Search,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Eye,
  AlertCircle,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  X,
  CreditCard,
  Building2,
  ArrowUpRight,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  PaymentStatusBadge,
} from "@/components/booking/booking-status-badge";
import {
  paymentClient,
  bookingClient,
  PaymentWithRelations,
  BookingWithRelations,
} from "@/lib/api-client";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";

export default function PaymentsPage() {
  const router = useRouter();

  // Data states
  const [payments, setPayments] = React.useState<PaymentWithRelations[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Search & Filter states
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [methodFilter, setMethodFilter] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const [pagination, setPagination] = React.useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  // Add Payment Modal State
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [bookings, setBookings] = React.useState<BookingWithRelations[]>([]);
  const [loadingBookings, setLoadingBookings] = React.useState(false);
  const [selectedBookingId, setSelectedBookingId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState<PaymentMethod>(PaymentMethod.UPI);
  const [refNum, setRefNum] = React.useState("");
  const [receiptNum, setReceiptNum] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [savingPayment, setSavingPayment] = React.useState(false);

  // Debounce search (300ms)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch payments
  const fetchPayments = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await paymentClient.getPayments({
        search: debouncedSearch || undefined,
        status: statusFilter !== "all" ? (statusFilter as PaymentStatus) : undefined,
        paymentMethod: methodFilter !== "all" ? (methodFilter as PaymentMethod) : undefined,
        page,
        limit: 20,
        sortBy: "paymentDate",
        sortOrder: "desc",
      });

      if (res.success && res.data) {
        setPayments(res.data);
        setPagination(res.meta);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(err?.message || "Failed to load payments from database.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, methodFilter, page]);

  React.useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setMethodFilter("all");
    setPage(1);
  };

  const isFilterActive = search.trim() !== "" || statusFilter !== "all" || methodFilter !== "all";

  // Open Add Payment Modal
  const handleOpenAdd = async () => {
    setIsAddOpen(true);
    try {
      setLoadingBookings(true);
      const res = await bookingClient.getBookings({ limit: 50, sortBy: "createdAt", sortOrder: "desc" });
      if (res.success && res.data) {
        setBookings(res.data);
        if (res.data.length > 0 && !selectedBookingId) {
          setSelectedBookingId(res.data[0].id);
          setAmount(String(res.data[0].balanceAmount));
        }
      }
    } catch (err: any) {
      toast.error("Failed to load active bookings.");
    } finally {
      setLoadingBookings(false);
    }
  };

  const selectedBooking = React.useMemo(() => {
    return bookings.find((b) => b.id === selectedBookingId);
  }, [bookings, selectedBookingId]);

  React.useEffect(() => {
    if (selectedBooking) {
      setAmount(String(selectedBooking.balanceAmount));
    }
  }, [selectedBooking]);

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId) {
      toast.error("Please select a booking.");
      return;
    }
    const amt = Number(amount);
    if (amt <= 0) {
      toast.error("Please enter a positive payment amount.");
      return;
    }

    try {
      setSavingPayment(true);
      const res = await paymentClient.createPayment({
        bookingId: selectedBookingId,
        amount: amt,
        paymentMethod: method,
        referenceNumber: refNum.trim() || undefined,
        receiptNumber: receiptNum.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success && res.data) {
        toast.success(`Payment ${res.data.paymentNumber} recorded successfully!`);
        setIsAddOpen(false);
        await fetchPayments();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to record payment.");
    } finally {
      setSavingPayment(false);
    }
  };

  // Archive Payment
  const handleDelete = async (id: string, num: string) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Modifications are restricted.");
      return;
    }

    if (!confirm(`Archive payment ${num}? This will update the corresponding booking balance.`)) {
      return;
    }

    try {
      await paymentClient.deletePayment(id);
      toast.success(`Payment ${num} archived successfully.`);
      await fetchPayments();
    } catch (err: any) {
      toast.error(err?.message || "Failed to archive payment.");
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

  // KPI telemetry sums
  const totalCollected = React.useMemo(() => {
    return payments
      .filter((p) => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + Number(p.amount) - Number(p.refundedAmount || 0), 0);
  }, [payments]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Payments & Accounts Ledger" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                <CreditCard className="h-3 w-3 text-emerald-500" />
                Financial Accounts
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {pagination.total} transaction records
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Payments & Collections
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Customer deposits, advances, bank transfers, UPI transactions, and receipts
              </span>
            </div>

            {/* Quick Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              {[
                { label: "All", value: "all" },
                { label: "Completed", value: PaymentStatus.COMPLETED },
                { label: "Pending", value: PaymentStatus.PENDING },
                { label: "Refunded", value: PaymentStatus.REFUNDED },
                { label: "Failed", value: PaymentStatus.FAILED },
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
              onClick={handleOpenAdd}
              disabled={isReadOnly}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Log Payment
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
                  placeholder="Search by payment reference, booking number, customer name, receipt #..."
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
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Method:</span>
                  <select
                    value={methodFilter}
                    onChange={(e) => {
                      setMethodFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All Methods</option>
                    <option value={PaymentMethod.UPI}>UPI</option>
                    <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</option>
                    <option value={PaymentMethod.CASH}>Cash</option>
                    <option value={PaymentMethod.CARD}>Card</option>
                    <option value={PaymentMethod.CHEQUE}>Cheque</option>
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
              <p className="text-xs text-slate-500 font-medium">Fetching payment transactions from database...</p>
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
                onClick={() => fetchPayments()}
                className="text-xs h-8 rounded-lg cursor-pointer"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Table Content */}
          {!loading && !error && payments.length === 0 ? (
            <div className="p-12 text-center">
              <EmptyState
                icon={CreditCard}
                title={isFilterActive ? "No matching payments found" : "No payment records logged yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search or method filter."
                    : "Log customer advances, bank transfers, or full package payments to track your revenue ledger."
                }
                actionText={isFilterActive ? "Clear Filter" : "Log New Payment"}
                onAction={isFilterActive ? handleClearFilters : handleOpenAdd}
              />
            </div>
          ) : !loading && !error && (
            <div className="overflow-hidden">
              <div className="hidden lg:block overflow-x-auto max-h-[620px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[240px]">Payment Ref</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Booking & Customer</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Payment Date</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Method</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Status</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Amount Received</TableHead>
                      <TableHead className="py-3 px-4 w-[90px] text-right font-bold text-slate-600">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow
                        key={p.id}
                        onClick={() => router.push(`/bookings/${p.bookingId}`)}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors group border-b border-slate-100/80"
                      >
                        <TableCell className="py-3.5 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center border border-emerald-100 shrink-0">
                              <CreditCard className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                {p.paymentNumber}
                              </span>
                              {p.referenceNumber && (
                                <span className="text-[11px] text-slate-500 truncate font-mono">
                                  Ref: {p.referenceNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <div className="flex flex-col text-xs">
                            <span className="font-semibold text-slate-800">
                              {p.booking?.bookingNumber} ({p.customer?.name})
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {p.trip?.title || "Trip"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-xs text-slate-600">
                          {formatDateDisplay(p.paymentDate)}
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {p.paymentMethod}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <PaymentStatusBadge status={p.status} />
                        </TableCell>

                        <TableCell className="py-3.5 px-4">
                          <span className="font-extrabold text-emerald-700 text-sm">
                            {formatCurrency(Number(p.amount))}
                          </span>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDelete(p.id, p.paymentNumber)}
                            disabled={isReadOnly}
                            title="Archive Payment"
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="block lg:hidden divide-y divide-slate-100">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/bookings/${p.bookingId}`)}
                    className="p-4 space-y-2.5 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{p.paymentNumber}</h4>
                        <p className="text-[11px] text-slate-500">{p.booking?.bookingNumber} • {p.customer?.name}</p>
                      </div>
                      <PaymentStatusBadge status={p.status} />
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold text-slate-900 pt-1">
                      <span className="text-emerald-700">{formatCurrency(Number(p.amount))}</span>
                      <span className="text-[11px] font-normal text-slate-500">{formatDateDisplay(p.paymentDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Master Footer with Pagination */}
          <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{payments.length}</strong> of{" "}
              <strong className="text-slate-800">{pagination.total}</strong> records
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

        {/* ─── ADD PAYMENT MODAL ─── */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl">
            <form onSubmit={handleSavePayment}>
              <DialogHeader>
                <DialogTitle className="text-slate-900 font-bold text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  <span>Log Customer Payment</span>
                </DialogTitle>
                <DialogDescription className="text-slate-500 text-xs mt-1">
                  Select a confirmed booking to credit customer payment against outstanding balance.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 mt-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Target Booking *</label>
                  {loadingBookings ? (
                    <div className="h-9 flex items-center gap-2 text-slate-400 text-xs px-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading bookings...
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200">
                      No active bookings found.
                    </div>
                  ) : (
                    <Select
                      value={selectedBookingId}
                      onValueChange={(val) => val && setSelectedBookingId(val)}
                    >
                      <SelectTrigger className="h-9.5 text-xs bg-slate-50/50 border-slate-200">
                        <SelectValue placeholder="Choose a booking..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {bookings.map((b) => (
                          <SelectItem key={b.id} value={b.id} className="text-xs">
                            {b.bookingNumber} — {b.customer?.name} ({formatCurrency(Number(b.balanceAmount))} Due)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {selectedBooking && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">Remaining Due:</span>
                    <strong className="text-rose-600 font-extrabold text-sm">{formatCurrency(Number(selectedBooking.balanceAmount))}</strong>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Amount (₹) *</label>
                    <Input
                      type="number"
                      min={0.01}
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Payment Method</label>
                    <Select
                      value={method}
                      onValueChange={(val) => val && setMethod(val as PaymentMethod)}
                    >
                      <SelectTrigger className="h-9 text-xs bg-slate-50/50 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value={PaymentMethod.UPI}>UPI / GPay / PhonePe</SelectItem>
                        <SelectItem value={PaymentMethod.BANK_TRANSFER}>Bank Transfer (NEFT/RTGS)</SelectItem>
                        <SelectItem value={PaymentMethod.CASH}>Cash Deposit</SelectItem>
                        <SelectItem value={PaymentMethod.CARD}>Credit / Debit Card</SelectItem>
                        <SelectItem value={PaymentMethod.CHEQUE}>Cheque</SelectItem>
                        <SelectItem value={PaymentMethod.OTHER}>Other Method</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Transaction Ref / UTR</label>
                    <Input
                      value={refNum}
                      onChange={(e) => setRefNum(e.target.value)}
                      placeholder="e.g. UTR123456789"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Receipt # (Optional)</label>
                    <Input
                      value={receiptNum}
                      onChange={(e) => setReceiptNum(e.target.value)}
                      placeholder="e.g. REC-001"
                      className="h-9 bg-slate-50/50 border-slate-200 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Notes</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Payment remarks or reference details..."
                    rows={2}
                    className="bg-slate-50/50 border-slate-200 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 flex justify-end gap-2.5">
                <DialogClose
                  render={
                    <Button type="button" variant="outline" size="sm" className="bg-white border-slate-200 text-xs font-semibold rounded-xl">
                      Cancel
                    </Button>
                  }
                />
                <Button
                  type="submit"
                  disabled={savingPayment || bookings.length === 0}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 rounded-xl"
                >
                  {savingPayment ? "Recording..." : "Record Payment"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
