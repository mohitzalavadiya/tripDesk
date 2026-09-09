"use client";

import * as React from "react";
import { X, Loader2, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CancelInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber?: string | null;
  totalAmount: number;
  onSuccess: () => void;
}

export function CancelInvoiceModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  totalAmount,
  onSuccess,
}: CancelInvoiceModalProps) {
  const [reason, setReason] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim() || reason.trim().length < 3) {
      setError("Please provide a mandatory cancellation reason (minimum 3 characters).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || "Failed to cancel invoice.");
      }

      toast.success("Invoice cancelled successfully.");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred while cancelling invoice.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertOctagon className="h-5 w-5" />
            <h3 className="text-lg font-bold text-slate-900">Cancel Invoice</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200 leading-relaxed">
          <strong>Warning:</strong> Cancelling this invoice is a <strong>terminal, irreversible action</strong>. Cancelled invoices cannot be reactivated or edited. Any existing payments will remain recorded in history. A replacement invoice can be created afterward if required.
        </div>

        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Invoice Number:</span>
            <span className="font-semibold text-slate-900">{invoiceNumber || "Draft"}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Total Billed:</span>
            <span className="font-bold text-slate-900">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {error && (
          <div className="mt-3 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Scope change / Client requested revised billing / Re-issuing due to itinerary change"
              required
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Keep Invoice
            </Button>
            <Button type="submit" disabled={loading} className="bg-red-600 text-white hover:bg-red-700">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Confirm Cancellation"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
