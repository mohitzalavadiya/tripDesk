"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Receipt,
  ArrowLeft,
  FileDown,
  Printer,
  CreditCard,
  AlertOctagon,
  Trash2,
  Send,
  Plus,
  Trash,
  CheckCircle2,
  Clock,
  AlertCircle,
  IndianRupee,
  Loader2,
  Save,
  RotateCcw,
  Ban,
  Building,
  User,
  Calendar,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { RecordPaymentModal } from "@/components/invoices/record-payment-modal";
import { VoidPaymentModal } from "@/components/invoices/void-payment-modal";
import { CancelInvoiceModal } from "@/components/invoices/cancel-invoice-modal";

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
  cancelledBy: string | null;
  cancellationReason: string | null;
  replacedByInvoiceId: string | null;
  isOverdue: boolean;
  items: InvoiceItem[];
  payments: any[];
  booking: {
    id: string;
    bookingNumber: string;
    status: string;
    travelStartDate: string | null;
    travelEndDate: string | null;
  };
  agency?: {
    name: string;
    phone: string;
    email: string;
    address: string | null;
  };
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const invoiceId = params.id;

  const [invoice, setInvoice] = React.useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Draft Editor State
  const [items, setItems] = React.useState<InvoiceItem[]>([]);
  const [invoiceDate, setInvoiceDate] = React.useState<string>("");
  const [dueDate, setDueDate] = React.useState<string>("");
  const [discountType, setDiscountType] = React.useState<"FIXED" | "PERCENTAGE" | "NONE">("NONE");
  const [discountValue, setDiscountValue] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [paymentInstructions, setPaymentInstructions] = React.useState<string>("");
  const [internalNotes, setInternalNotes] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);
  const [issuing, setIssuing] = React.useState(false);

  // Modals state
  const [showPayModal, setShowPayModal] = React.useState(false);
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [voidPaymentData, setVoidPaymentData] = React.useState<any | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<{
    title: string;
    description: string;
    confirmText: string;
    variant?: "destructive" | "default" | "warning";
    action: () => Promise<void>;
  } | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  const fetchInvoice = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || json.message || "Failed to load invoice.");
      }

      const inv: InvoiceDetail = json.data || json;
      setInvoice(inv);

      // Populate draft editor fields
      if (inv.status === "DRAFT") {
        setItems(
          inv.items.map((i) => ({
            id: i.id,
            description: i.description,
            quantity: i.quantity,
            rate: Number(i.rate),
            amount: Number(i.amount),
          }))
        );
        setInvoiceDate(inv.invoiceDate ? inv.invoiceDate.split("T")[0] : "");
        setDueDate(inv.dueDate ? inv.dueDate.split("T")[0] : "");
        setDiscountType(inv.discountType || "NONE");
        setDiscountValue(inv.discountValue ? String(inv.discountValue) : "");
        setNotes(inv.notes || "");
        setPaymentInstructions(inv.paymentInstructions || "");
        setInternalNotes(inv.internalNotes || "");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load invoice.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  React.useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // Dynamic calculations for draft editor
  const calculatedSubtotal = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0),
    0
  );

  let calculatedDiscount = 0;
  const numDiscVal = parseFloat(discountValue) || 0;
  if (discountType === "FIXED" && numDiscVal > 0) {
    calculatedDiscount = Math.min(calculatedSubtotal, numDiscVal);
  } else if (discountType === "PERCENTAGE" && numDiscVal > 0) {
    calculatedDiscount = Math.min(calculatedSubtotal, (calculatedSubtotal * numDiscVal) / 100);
  }

  const calculatedTotal = Math.max(0, calculatedSubtotal - calculatedDiscount);

  const formatINR = (val: number | string | any) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  // Draft item management
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "rate") {
      const q = Number(field === "quantity" ? value : updated[index].quantity) || 0;
      const r = Number(field === "rate" ? value : updated[index].rate) || 0;
      updated[index].amount = Math.round(q * r * 100) / 100;
    }
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([...items, { description: "", quantity: 1, rate: 0, amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.error("An invoice must have at least one line item.");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Save Draft
  const handleSaveDraft = async () => {
    for (const it of items) {
      if (!it.description.trim()) {
        toast.error("All line items must have a description.");
        return;
      }
      if (it.quantity <= 0) {
        toast.error("Line item quantity must be at least 1.");
        return;
      }
      if (it.rate < 0) {
        toast.error("Line item rate cannot be negative.");
        return;
      }
    }

    if (new Date(dueDate) < new Date(invoiceDate)) {
      toast.error("Due Date cannot be before Invoice Date.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        invoiceDate,
        dueDate,
        items: items.map((i) => ({
          description: i.description.trim(),
          quantity: Number(i.quantity),
          rate: Number(i.rate),
        })),
        discountType: discountType === "NONE" ? null : discountType,
        discountValue: discountType === "NONE" ? null : parseFloat(discountValue) || 0,
        notes: notes.trim() || null,
        paymentInstructions: paymentInstructions.trim() || null,
        internalNotes: internalNotes.trim() || null,
      };

      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || json.message || "Failed to save draft.");
      }

      toast.success("Draft invoice saved successfully.");
      fetchInvoice();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  // Issue Invoice
  const handleIssueInvoice = () => {
    setConfirmAction({
      title: "Issue this invoice?",
      description:
        "Once issued, this invoice will receive a permanent sequential invoice number and become immutable. Any subsequent changes will require a cancellation and replacement invoice.",
      confirmText: "Issue Invoice",
      variant: "default",
      action: async () => {
        setIssuing(true);
        try {
          await handleSaveDraft();

          const res = await fetch(`/api/invoices/${invoiceId}/issue`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dueDate }),
          });

          const json = await res.json();
          if (!res.ok) {
            throw new Error(json.error?.message || json.message || "Failed to issue invoice.");
          }

          toast.success(`Invoice issued successfully as ${json.data?.invoiceNumber || "INV"}`);
          setConfirmAction(null);
          fetchInvoice();
        } catch (err: any) {
          toast.error(getErrorMessage(err, "We couldn't issue the invoice. Please try again."));
        } finally {
          setIssuing(false);
        }
      },
    });
  };

  // Delete Draft
  const handleDeleteDraft = () => {
    setConfirmAction({
      title: "Delete draft invoice?",
      description: "Are you sure you want to permanently delete this draft invoice? This action cannot be undone.",
      confirmText: "Delete Draft",
      variant: "destructive",
      action: async () => {
        try {
          setActionLoading(true);
          const res = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
          const json = await res.json();
          if (!res.ok) {
            throw new Error(json.error?.message || json.message || "Failed to delete draft.");
          }

          toast.success("Draft invoice deleted.");
          setConfirmAction(null);
          router.push("/invoices");
        } catch (err: any) {
          toast.error(getErrorMessage(err, "We couldn't delete the draft invoice. Please try again."));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  // Create Replacement Invoice
  const handleCreateReplacement = () => {
    setConfirmAction({
      title: "Create replacement invoice?",
      description: "Create a new replacement draft invoice for this cancelled invoice? Line items will be copied over.",
      confirmText: "Create Replacement",
      variant: "default",
      action: async () => {
        try {
          setActionLoading(true);
          const res = await fetch(`/api/invoices/${invoiceId}/replacement`, { method: "POST" });
          const json = await res.json();
          if (!res.ok) {
            throw new Error(json.error?.message || json.message || "Failed to create replacement.");
          }

          toast.success("Replacement draft created.");
          setConfirmAction(null);
          router.push(`/invoices/${json.data.id}`);
        } catch (err: any) {
          toast.error(getErrorMessage(err, "We couldn't create the replacement invoice. Please try again."));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <ErrorState
          title="Invoice not found"
          description={error || "The requested invoice could not be located or you don't have permission to view it."}
          onRetry={() => router.push("/invoices")}
        />
      </div>
    );
  }

  const custSnap = invoice.customerSnapshot || {};
  const bookingSnap = invoice.bookingSnapshot || {};
  const isDraft = invoice.status === "DRAFT";
  const activePayments = (invoice.payments || []).filter((p) => p.status !== "VOIDED" && !p.archivedAt);
  const voidedPayments = (invoice.payments || []).filter((p) => p.status === "VOIDED" && !p.archivedAt);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Hero Command Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/70 via-indigo-50/20 to-transparent pointer-events-none" />

          {/* Left Title & Telemetry */}
          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href="/invoices"
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Link>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Receipt className="h-3 w-3 text-indigo-500" />
                Customer Invoice
              </span>
              <span className="text-slate-300">•</span>
              <StatusBadge status={invoice.status} />
              {invoice.isOverdue && invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
                <StatusBadge status="OVERDUE" />
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 font-mono">
                {invoice.invoiceNumber || "Draft Invoice"}
              </h1>
              <span className="text-xs font-semibold text-slate-500">
                Booking Ref:{" "}
                <Link href={`/bookings/${invoice.bookingId}`} className="font-mono text-indigo-600 hover:underline">
                  {bookingSnap.bookingNumber || invoice.booking?.bookingNumber}
                </Link>
                {custSnap.name && ` (${custSnap.name})`}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 z-10">
            {/* PDF Download / Print */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/invoices/${invoiceId}/pdf`, "_blank")}
              className="rounded-xl border-slate-200 h-9 font-semibold text-xs cursor-pointer shadow-2xs"
            >
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              {isDraft ? "Preview PDF" : "Download PDF"}
            </Button>

            {isDraft ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteDraft}
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-9 font-semibold text-xs cursor-pointer shadow-2xs"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete Draft
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="rounded-xl border-slate-200 h-9 font-semibold text-xs cursor-pointer shadow-2xs"
                >
                  {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                  Save Draft
                </Button>
                <Button
                  size="sm"
                  onClick={handleIssueInvoice}
                  disabled={issuing || saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer transition-all"
                >
                  {issuing ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Issue Invoice
                </Button>
              </>
            ) : (
              <>
                {(invoice.status === "ISSUED" || invoice.status === "PARTIALLY_PAID") && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setShowPayModal(true)}
                      className="bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer"
                    >
                      <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                      Record Payment
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCancelModal(true)}
                      className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 h-9 font-semibold text-xs cursor-pointer shadow-2xs"
                    >
                      <AlertOctagon className="mr-1.5 h-3.5 w-3.5" />
                      Cancel Invoice
                    </Button>
                  </>
                )}

                {invoice.status === "CANCELLED" && (
                  <Button
                    size="sm"
                    onClick={handleCreateReplacement}
                    className="bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs h-9 px-4 rounded-xl shadow-xs gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Create Replacement Draft
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

      {/* Warning Notice if Cancelled */}
      {invoice.status === "CANCELLED" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-900">
          <div className="flex items-center gap-2 font-bold text-red-800">
            <Ban className="h-4 w-4" />
            This Invoice was CANCELLED on {formatDate(invoice.cancelledAt)}.
          </div>
          <p className="mt-1 text-red-700">
            <strong>Reason:</strong> {invoice.cancellationReason || "No reason specified."}
          </p>
          {invoice.replacedByInvoiceId && (
            <p className="mt-1 text-blue-700">
              A replacement draft was initiated:{" "}
              <Link href={`/invoices/${invoice.replacedByInvoiceId}`} className="font-semibold underline">
                View Replacement Invoice
              </Link>
            </p>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* SNAPSHOT REFERENCES (Customer, Booking, Agency) */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Bill To Customer */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <User className="h-4 w-4 text-slate-400" /> Billed To
          </div>
          <p className="font-bold text-slate-900 text-sm">{custSnap.name || "—"}</p>
          <p className="text-xs text-slate-600 mt-0.5">{custSnap.phone || "—"}</p>
          {custSnap.email && <p className="text-xs text-slate-600">{custSnap.email}</p>}
          {custSnap.address && (
            <p className="text-xs text-slate-500 mt-1">
              {[custSnap.address, custSnap.city, custSnap.state, custSnap.postalCode].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        {/* Trip & Booking Reference */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <Compass className="h-4 w-4 text-slate-400" /> Trip Reference
          </div>
          <p className="font-bold text-slate-900 text-sm">{bookingSnap.tripTitle || "Travel Package"}</p>
          <p className="text-xs font-mono text-slate-600 mt-0.5">Booking: {bookingSnap.bookingNumber}</p>
          <p className="text-xs text-slate-500 mt-1">
            Travel: {formatDate(bookingSnap.travelStartDate)} – {formatDate(bookingSnap.travelEndDate)}
          </p>
        </div>

        {/* Invoice Metadata (Dates) */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <Calendar className="h-4 w-4 text-slate-400" /> Billing Dates
          </div>
          {isDraft ? (
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full rounded border border-slate-300 py-1 px-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded border border-slate-300 py-1 px-2 text-xs text-slate-900"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice Date:</span>
                <span className="font-semibold text-slate-800">{formatDate(invoice.invoiceDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Due Date:</span>
                <span className="font-semibold text-slate-800">{formatDate(invoice.dueDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Currency:</span>
                <span className="font-semibold text-slate-800">{invoice.currency || "INR (₹)"}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* LINE ITEMS WORKSPACE */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-slate-900 text-sm">Line Items & Financials</h3>
          {isDraft && (
            <Button size="sm" variant="outline" onClick={handleAddItem} className="h-8 text-xs">
              <Plus className="mr-1 h-3.5 w-3.5" /> Add Item
            </Button>
          )}
        </div>

        {isDraft ? (
          /* Draft Interactive Line Item Editor */
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="flex flex-col md:flex-row items-center gap-3 rounded-lg border border-slate-200 p-3 bg-slate-50/60">
                <div className="flex-1 w-full">
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Description</label>
                  <input
                    type="text"
                    value={it.description}
                    onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                    placeholder="Item description / Service"
                    className="w-full rounded border border-slate-300 py-1.5 px-3 text-xs text-slate-900 focus:border-slate-900"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={it.quantity}
                    onChange={(e) => handleItemChange(idx, "quantity", parseInt(e.target.value) || 1)}
                    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs text-center text-slate-900 focus:border-slate-900"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={it.rate}
                    onChange={(e) => handleItemChange(idx, "rate", parseFloat(e.target.value) || 0)}
                    className="w-full rounded border border-slate-300 py-1.5 px-2 text-xs text-right text-slate-900 focus:border-slate-900"
                  />
                </div>
                <div className="w-36 text-right">
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Amount</label>
                  <p className="py-1.5 font-bold text-xs text-slate-900 font-mono">
                    {formatINR((Number(it.quantity) || 0) * (Number(it.rate) || 0))}
                  </p>
                </div>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Discount Editor Row */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t pt-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-700">Invoice Discount:</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="rounded border border-slate-300 py-1 px-2 text-xs text-slate-900"
                >
                  <option value="NONE">No Discount</option>
                  <option value="FIXED">Fixed Amount (₹)</option>
                  <option value="PERCENTAGE">Percentage (%)</option>
                </select>

                {discountType !== "NONE" && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "FIXED" ? "Amount in ₹" : "e.g. 10"}
                    className="w-32 rounded border border-slate-300 py-1 px-2 text-xs text-slate-900"
                  />
                )}
              </div>

              {/* Summary Totals */}
              <div className="w-full md:w-80 rounded-lg bg-slate-50 p-4 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">{formatINR(calculatedSubtotal)}</span>
                </div>
                {calculatedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount:</span>
                    <span>- {formatINR(calculatedDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-bold text-sm border-t pt-2">
                  <span>Total Amount:</span>
                  <span>{formatINR(calculatedTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Immutable Line Items Table */
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">#</th>
                    <th className="py-2.5 px-3 font-semibold">Description</th>
                    <th className="py-2.5 px-3 text-center font-semibold">Quantity</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Rate</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{it.description}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{it.quantity}</td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-mono">{formatINR(it.rate)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 font-mono">{formatINR(it.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Card */}
            <div className="flex justify-end pt-2">
              <div className="w-full md:w-80 rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800 font-mono">{formatINR(invoice.subtotal)}</span>
                </div>
                {Number(invoice.discountAmount) > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>
                      Discount {invoice.discountType === "PERCENTAGE" ? `(${Number(invoice.discountValue)}%)` : ""}:
                    </span>
                    <span className="font-mono">- {formatINR(invoice.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-bold text-sm border-t border-slate-200 pt-2">
                  <span>Invoice Total:</span>
                  <span className="font-mono">{formatINR(invoice.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Total Paid:</span>
                  <span className="font-mono">{formatINR(invoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold bg-slate-900 text-white p-2.5 rounded-lg text-sm mt-1">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatINR(invoice.balanceAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* NOTES & PAYMENT INSTRUCTIONS */}
      {/* ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Invoice Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Invoice Notes (Customer Visible)</h4>
          {isDraft ? (
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Thank you for choosing us! Package includes all listed tour activities."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-slate-900"
            />
          ) : (
            <p className="text-xs text-slate-600 whitespace-pre-wrap">{invoice.notes || "No notes provided."}</p>
          )}
        </div>

        {/* Payment Instructions */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Instructions (Customer Visible)</h4>
          {isDraft ? (
            <textarea
              rows={3}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              placeholder="e.g. Bank: HDFC Bank | A/C: 1234567890 | IFSC: HDFC0001234 | UPI: agency@upi"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-slate-900"
            />
          ) : (
            <p className="text-xs text-slate-600 whitespace-pre-wrap">{invoice.paymentInstructions || "No payment instructions provided."}</p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* ACTIVE CUSTOMER PAYMENT HISTORY */}
      {/* ══════════════════════════════════════════════════ */}
      {!isDraft && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Payment History</h3>
              <p className="text-xs text-slate-500">Active recorded payments for this invoice.</p>
            </div>
            {(invoice.status === "ISSUED" || invoice.status === "PARTIALLY_PAID") && (
              <Button size="sm" onClick={() => setShowPayModal(true)} className="bg-emerald-600 text-white hover:bg-emerald-700 h-8 text-xs font-semibold">
                <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Record Payment
              </Button>
            )}
          </div>

          {activePayments.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center italic">No customer payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Date</th>
                    <th className="py-2.5 px-3 font-semibold">Payment #</th>
                    <th className="py-2.5 px-3 font-semibold">Method</th>
                    <th className="py-2.5 px-3 font-semibold">Reference</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Amount (₹)</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activePayments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-700">{formatDate(pay.paymentDate)}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">{pay.paymentNumber}</td>
                      <td className="py-2.5 px-3 text-slate-700">{pay.paymentMethod || "UPI"}</td>
                      <td className="py-2.5 px-3 text-slate-600">{pay.referenceNumber || "—"}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 font-mono">{formatINR(pay.amount)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setVoidPaymentData(pay)}
                          className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          Void
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* INTERNAL VOIDED PAYMENTS AUDIT SECTION */}
      {/* ══════════════════════════════════════════════════ */}
      {!isDraft && voidedPayments.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50/40 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-red-800 font-bold text-xs">
            <AlertOctagon className="h-4 w-4 text-red-600" />
            Voided Payment History (Agency Internal Audit Log)
          </div>
          <p className="text-[11px] text-slate-600">
            These payments were voided and are excluded from billing calculations and customer-facing PDFs.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-red-200 text-red-900">
                  <th className="py-2 px-3">Date Voided</th>
                  <th className="py-2 px-3">Payment #</th>
                  <th className="py-2 px-3 text-right">Original Amount</th>
                  <th className="py-2 px-3">Void Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {voidedPayments.map((vp) => (
                  <tr key={vp.id} className="text-slate-700">
                    <td className="py-2 px-3">{formatDate(vp.voidedAt)}</td>
                    <td className="py-2 px-3 font-mono line-through text-slate-500">{vp.paymentNumber}</td>
                    <td className="py-2 px-3 text-right font-mono line-through text-slate-500">{formatINR(vp.amount)}</td>
                    <td className="py-2 px-3 text-red-700 italic">{vp.voidReason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayModal && (
        <RecordPaymentModal
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          invoiceId={invoiceId}
          invoiceNumber={invoice.invoiceNumber}
          balanceAmount={Number(invoice.balanceAmount)}
          onSuccess={fetchInvoice}
        />
      )}

      {/* Cancel Invoice Modal */}
      {showCancelModal && (
        <CancelInvoiceModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          invoiceId={invoiceId}
          invoiceNumber={invoice.invoiceNumber}
          totalAmount={Number(invoice.totalAmount)}
          onSuccess={fetchInvoice}
        />
      )}

      {/* Void Payment Modal */}
      {voidPaymentData && (
        <VoidPaymentModal
          isOpen={!!voidPaymentData}
          onClose={() => setVoidPaymentData(null)}
          invoiceId={invoiceId}
          payment={voidPaymentData}
          onSuccess={fetchInvoice}
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
