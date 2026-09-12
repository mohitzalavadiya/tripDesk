"use client";

import * as React from "react";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VoidPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  payment: {
    id: string;
    paymentNumber: string;
    amount: number;
    paymentDate: string;
  } | null;
  onSuccess: () => void;
}

export function VoidPaymentModal({
  isOpen,
  onClose,
  invoiceId,
  payment,
  onSuccess,
}: VoidPaymentModalProps) {
  const [reason, setReason] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim() || reason.trim().length < 3) {
      setError("Please provide a mandatory reason for voiding this payment (minimum 3 characters).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payments/${payment.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || "Failed to void payment.");
      }

      toast.success("Payment voided successfully. Invoice balance has been updated.");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred while voiding payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-lg font-bold text-slate-900">Void Payment</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200 leading-relaxed">
          <strong>Important:</strong> Voiding marks this payment as invalid. The voided amount will be excluded from Total Paid, and the Invoice balance will increase accordingly. This action is <strong>permanent and immutable</strong>.
        </div>

        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Payment Number:</span>
            <span className="font-semibold text-slate-900">{payment.paymentNumber}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Amount:</span>
            <span className="font-bold text-slate-900">₹{payment.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
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
              Reason for Voiding <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Duplicate entry / Incorrect amount / Cheque bounced"
              required
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-red-600 text-white hover:bg-red-700">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Voiding...
                </>
              ) : (
                "Confirm Void"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
