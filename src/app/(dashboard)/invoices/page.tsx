"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt,
  Search,
  Plus,
  Eye,
  FileDown,
  CreditCard,
  AlertOctagon,
  Trash2,
  Calendar,
  IndianRupee,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreVertical,
  Filter,
  X,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TableSkeleton } from "@/components/shared/loading-skeletons";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/utils";
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { RecordPaymentModal } from "@/components/invoices/record-payment-modal";
import { CancelInvoiceModal } from "@/components/invoices/cancel-invoice-modal";

const INVOICE_STATUS_FILTER_LABELS: Record<string, string> = {
  ALL: "All",
  DRAFT: "Draft",
  ISSUED: "Issued",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

interface InvoiceListItem {
  id: string;
  invoiceNumber: string | null;
  status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  customerName: string;
  bookingNumber: string;
  isOverdue: boolean;
}

interface SummaryData {
  totalInvoices: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
}

export default function InvoicesListPage() {
  const router = useRouter();

  const [invoices, setInvoices] = React.useState<InvoiceListItem[]>([]);
  const [summary, setSummary] = React.useState<SummaryData>({
    totalInvoices: 0,
    totalBilled: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalOverdue: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [overdueFilter, setOverdueFilter] = React.useState<boolean>(false);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);

  // Modals state
  const [payModalInvoice, setPayModalInvoice] = React.useState<{
    id: string;
    invoiceNumber: string | null;
    balanceAmount: number;
  } | null>(null);

  const [cancelModalInvoice, setCancelModalInvoice] = React.useState<{
    id: string;
    invoiceNumber: string | null;
    totalAmount: number;
  } | null>(null);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/invoices/summary");
      if (res.ok) {
        const json = await res.json();
        setSummary(json.data || json);
      }
    } catch {
      // Non-blocking
    }
  };

  const fetchInvoices = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "15");
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (overdueFilter) params.set("overdue", "true");

      const res = await fetch(`/api/invoices?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || json.message || "Failed to load invoices.");
      }

      setInvoices(json.data || []);
      if (json.meta) {
        setTotalPages(json.meta.totalPages || 1);
        setTotalCount(json.meta.total || 0);
      }
    } catch (err: any) {
      setError(getErrorMessage(err, "Unable to load customer invoices. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, overdueFilter]);

  React.useEffect(() => {
    fetchSummary();
  }, []);

  React.useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const [confirmAction, setConfirmAction] = React.useState<{
    title: string;
    description: string;
    confirmText: string;
    variant?: "destructive" | "default" | "warning";
    action: () => Promise<void>;
  } | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const handleDeleteDraft = (id: string, invoiceNumber?: string) => {
    const ref = invoiceNumber ? `draft invoice ${invoiceNumber}` : "this draft invoice";
    setConfirmAction({
      title: "Delete draft invoice?",
      description: `Are you sure you want to permanently delete ${ref}? This action cannot be undone.`,
      confirmText: "Delete Draft",
      variant: "destructive",
      action: async () => {
        try {
          setActionLoading(true);
          setDeletingId(id);
          const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
          const json = await res.json();

          if (!res.ok) {
            throw new Error(json.error?.message || json.message || "Failed to delete draft invoice.");
          }

          toast.success("Draft invoice deleted successfully.");
          setConfirmAction(null);
          fetchSummary();
          fetchInvoices();
        } catch (err: any) {
          toast.error(getErrorMessage(err, "We couldn't delete the draft invoice. Please try again."));
        } finally {
          setActionLoading(false);
          setDeletingId(null);
        }
      },
    });
  };

  const formatINR = (val: number | string | any) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const renderInvoiceStatus = (status: string, isOverdue: boolean) => {
    if (status === "PARTIALLY_PAID" || status === "ISSUED") {
      return (
        <div className="flex flex-col gap-1 items-start">
          <StatusBadge status={status} />
          {isOverdue && <StatusBadge status="OVERDUE" />}
        </div>
      );
    }
    return <StatusBadge status={status} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* ══════════════════════════════════════════════════ */}
        {/* 1. TOP HERO COMMAND HEADER */}
        {/* ══════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Left Title & Telemetry */}
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Receipt className="h-3 w-3 text-indigo-500" />
                Billing & Collections
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {totalCount} customer invoices
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                Customer Invoices
              </h1>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
                Manage billing snapshots, track customer payments, and issue official travel invoices
              </span>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3 z-10 self-start lg:self-center">
            <Button
              onClick={() => router.push("/bookings")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              Create from Booking
            </Button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════ */}
        {/* 2. SUMMARY METRICS CARDS */}
        {/* ══════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">Total Invoices</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{summary.totalInvoices}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">Total Billed</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatINR(summary.totalBilled)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-emerald-600">Total Collected</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{formatINR(summary.totalPaid)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-blue-600">Outstanding Balance</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{formatINR(summary.totalOutstanding)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs col-span-2 lg:col-span-1">
            <p className="text-xs font-medium text-amber-600">Overdue Invoices</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{summary.totalOverdue}</p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════ */}
        {/* 3. INVOICES MASTER WORKSPACE CARD (SEARCH + TABLE) */}
        {/* ══════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          {/* Master Toolbar Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3.5 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by Invoice #, Customer, Phone, Booking #..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 pr-9 h-9.5 text-xs bg-slate-50/70 border-slate-200 hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 focus-visible:bg-white rounded-xl transition-all"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Status filter buttons */}
                <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50 text-xs overflow-x-auto no-scrollbar">
                  {["ALL", "DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setStatusFilter(st);
                        setOverdueFilter(false);
                        setPage(1);
                      }}
                      className={`rounded-lg px-2.5 py-1 font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        statusFilter === st && !overdueFilter
                          ? "bg-white text-slate-900 shadow-sm font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {INVOICE_STATUS_FILTER_LABELS[st] ?? st}
                    </button>
                  ))}
                </div>

                <Button
                  variant={overdueFilter ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => {
                    setOverdueFilter(!overdueFilter);
                    setStatusFilter("ALL");
                    setPage(1);
                  }}
                  className="text-xs h-8 cursor-pointer shrink-0 rounded-lg"
                >
                  <Clock className="mr-1 h-3.5 w-3.5" />
                  Overdue Only
                </Button>

                {(search || statusFilter !== "ALL" || overdueFilter) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("ALL");
                      setOverdueFilter(false);
                      setPage(1);
                    }}
                    className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 shrink-0 cursor-pointer font-semibold rounded-lg"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={6} />
          </div>
        ) : error ? (
          <div className="p-8">
            <ErrorState
              title="Unable to load invoices"
              description={error}
              onRetry={fetchInvoices}
            />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <Receipt className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-900">No invoices found</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              {search || statusFilter !== "ALL" || overdueFilter
                ? "No invoices match the selected filter criteria."
                : "Create customer invoices from confirmed bookings."}
            </p>
            <Button
              onClick={() => router.push("/bookings")}
              size="sm"
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer"
            >
              Go to Confirmed Bookings
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm text-[11px] uppercase font-bold text-slate-600 shadow-2xs">
                <TableRow>
                  <TableHead className="w-[120px] font-bold text-slate-700">Invoice #</TableHead>
                  <TableHead className="font-bold text-slate-700">Customer</TableHead>
                  <TableHead className="font-bold text-slate-700">Booking Ref</TableHead>
                  <TableHead className="font-bold text-slate-700">Invoice Date</TableHead>
                  <TableHead className="font-bold text-slate-700">Due Date</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Total Billed</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Paid</TableHead>
                  <TableHead className="text-right font-bold text-slate-700">Balance Due</TableHead>
                  <TableHead className="font-bold text-slate-700">Status</TableHead>
                  <TableHead className="w-[60px] text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold text-slate-900">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-blue-600 hover:underline flex items-center gap-1 font-mono"
                      >
                        {inv.invoiceNumber || (
                          <span className="text-slate-400 font-sans italic font-normal">Draft</span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">
                      {inv.customerName}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {inv.bookingNumber}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatDate(inv.invoiceDate)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {formatDate(inv.dueDate)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      {formatINR(inv.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      {formatINR(inv.paidAmount)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {formatINR(inv.balanceAmount)}
                    </TableCell>
                    <TableCell>{renderInvoiceStatus(inv.status, inv.isOverdue)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-48 bg-white shadow-lg">
                          <DropdownMenuLabel className="text-xs text-slate-500">Invoice Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => router.push(`/invoices/${inv.id}`)}
                            className="cursor-pointer text-xs"
                          >
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            {inv.status === "DRAFT" ? "Edit Draft" : "View Details"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => window.open(`/api/invoices/${inv.id}/pdf`, "_blank")}
                            className="cursor-pointer text-xs"
                          >
                            <FileDown className="mr-2 h-3.5 w-3.5" />
                            Download PDF
                          </DropdownMenuItem>

                          {(inv.status === "ISSUED" || inv.status === "PARTIALLY_PAID") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  setPayModalInvoice({
                                    id: inv.id,
                                    invoiceNumber: inv.invoiceNumber,
                                    balanceAmount: Number(inv.balanceAmount),
                                  })
                                }
                                className="cursor-pointer text-xs text-emerald-700 font-semibold"
                              >
                                <CreditCard className="mr-2 h-3.5 w-3.5" />
                                Record Payment
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setCancelModalInvoice({
                                    id: inv.id,
                                    invoiceNumber: inv.invoiceNumber,
                                    totalAmount: Number(inv.totalAmount),
                                  })
                                }
                                className="cursor-pointer text-xs text-red-600"
                              >
                                <AlertOctagon className="mr-2 h-3.5 w-3.5" />
                                Cancel Invoice
                              </DropdownMenuItem>
                            </>
                          )}

                          {inv.status === "DRAFT" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteDraft(inv.id)}
                                disabled={deletingId === inv.id}
                                className="cursor-pointer text-xs text-red-600"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete Draft
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination bar */}
        {!loading && totalCount > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <span>
              Showing {invoices.length} of {totalCount} invoices
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-7 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-7 text-xs"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {payModalInvoice && (
        <RecordPaymentModal
          isOpen={!!payModalInvoice}
          onClose={() => setPayModalInvoice(null)}
          invoiceId={payModalInvoice.id}
          invoiceNumber={payModalInvoice.invoiceNumber}
          balanceAmount={payModalInvoice.balanceAmount}
          onSuccess={() => {
            fetchSummary();
            fetchInvoices();
          }}
        />
      )}

      {/* Cancel Invoice Modal */}
      {cancelModalInvoice && (
        <CancelInvoiceModal
          isOpen={!!cancelModalInvoice}
          onClose={() => setCancelModalInvoice(null)}
          invoiceId={cancelModalInvoice.id}
          invoiceNumber={cancelModalInvoice.invoiceNumber}
          totalAmount={cancelModalInvoice.totalAmount}
          onSuccess={() => {
            fetchSummary();
            fetchInvoices();
          }}
        />
      )}

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
