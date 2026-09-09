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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { RecordPaymentModal } from "@/components/invoices/record-payment-modal";
import { CancelInvoiceModal } from "@/components/invoices/cancel-invoice-modal";

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
      setError(err?.message || "Error loading invoices.");
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

  const handleDeleteDraft = async (id: string) => {
    if (!confirm("Are you sure you want to delete this draft invoice? This action cannot be undone.")) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || json.message || "Failed to delete draft invoice.");
      }

      toast.success("Draft invoice deleted successfully.");
      fetchSummary();
      fetchInvoices();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete draft.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatINR = (val: number | string | any) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    if (status === "DRAFT") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
          DRAFT
        </span>
      );
    }
    if (status === "PAID") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" /> PAID
        </span>
      );
    }
    if (status === "CANCELLED") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
          CANCELLED
        </span>
      );
    }
    if (status === "PARTIALLY_PAID") {
      return (
        <div className="flex flex-col gap-1 items-start">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            PARTIALLY PAID
          </span>
          {isOverdue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.2 text-[10px] font-bold text-amber-700 border border-amber-200">
              <Clock className="h-2.5 w-2.5" /> OVERDUE
            </span>
          )}
        </div>
      );
    }
    // ISSUED
    return (
      <div className="flex flex-col gap-1 items-start">
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
          ISSUED
        </span>
        {isOverdue && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.2 text-[10px] font-bold text-amber-700 border border-amber-200">
            <Clock className="h-2.5 w-2.5" /> OVERDUE
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ══════════════════════════════════════════════════ */}
      {/* 1. PAGE HEADER */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-slate-700" />
            Customer Invoices
          </h1>
          <p className="text-sm text-slate-500">
            Manage billing snapshots, track customer payments, and issue official travel invoices.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push("/bookings")}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create from Booking
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* 2. SUMMARY METRICS CARDS */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Invoices</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{summary.totalInvoices}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Total Billed</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatINR(summary.totalBilled)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-emerald-600">Total Collected</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{formatINR(summary.totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-blue-600">Outstanding Balance</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{formatINR(summary.totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm col-span-2 lg:col-span-1">
          <p className="text-xs font-medium text-amber-600">Overdue Invoices</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{summary.totalOverdue}</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* 3. FILTERS & SEARCH BAR */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Invoice #, Customer, Phone, Booking #..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter buttons */}
          <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50 text-xs">
            {["ALL", "DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setOverdueFilter(false);
                  setPage(1);
                }}
                className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                  statusFilter === st && !overdueFilter
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st === "ALL" ? "All" : st.replace("_", " ")}
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
            className="text-xs h-8"
          >
            <Clock className="mr-1 h-3.5 w-3.5" />
            Overdue Only
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* 4. INVOICES TABLE */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm font-semibold text-slate-900">{error}</p>
            <Button onClick={fetchInvoices} variant="outline" size="sm" className="mt-4">
              Try Again
            </Button>
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
              className="mt-4 bg-slate-900 text-white"
            >
              Go to Confirmed Bookings
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
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
                  <TableRow key={inv.id} className="hover:bg-slate-50/80">
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
                    <TableCell>{getStatusBadge(inv.status, inv.isOverdue)}</TableCell>
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
    </div>
  );
}
