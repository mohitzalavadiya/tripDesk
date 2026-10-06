"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUpDown,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/loading-skeletons";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ReadOnlyBanner } from "@/components/shared/read-only-banner";
import { getErrorMessage } from "@/lib/utils";
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
import { PaymentStatusBadge } from "@/components/booking/booking-status-badge";
import {
  paymentClient,
  bookingClient,
  financeClient,
  PaymentWithRelations,
  BookingWithRelations,
} from "@/lib/api-client";
import { PaymentMethod } from "@prisma/client";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";
import { RecordSupplierPaymentDialog } from "@/components/finance/record-supplier-payment-dialog";

const METHOD_FILTER_LABELS: Record<string, string> = {
  all: "All",
  [PaymentMethod.UPI]: "UPI",
  [PaymentMethod.BANK_TRANSFER]: "Bank Transfer",
  [PaymentMethod.CASH]: "Cash",
  [PaymentMethod.CARD]: "Card",
  [PaymentMethod.CHEQUE]: "Cheque",
  [PaymentMethod.OTHER]: "Other",
};

export type PaymentDirectionType = "ALL" | "CUSTOMER" | "SUPPLIER";

export interface UnifiedPaymentItem {
  id: string;
  type: "CUSTOMER" | "SUPPLIER";
  paymentNumber: string;
  referenceNumber?: string | null;
  paymentDate: string | Date;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  partyName: string;
  partySubtext?: string | null;
  contextNumber?: string | null;
  contextTitle?: string | null;
  bookingId?: string | null;
  tripId?: string | null;
  rawCustomerPayment?: PaymentWithRelations;
  rawSupplierPayment?: any;
}

