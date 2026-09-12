"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Receipt,
  ArrowLeft,
  Download,
  Printer,
  CreditCard,
  Building,
  User,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertOctagon,
  Loader2,
  ExternalLink,
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
import { toast } from "sonner";
import { RecordPaymentModal } from "@/components/invoices/record-payment-modal";

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface InvoiceDetail {
  id: string;
  agencyId?: string;
  bookingId: string;
  invoiceNumber: string | null;
  status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
  invoiceDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  discountType: "FIXED" | "PERCENTAGE" | null;
  discountValue: number | null;
  discountAmount: number;
  taxableAmount?: number | string | null;
  taxAmount?: number | string | null;
  taxRate?: number | string | null;
  taxMode?: "EXCLUSIVE" | "INCLUSIVE" | null;
  gstTreatment?: "INTRA_STATE" | "INTER_STATE" | "NON_GST_EXEMPT" | null;
  cgstAmount?: number | string | null;
  sgstAmount?: number | string | null;
  igstAmount?: number | string | null;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  customerSnapshot: any;
  bookingSnapshot: any;
  agencySnapshot: any;
  notes: string | null;
  paymentInstructions: string | null;
  internalNotes: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  isOverdue?: boolean;
  items: InvoiceItem[];
  payments: Array<{
    id: string;
    paymentNumber: string;
    amount: number | string;
    paymentDate: string;
    paymentMethod: string;
    status: string;
    referenceNumber?: string | null;
    notes?: string | null;
  }>;
  booking?: {
    id: string;
    bookingNumber: string;
    status: string;
    bookingDate?: string | null;
    travelStartDate: string | null;
    travelEndDate: string | null;
    currency?: string;
    totalAmount?: number | string;
    paidAmount?: number | string;
    balanceAmount?: number | string;
    notes?: string | null;
    customer?: {
      id: string;
      name: string;
      phone: string;
      email?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      postalCode?: string | null;
    } | null;
    trip?: {
      id: string;
      title: string;
      tripNumber: string;
      startDate?: string | null;
      endDate?: string | null;
      travelers?: Array<{ id: string; name: string; type: string }>;
    } | null;
    quotation?: {
      id: string;
      quotationNumber: string;
      title?: string | null;
      items?: Array<{
        id: string;
        name: string;
        description?: string | null;
        quantity: number;
        sellingPrice?: number | string | null;
        unitPrice?: number | string | null;
        totalPrice?: number | string | null;
        sortOrder: number;
      }>;
    } | null;
  } | null;
  agency?: {
    id?: string;
    name: string;
    phone: string;
    email: string;
    address: string | null;
    logo?: string | null;
  } | null;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CASH: "Cash",
  CARD: "Card",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = params.id;

  const [invoice, setInvoice] = React.useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showPayModal, setShowPayModal] = React.useState(false);

  const fetchInvoice = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || json.message || "Failed to load invoice.");
      }

      const invData = json.data || json;
      setInvoice(invData);
    } catch (err: any) {
      setError(err?.message || "Failed to load invoice details.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  React.useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId, fetchInvoice]);

  const formatDate = (dateVal: string | null | undefined) => {
    if (!dateVal) return "—";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatINR = (val: number | string | null | undefined) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-center p-8 bg-slate-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
        <h3 className="text-xs font-bold text-slate-700">Loading invoice document...</h3>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] text-center p-8 bg-slate-50/50">
        <AlertCircle className="h-12 w-12 text-slate-400 mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Invoice Not Found</h3>
        <p className="text-xs text-slate-500 max-w-md mt-1">
          {error || "The requested invoice record does not exist or has been archived."}
        </p>
        <Link href="/bookings" className="mt-4">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 cursor-pointer">
            Back to Bookings
          </Button>
        </Link>
      </div>
    );
  }

  // Live Authoritative Financials
  const liveTotal = invoice.booking?.totalAmount !== undefined
    ? Number(invoice.booking.totalAmount)
    : Number(invoice.totalAmount);

  const livePaid = invoice.booking?.paidAmount !== undefined
    ? Number(invoice.booking.paidAmount)
    : Number(invoice.paidAmount);

  const liveBalance = invoice.booking?.balanceAmount !== undefined
    ? Number(invoice.booking.balanceAmount)
    : Number(invoice.balanceAmount);

  const discountAmount = Number(invoice.discountAmount || 0);
  const subtotal = Number(invoice.subtotal || liveTotal + discountAmount);

  // Agency info
  const agencyName = invoice.agency?.name || (invoice.agencySnapshot as any)?.name || "TripDesk Travel Agency";
  const agencyPhone = invoice.agency?.phone || (invoice.agencySnapshot as any)?.phone || "";
  const agencyEmail = invoice.agency?.email || (invoice.agencySnapshot as any)?.email || "";
  const agencyAddress = invoice.agency?.address || (invoice.agencySnapshot as any)?.address || "";

  // Customer info
  const customerName = invoice.booking?.customer?.name || (invoice.customerSnapshot as any)?.name || "Valued Customer";
  const customerPhone = invoice.booking?.customer?.phone || (invoice.customerSnapshot as any)?.phone || "";
  const customerEmail = invoice.booking?.customer?.email || (invoice.customerSnapshot as any)?.email || "";
  const customerFullAddress = [
    invoice.booking?.customer?.address,
    invoice.booking?.customer?.city,
    invoice.booking?.customer?.state,
    invoice.booking?.customer?.postalCode,
    invoice.booking?.customer?.country,
  ].filter(Boolean).join(", ") || (invoice.customerSnapshot as any)?.address || "";

  // Booking / Trip info
  const bookingNumber = invoice.booking?.bookingNumber || (invoice.bookingSnapshot as any)?.bookingNumber || "—";
  const tripTitle = invoice.booking?.trip?.title || (invoice.bookingSnapshot as any)?.tripTitle || "Travel Package";
  const travelDates = invoice.booking?.travelStartDate
    ? `${formatDate(invoice.booking.travelStartDate)} → ${formatDate(invoice.booking.travelEndDate)}`
    : (invoice.bookingSnapshot as any)?.travelStartDate
    ? `${formatDate((invoice.bookingSnapshot as any).travelStartDate)} → ${formatDate((invoice.bookingSnapshot as any).travelEndDate)}`
    : "Dates TBD";

  // Itemized line items derivation
  const quotationItems = invoice.booking?.quotation?.items;
  const hasQuotationItems = quotationItems && quotationItems.length > 0;
  const hasInvoiceItems = invoice.items && invoice.items.length > 0;

  const renderStatusBadge = () => {
    switch (invoice.status) {
      case "PAID":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold text-xs px-3 py-1">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
            PAID
          </Badge>
        );
      case "PARTIALLY_PAID":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold text-xs px-3 py-1">
            <Clock className="h-3.5 w-3.5 mr-1 text-amber-600" />
            PARTIALLY PAID
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-bold text-xs px-3 py-1">
            <AlertOctagon className="h-3.5 w-3.5 mr-1 text-rose-600" />
            CANCELLED
          </Badge>
        );
      case "ISSUED":
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 font-bold text-xs px-3 py-1">
            ISSUED
          </Badge>
        );
      case "DRAFT":
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 font-bold text-xs px-3 py-1">
            DRAFT
          </Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <div className="max-w-[1050px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Breadcrumb & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center gap-2.5">
            <Link
              href={`/bookings/${invoice.bookingId}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  <Link href={`/bookings/${invoice.bookingId}`} className="hover:underline">
                    Booking {invoice.booking?.bookingNumber || "Record"}
                  </Link> /
                </span>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  {invoice.invoiceNumber || "Draft Invoice"}
                </span>
                {renderStatusBadge()}
                {invoice.isOverdue && invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[10px]">
                    OVERDUE
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/bookings/${invoice.bookingId}`}>
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-8.5 rounded-xl shadow-2xs cursor-pointer"
              >
                <Layers className="h-3.5 w-3.5 mr-1 text-slate-400" />
                Booking Record
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-8.5 rounded-xl shadow-2xs cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-slate-500" />
              Print
            </Button>

            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-slate-50 border-slate-200 text-xs font-semibold h-8.5 rounded-xl shadow-2xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 mr-1 text-slate-500" />
                Download PDF
              </Button>
            </a>

            {liveBalance > 0 && invoice.status !== "CANCELLED" && (
              <Button
                size="sm"
                onClick={() => setShowPayModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8.5 px-3.5 rounded-xl shadow-xs gap-1.5 cursor-pointer"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Record Payment
              </Button>
            )}
          </div>
        </div>

        {/* Cancellation Notice Banner */}
        {invoice.status === "CANCELLED" && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
            <AlertOctagon className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs text-rose-900">
              <strong className="font-bold text-sm block">Invoice Cancelled</strong>
              <p className="text-rose-700">
                This invoice was cancelled on {formatDate(invoice.cancelledAt || invoice.invoiceDate)}.
                {invoice.cancellationReason && ` Reason: ${invoice.cancellationReason}`}
              </p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* INVOICE DOCUMENT PAPER CARD */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-10 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
          {/* Header Row: Agency Branding + Invoice Number */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 border-b border-slate-100 pb-8">
            {/* Agency Details */}
            <div className="space-y-2 max-w-sm">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-xs">
                  {agencyName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                    {agencyName}
                  </h2>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-0.5 pt-1">
                {agencyAddress && <p>{agencyAddress}</p>}
                {agencyPhone && <p>Phone: {agencyPhone}</p>}
                {agencyEmail && <p>Email: {agencyEmail}</p>}
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="text-left sm:text-right space-y-2">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">
                  Tax Invoice
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                  {invoice.invoiceNumber || "INV-DRAFT"}
                </h1>
              </div>

              <div className="text-xs text-slate-600 space-y-1 pt-1 font-medium">
                <p>
                  <span className="text-slate-400">Invoice Date: </span>
                  <strong>{formatDate(invoice.invoiceDate)}</strong>
                </p>
                <p>
                  <span className="text-slate-400">Due Date: </span>
                  <strong>{formatDate(invoice.dueDate)}</strong>
                </p>
                <div className="pt-1 flex items-center sm:justify-end gap-2">
                  <span className="text-slate-400">Status: </span>
                  {renderStatusBadge()}
                </div>
              </div>
            </div>
          </div>

          {/* Customer (Billed To) & Booking Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/70 p-5 rounded-2xl border border-slate-100 text-xs">
            {/* Bill To */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <User className="h-3 w-3" />
                Billed To
              </span>
              <strong className="text-sm font-bold text-slate-900 block">
                {customerName}
              </strong>
              {customerPhone && <p className="text-slate-600 font-medium">Phone: {customerPhone}</p>}
              {customerEmail && <p className="text-slate-600">Email: {customerEmail}</p>}
              {customerFullAddress && <p className="text-slate-500 text-[11px] mt-1">{customerFullAddress}</p>}
            </div>

            {/* Booking Reference */}
            <div className="space-y-1.5 sm:border-l sm:border-slate-200/80 sm:pl-6">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Booking & Trip Reference
              </span>
              <div className="space-y-1">
                <p className="text-slate-700">
                  <span className="text-slate-400">Booking #: </span>
                  <Link
                    href={`/bookings/${invoice.bookingId}`}
                    className="font-mono font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    {bookingNumber}
                    <ExternalLink className="h-3 w-3 print:hidden" />
                  </Link>
                </p>
                <p className="text-slate-700">
                  <span className="text-slate-400">Trip: </span>
                  <strong>{tripTitle}</strong>
                </p>
                <p className="text-slate-700">
                  <span className="text-slate-400">Travel Period: </span>
                  <strong className="text-slate-800">{travelDates}</strong>
                </p>
                <p className="text-slate-700 font-mono text-[11px]">
                  <span className="text-slate-400 font-sans">Currency: </span>
                  {invoice.currency || "INR"}
                </p>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* ITEMIZED SERVICES TABLE */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Itemized Services
            </h3>

            <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
              <Table>
                <TableHeader className="bg-slate-50 text-[11px] uppercase font-bold text-slate-600 border-b border-slate-200/80">
                  <TableRow>
                    <TableHead className="w-12 py-3 px-4 text-center">#</TableHead>
                    <TableHead className="py-3 px-4">Description</TableHead>
                    <TableHead className="w-20 py-3 px-4 text-right">Qty</TableHead>
                    <TableHead className="w-28 py-3 px-4 text-right">Rate</TableHead>
                    <TableHead className="w-32 py-3 px-4 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs divide-y divide-slate-100">
                  {hasQuotationItems ? (
                    quotationItems.map((item, idx) => {
                      const rate = Number(item.sellingPrice ?? item.unitPrice ?? 0);
                      const amount = Number(item.totalPrice ?? (item.quantity * rate));
                      return (
                        <TableRow key={item.id || idx} className="hover:bg-slate-50/50">
                          <TableCell className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <strong className="text-slate-900 block font-semibold">{item.name}</strong>
                            {item.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right text-slate-700 font-mono">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right text-slate-700 font-mono">
                            {formatINR(rate)}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                            {formatINR(amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : hasInvoiceItems ? (
                    invoice.items.map((item, idx) => (
                      <TableRow key={item.id || idx} className="hover:bg-slate-50/50">
                        <TableCell className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="py-3 px-4 font-semibold text-slate-900">
                          {item.description}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right text-slate-700 font-mono">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right text-slate-700 font-mono">
                          {formatINR(item.rate)}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                          {formatINR(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="hover:bg-slate-50/50">
                      <TableCell className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                        1
                      </TableCell>
                      <TableCell className="py-3 px-4 font-semibold text-slate-900">
                        Package Tour & Travel Services — {tripTitle} ({bookingNumber})
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right text-slate-700 font-mono">
                        1
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right text-slate-700 font-mono">
                        {formatINR(liveTotal)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                        {formatINR(liveTotal)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* FINANCIAL SUMMARY TOTALS */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col sm:flex-row sm:justify-end">
            <div className="w-full sm:w-88 bg-slate-50/90 rounded-2xl border border-slate-200/80 p-5 space-y-2.5 font-mono text-xs shadow-2xs">
              {/* Taxable Amount */}
              <div className="flex justify-between text-slate-600">
                <span>Taxable Base:</span>
                <span className="font-semibold text-slate-900">
                  {formatINR(invoice.taxableAmount !== null && invoice.taxableAmount !== undefined ? Number(invoice.taxableAmount) : subtotal)}
                </span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Special Discount:</span>
                  <span className="font-semibold">- {formatINR(discountAmount)}</span>
                </div>
              )}

              {/* GST Breakdown */}
              {(() => {
                const taxRate = Number(invoice.taxRate ?? (invoice.booking as any)?.taxRate ?? 0);
                const taxMode = invoice.taxMode || (invoice.booking as any)?.taxMode || "EXCLUSIVE";
                const gstTreatment = invoice.gstTreatment || (invoice.booking as any)?.gstTreatment || "INTRA_STATE";
                const cgst = Number(invoice.cgstAmount ?? (invoice.booking as any)?.cgstAmount ?? 0);
                const sgst = Number(invoice.sgstAmount ?? (invoice.booking as any)?.sgstAmount ?? 0);
                const igst = Number(invoice.igstAmount ?? (invoice.booking as any)?.igstAmount ?? 0);

                if (gstTreatment === "NON_GST_EXEMPT" || taxRate === 0) {
                  return (
                    <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                      <span>GST (0% Exempt):</span>
                      <span>₹0.00</span>
                    </div>
                  );
                }

                if (gstTreatment === "INTRA_STATE") {
                  const halfRate = taxRate / 2;
                  return (
                    <div className="pt-1 border-t border-slate-200/60 space-y-1.5 text-slate-700">
                      <div className="flex justify-between">
                        <span>CGST ({halfRate}%){taxMode === "INCLUSIVE" ? " (Incl.)" : ""}:</span>
                        <span className="font-semibold">{formatINR(cgst)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST ({halfRate}%){taxMode === "INCLUSIVE" ? " (Incl.)" : ""}:</span>
                        <span className="font-semibold">{formatINR(sgst)}</span>
                      </div>
                    </div>
                  );
                }

                if (gstTreatment === "INTER_STATE") {
                  return (
                    <div className="flex justify-between text-slate-700 pt-1 border-t border-slate-200/60">
                      <span>IGST ({taxRate}%){taxMode === "INCLUSIVE" ? " (Incl.)" : ""}:</span>
                      <span className="font-semibold">{formatINR(igst)}</span>
                    </div>
                  );
                }

                return null;
              })()}

              {invoice.taxMode === "INCLUSIVE" && Number(invoice.taxRate ?? 0) > 0 && (
                <p className="text-[10px] text-indigo-600 font-sans italic text-right pt-0.5">
                  * Customer price includes {Number(invoice.taxRate)}% GST
                </p>
              )}

              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Invoice Total:</span>
                <span className="text-base font-black">{formatINR(liveTotal)}</span>
              </div>

              <div className="flex justify-between text-emerald-700 font-bold pt-1">
                <span>Total Paid:</span>
                <span>{formatINR(livePaid)}</span>
              </div>

              <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-200">
                <span className={liveBalance > 0 ? "text-rose-700" : "text-emerald-700"}>
                  Balance Due:
                </span>
                <span className={liveBalance > 0 ? "text-rose-700" : "text-emerald-700"}>
                  {liveBalance > 0 ? formatINR(liveBalance) : "₹0.00 (Settled)"}
                </span>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* PAYMENT HISTORY TABLE */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-indigo-600" />
                <span>Payment Transactions ({invoice.payments?.length || 0})</span>
              </h3>
            </div>

            {(!invoice.payments || invoice.payments.length === 0) ? (
              <p className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                No payments recorded against this invoice yet.
              </p>
            ) : (
              <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                <Table>
                  <TableHeader className="bg-slate-50 text-[11px] uppercase font-bold text-slate-600 border-b border-slate-200/80">
                    <TableRow>
                      <TableHead className="py-2.5 px-4">Receipt / Ref #</TableHead>
                      <TableHead className="py-2.5 px-4">Payment Date</TableHead>
                      <TableHead className="py-2.5 px-4">Method</TableHead>
                      <TableHead className="py-2.5 px-4 text-center">Status</TableHead>
                      <TableHead className="py-2.5 px-4 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs divide-y divide-slate-100">
                    {invoice.payments.map((p) => (
                      <TableRow key={p.id} className="hover:bg-slate-50/50">
                        <TableCell className="py-2.5 px-4 font-semibold text-slate-900 font-mono">
                          {p.paymentNumber}
                          {p.referenceNumber && (
                            <span className="block text-[10px] text-slate-400 font-sans">
                              Ref: {p.referenceNumber}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 px-4 text-slate-600">
                          {formatDate(p.paymentDate)}
                        </TableCell>
                        <TableCell className="py-2.5 px-4 text-slate-700">
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 px-4 text-center">
                          <Badge
                            className={`text-[10px] font-bold ${
                              p.status === "CONFIRMED" || p.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5 px-4 text-right font-bold text-emerald-700 font-mono">
                          {formatINR(p.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Notes / Instructions */}
          {(invoice.notes || invoice.paymentInstructions || invoice.booking?.notes) && (
            <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl text-xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Notes & Instructions
              </span>
              {invoice.paymentInstructions && (
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {invoice.paymentInstructions}
                </p>
              )}
              {invoice.notes && (
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              )}
            </div>
          )}

          {/* Footer Thank You */}
          <div className="text-center pt-4 border-t border-slate-100 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-600">Thank you for traveling with {agencyName}!</p>
            <p className="text-[11px]">For any queries regarding this invoice, please contact {agencyEmail || agencyPhone || "us"}.</p>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPayModal && (
        <RecordPaymentModal
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          invoiceId={invoice.id}
          invoiceNumber={invoice.invoiceNumber}
          balanceAmount={liveBalance}
          onSuccess={() => {
            fetchInvoice();
            toast.success("Payment recorded and invoice refreshed.");
          }}
        />
      )}
    </div>
  );
}