export default function PaymentsPage() {
  const router = useRouter();

  // Data states
  const [customerPayments, setCustomerPayments] = React.useState<PaymentWithRelations[]>([]);
  const [supplierPayments, setSupplierPayments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);

  // Filter & Search states
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [directionFilter, setDirectionFilter] = React.useState<PaymentDirectionType>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [methodFilter, setMethodFilter] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  // Dialog states
  const [isDisbursementOpen, setIsDisbursementOpen] = React.useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = React.useState(false);
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

  // Fetch unified payments (both customer collections and supplier disbursements)
  const fetchAllPayments = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [custRes, suppRes] = await Promise.all([
        paymentClient.getPayments({
          search: debouncedSearch || undefined,
          limit: 100,
          sortBy: "paymentDate",
          sortOrder: "desc",
        }),
        financeClient.getSupplierPayments({
          search: debouncedSearch || undefined,
        }),
      ]);

      if (custRes.success && custRes.data) {
        setCustomerPayments(custRes.data);
      }
      if (suppRes.success && suppRes.data) {
        setSupplierPayments(suppRes.data);
      }
    } catch (err: any) {
      if (err?.code === "READ_ONLY_ACCESS" || err?.statusCode === 403) {
        setIsReadOnly(true);
      }
      setError(getErrorMessage(err, "Unable to load payments ledger. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  React.useEffect(() => {
    fetchAllPayments();
  }, [fetchAllPayments]);

  // Unify and transform both payment streams
  const unifiedItems: UnifiedPaymentItem[] = React.useMemo(() => {
    const list: UnifiedPaymentItem[] = [];

    // 1. Customer Payments (Incoming / Collections)
    for (const p of customerPayments) {
      list.push({
        id: p.id,
        type: "CUSTOMER",
        paymentNumber: p.paymentNumber,
        referenceNumber: p.referenceNumber,
        paymentDate: p.paymentDate,
        amount: Number(p.amount),
        currency: p.currency || "INR",
        paymentMethod: p.paymentMethod,
        status: p.status,
        partyName: p.customer?.name || "Customer",
        partySubtext: p.customer?.phone || p.customer?.email || null,
        contextNumber: p.booking?.bookingNumber || null,
        contextTitle: p.trip?.title || "Trip Booking",
        bookingId: p.bookingId,
        tripId: p.tripId,
        rawCustomerPayment: p,
      });
    }

    // 2. Supplier Payments (Outgoing / Disbursements)
    for (const d of supplierPayments) {
      const payee = d.payeeName || d.supplier?.name || "Supplier / Vendor";
      list.push({
        id: d.id,
        type: "SUPPLIER",
        paymentNumber: d.paymentNumber,
        referenceNumber: d.referenceNumber,
        paymentDate: d.paymentDate,
        amount: Number(d.amount),
        currency: d.currency || "INR",
        paymentMethod: d.paymentMethod,
        status: d.status,
        partyName: payee,
        partySubtext: d.supplier?.type ? `Supplier • ${d.supplier.type}` : "Vendor Disbursement",
        contextNumber: d.payable?.payableNumber || d.booking?.bookingNumber || "Direct Disbursement",
        contextTitle: d.payable?.description || d.booking?.trip?.title || "Disbursement",
        bookingId: d.bookingId || d.booking?.id || null,
        tripId: d.booking?.trip?.id || null,
        rawSupplierPayment: d,
      });
    }

    // Sort descending by payment date
    return list.sort((a, b) => {
      const timeA = new Date(a.paymentDate).getTime();
      const timeB = new Date(b.paymentDate).getTime();
      return timeB - timeA;
    });
  }, [customerPayments, supplierPayments]);

  // Apply in-memory direction, method, and status filters
  const filteredItems = React.useMemo(() => {
    return unifiedItems.filter((item) => {
      // Direction filter
      if (directionFilter !== "ALL" && item.type !== directionFilter) {
        return false;
      }
      // Method filter
      if (methodFilter !== "all" && item.paymentMethod !== methodFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== "all" && String(item.status).toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      return true;
    });
  }, [unifiedItems, directionFilter, methodFilter, statusFilter]);

  // Overall financial summary metrics
  const summaryMetrics = React.useMemo(() => {
    let totalReceived = 0;
    let totalDisbursed = 0;
    let customerCount = 0;
    let supplierCount = 0;

    for (const item of unifiedItems) {
      if (item.type === "CUSTOMER") {
        totalReceived += item.amount;
        customerCount++;
      } else {
        totalDisbursed += item.amount;
        supplierCount++;
      }
    }

    return {
      totalReceived,
      totalDisbursed,
      netCashFlow: totalReceived - totalDisbursed,
      customerCount,
      supplierCount,
      totalCount: unifiedItems.length,
    };
  }, [unifiedItems]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  const handleClearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setDirectionFilter("ALL");
    setStatusFilter("all");
    setMethodFilter("all");
    setPage(1);
  };

  const isFilterActive =
    search.trim() !== "" ||
    directionFilter !== "ALL" ||
    statusFilter !== "all" ||
    methodFilter !== "all";

  // Open Log Customer Payment Modal
  const handleOpenAddCustomer = async () => {
    setIsAddCustomerOpen(true);
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
    } catch {
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

  const handleSaveCustomerPayment = async (e: React.FormEvent) => {
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
        setIsAddCustomerOpen(false);
        await fetchAllPayments();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to record payment.");
    } finally {
      setSavingPayment(false);
    }
  };

  // Archive Customer Payment
  const [confirmAction, setConfirmAction] = React.useState<{
    title: string;
    description: string;
    confirmText: string;
    variant?: "destructive" | "default" | "warning";
    action: () => Promise<void>;
  } | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const handleDeleteCustomerPayment = (id: string, num: string) => {
    if (isReadOnly) {
      toast.error("Subscription expired. Modifications are restricted.");
      return;
    }

    setConfirmAction({
      title: "Archive payment transaction?",
      description: `Archive payment transaction ${num}? This will recalculate the corresponding booking balance.`,
      confirmText: "Archive Payment",
      variant: "destructive",
      action: async () => {
        try {
          setActionLoading(true);
          await paymentClient.deletePayment(id);
          toast.success(`Payment ${num} archived successfully.`);
          setConfirmAction(null);
          await fetchAllPayments();
        } catch (err: any) {
          toast.error(getErrorMessage(err, "We couldn't archive the payment. Please try again."));
        } finally {
          setActionLoading(false);
        }
      },
    });
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
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Read-Only Banner */}
        {isReadOnly && <ReadOnlyBanner moduleName="Payments & Accounts Ledger" />}

        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                <CreditCard className="h-3 w-3 text-indigo-500 shrink-0" />
                Unified Payments Ledger
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {summaryMetrics.totalCount} total transactions
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Payments & Disbursements
              </h1>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Unified financial ledger tracking customer collections (received) and vendor disbursements (paid) in one place.
              </p>
            </div>

            {/* Quick KPI Cards Strip */}
            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl px-3 sm:px-3.5 py-2 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 truncate">
                    Total Received (Inflow)
                  </span>
                  <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600 shrink-0 ml-1" />
                </div>
                <p className="text-base sm:text-lg font-extrabold text-emerald-950 mt-0.5 truncate" title={formatCurrency(summaryMetrics.totalReceived)}>
                  {formatCurrency(summaryMetrics.totalReceived)}
                </p>
                <span className="text-[10px] font-medium text-emerald-800 truncate block">
                  {summaryMetrics.customerCount} customer receipts
                </span>
              </div>

              <div className="bg-purple-50/50 border border-purple-100 rounded-xl px-3 sm:px-3.5 py-2 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 truncate">
                    Total Disbursed (Outflow)
                  </span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-purple-600 shrink-0 ml-1" />
                </div>
                <p className="text-base sm:text-lg font-extrabold text-purple-950 mt-0.5 truncate" title={formatCurrency(summaryMetrics.totalDisbursed)}>
                  {formatCurrency(summaryMetrics.totalDisbursed)}
                </p>
                <span className="text-[10px] font-medium text-purple-800 truncate block">
                  {summaryMetrics.supplierCount} supplier disbursements
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 sm:px-3.5 py-2 min-w-0 col-span-1 min-[380px]:col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 truncate">
                    Net Cash Balance
                  </span>
                  <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 shrink-0 ml-1" />
                </div>
                <p
                  className={`text-base sm:text-lg font-extrabold mt-0.5 truncate ${
                    summaryMetrics.netCashFlow >= 0 ? "text-slate-900" : "text-rose-600"
                  }`}
                  title={formatCurrency(summaryMetrics.netCashFlow)}
                >
                  {formatCurrency(summaryMetrics.netCashFlow)}
                </p>
                <span className="text-[10px] font-medium text-slate-500 truncate block">
                  Collections minus disbursements
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 z-10 self-stretch sm:self-start lg:self-center w-full lg:w-auto">
            <Button
              onClick={handleOpenAddCustomer}
              disabled={isReadOnly}
              className="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9.5 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Log Customer Payment
            </Button>
            <Button
              onClick={() => setIsDisbursementOpen(true)}
              disabled={isReadOnly}
              className="w-full sm:w-auto justify-center bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9.5 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Record Supplier Payment
            </Button>
          </div>
        </div>

        {/* Master Unified Table Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Search & Filter Toolbar */}
          <div className="p-3.5 sm:p-5 border-b border-slate-100 space-y-3.5 bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by payment #, UTR / ref, customer, vendor..."
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

              {/* Filters Strip */}
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
                {/* Direction Filter Pill Group */}
                <div className="inline-flex overflow-x-auto no-scrollbar scrollbar-none flex-nowrap rounded-xl bg-slate-100 p-1 text-xs w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setDirectionFilter("ALL");
                      setPage(1);
                    }}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold text-xs shrink-0 whitespace-nowrap transition-all cursor-pointer flex-1 sm:flex-none text-center ${
                      directionFilter === "ALL"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All ({unifiedItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDirectionFilter("CUSTOMER");
                      setPage(1);
                    }}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold text-xs shrink-0 whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 sm:flex-none ${
                      directionFilter === "CUSTOMER"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-emerald-700 hover:text-emerald-900"
                    }`}
                  >
                    <ArrowDownLeft className="h-3 w-3 shrink-0" />
                    Customer ({summaryMetrics.customerCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDirectionFilter("SUPPLIER");
                      setPage(1);
                    }}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg font-bold text-xs shrink-0 whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 sm:flex-none ${
                      directionFilter === "SUPPLIER"
                        ? "bg-purple-600 text-white shadow-2xs"
                        : "text-purple-700 hover:text-purple-900"
                    }`}
                  >
                    <ArrowUpRight className="h-3 w-3 shrink-0" />
                    Supplier ({summaryMetrics.supplierCount})
                  </button>
                </div>

                {/* Method & Status Filters */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                  <Select
                    value={methodFilter}
                    onValueChange={(val) => {
                      if (val) {
                        setMethodFilter(val);
                        setPage(1);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all select-none w-full sm:w-[130px]">
                      <SelectValue placeholder="Method">
                        {(val) => (val === "all" ? "All Methods" : METHOD_FILTER_LABELS[val] ?? val)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-xl border border-slate-200/90 z-50">
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value={PaymentMethod.UPI}>UPI</SelectItem>
                      <SelectItem value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</SelectItem>
                      <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                      <SelectItem value={PaymentMethod.CARD}>Card</SelectItem>
                      <SelectItem value={PaymentMethod.CHEQUE}>Cheque</SelectItem>
                      <SelectItem value={PaymentMethod.OTHER}>Other</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={statusFilter}
                    onValueChange={(val) => {
                      if (val) {
                        setStatusFilter(val);
                        setPage(1);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 transition-all select-none w-full sm:w-[125px]">
                      <SelectValue placeholder="Status">
                        {(val) => (val === "all" ? "All Statuses" : val)}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl bg-white/95 backdrop-blur-md p-1.5 text-slate-800 shadow-xl border border-slate-200/90 z-50">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="REFUNDED">Refunded</SelectItem>
                      <SelectItem value="FAILED">Failed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-4">
              <TableSkeleton rows={8} />
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-8">
              <ErrorState
                title="Unable to load payments ledger"
                description={error}
                onRetry={() => fetchAllPayments()}
              />
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filteredItems.length === 0 && (
            <div className="p-12 text-center">
              <EmptyState
                icon={CreditCard}
                title={isFilterActive ? "No matching payment records found" : "No payment records logged yet"}
                description={
                  isFilterActive
                    ? "Try adjusting your search query, type direction, or payment method filter."
                    : "Log customer advances or record supplier disbursements to maintain your complete financial ledger."
                }
                actionText={isFilterActive ? "Clear Filter" : "Log Customer Payment"}
                onAction={isFilterActive ? handleClearFilters : handleOpenAddCustomer}
              />
            </div>
          )}

          {/* Unified Payments Table */}
          {!loading && !error && filteredItems.length > 0 && (
            <div className="overflow-hidden">
              <div className="hidden lg:block overflow-x-auto max-h-[640px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm shadow-2xs">
                    <TableRow className="hover:bg-transparent bg-slate-50/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[220px]">Payment Ref</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[150px]">Direction / Type</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Party (Customer / Payee)</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600">Booking / Linked Obligation</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[120px]">Date</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[110px]">Method</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600 w-[110px]">Status</TableHead>
                      <TableHead className="py-3 px-4 font-bold text-slate-600 text-right w-[140px]">Amount</TableHead>
                      <TableHead className="py-3 px-4 w-[70px] text-right font-bold text-slate-600">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map((item) => {
                      const isCustomer = item.type === "CUSTOMER";
                      return (
                        <TableRow
                          key={`${item.type}-${item.id}`}
                          onClick={() => {
                            if (item.bookingId) {
                              router.push(`/bookings/${item.bookingId}`);
                            } else if (item.tripId) {
                              router.push(`/operations/${item.tripId}`);
                            }
                          }}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors group border-b border-slate-100/80 ${
                            isCustomer ? "hover:bg-emerald-50/20" : "hover:bg-purple-50/20"
                          }`}
                        >
                          {/* 1. Payment Ref */}
                          <TableCell className="py-3.5 px-4 font-medium text-slate-900">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-8 w-8 rounded-full font-bold text-xs flex items-center justify-center border shrink-0 ${
                                  isCustomer
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                                    : "bg-purple-50 text-purple-700 border-purple-200/80"
                                }`}
                              >
                                {isCustomer ? (
                                  <ArrowDownLeft className="h-4 w-4" />
                                ) : (
                                  <ArrowUpRight className="h-4 w-4" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                  {item.paymentNumber}
                                </span>
                                {item.referenceNumber && (
                                  <span className="text-[11px] text-slate-500 truncate font-mono">
                                    Ref: {item.referenceNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* 2. Type / Direction */}
                          <TableCell className="py-3.5 px-4">
                            {isCustomer ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] gap-1 shrink-0 select-none">
                                <ArrowDownLeft className="h-3 w-3 text-emerald-600" />
                                Customer (IN)
                              </Badge>
                            ) : (
                              <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-bold text-[10px] gap-1 shrink-0 select-none">
                                <ArrowUpRight className="h-3 w-3 text-purple-600" />
                                Supplier (OUT)
                              </Badge>
                            )}
                          </TableCell>

                          {/* 3. Party */}
                          <TableCell className="py-3.5 px-4">
                            <div className="flex flex-col text-xs">
                              <span className="font-bold text-slate-900">
                                {item.partyName}
                              </span>
                              {item.partySubtext && (
                                <span className="text-[11px] text-slate-500">
                                  {item.partySubtext}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          {/* 4. Booking / Context */}
                          <TableCell className="py-3.5 px-4">
                            <div className="flex flex-col text-xs">
                              <span className="font-semibold text-slate-800">
                                {item.contextNumber || "—"}
                              </span>
                              <span className="text-[11px] text-slate-500 truncate max-w-[220px]">
                                {item.contextTitle || "—"}
                              </span>
                            </div>
                          </TableCell>

                          {/* 5. Date */}
                          <TableCell className="py-3.5 px-4 text-xs text-slate-600">
                            {formatDateDisplay(item.paymentDate)}
                          </TableCell>

                          {/* 6. Method */}
                          <TableCell className="py-3.5 px-4">
                            <Badge variant="outline" className="text-[10px] font-bold">
                              {METHOD_FILTER_LABELS[item.paymentMethod] ?? item.paymentMethod}
                            </Badge>
                          </TableCell>

                          {/* 7. Status */}
                          <TableCell className="py-3.5 px-4">
                            <PaymentStatusBadge status={item.status} />
                          </TableCell>

                          {/* 8. Amount */}
                          <TableCell className="py-3.5 px-4 text-right">
                            <span
                              className={`font-extrabold text-sm ${
                                isCustomer ? "text-emerald-700" : "text-purple-700"
                              }`}
                            >
                              {isCustomer ? "+" : "-"} {formatCurrency(item.amount)}
                            </span>
                          </TableCell>

                          {/* 9. Actions */}
                          <TableCell
                            className="py-3.5 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isCustomer ? (
                              <button
                                onClick={() => handleDeleteCustomerPayment(item.id, item.paymentNumber)}
                                disabled={isReadOnly}
                                title="Archive Payment"
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer disabled:opacity-50 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View */}
              <div className="block lg:hidden divide-y divide-slate-100">
                {paginatedItems.map((item) => {
                  const isCustomer = item.type === "CUSTOMER";
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      onClick={() => {
                        if (item.bookingId) router.push(`/bookings/${item.bookingId}`);
                        else if (item.tripId) router.push(`/operations/${item.tripId}`);
                      }}
                      className="p-4 space-y-2.5 hover:bg-slate-50/50 cursor-pointer active:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            {isCustomer ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[9px] px-1.5 py-0">
                                IN
                              </Badge>
                            ) : (
                              <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-bold text-[9px] px-1.5 py-0">
                                OUT
                              </Badge>
                            )}
                            <h4 className="font-bold text-slate-900 text-xs">{item.paymentNumber}</h4>
                          </div>
                          <p className="text-xs font-semibold text-slate-800">{item.partyName}</p>
                          <p className="text-[11px] text-slate-500">
                            {item.contextNumber} • {item.contextTitle}
                          </p>
                        </div>
                        <PaymentStatusBadge status={item.status} />
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-slate-100">
                        <span className={isCustomer ? "text-emerald-700" : "text-purple-700"}>
                          {isCustomer ? "+" : "-"} {formatCurrency(item.amount)}
                        </span>
                        <span className="text-[11px] font-normal text-slate-500">
                          {formatDateDisplay(item.paymentDate)} • {METHOD_FILTER_LABELS[item.paymentMethod] ?? item.paymentMethod}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Master Footer with Pagination */}
              <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
                <span>
                  Showing <strong className="text-slate-800">{paginatedItems.length}</strong> of{" "}
                  <strong className="text-slate-800">{filteredItems.length}</strong> filtered records
                </span>

                {totalPages > 1 && (
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
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages || loading}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="h-8 px-2.5 text-xs rounded-lg cursor-pointer"
                    >
                      Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── RECORD SUPPLIER / PAYABLE DISBURSEMENT MODAL ─── */}
        <RecordSupplierPaymentDialog
          open={isDisbursementOpen}
          onOpenChange={setIsDisbursementOpen}
          onSuccess={() => {
            fetchAllPayments();
          }}
        />

        {/* ─── LOG CUSTOMER PAYMENT MODAL ─── */}
        <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
          <DialogContent className="bg-white border border-slate-200 rounded-2xl max-w-md p-6 shadow-xl">
            <form onSubmit={handleSaveCustomerPayment}>
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
                        <SelectValue placeholder="Choose a booking...">
                          {(val) => {
                            if (!val) return undefined;
                            const b = bookings.find((item) => item.id === val);
                            return b
                              ? `${b.bookingNumber} — ${b.customer?.name || "Customer"} (${formatCurrency(
                                  Number(b.balanceAmount)
                                )} Due)`
                              : val;
                          }}
                        </SelectValue>
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
                    <strong className="text-rose-600 font-extrabold text-sm">
                      {formatCurrency(Number(selectedBooking.balanceAmount))}
                    </strong>
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-white border-slate-200 text-xs font-semibold rounded-xl"
                    >
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
    </div>
  );
}
