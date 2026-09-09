"use client";

import * as React from "react";
import { X, Loader2, IndianRupee, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceNumber?: string | null;
  balanceAmount: number;
  onSuccess: () => void;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  balanceAmount,
  onSuccess,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = React.useState<string>(String(balanceAmount || ""));
  const [paymentMethod, setPaymentMethod] = React.useState<string>("UPI");
  const [paymentDate, setPaymentDate] = React.useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [referenceNumber, setReferenceNumber] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setAmount(String(balanceAmount || ""));
      setPaymentMethod("UPI");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setReferenceNumber("");
      setNotes("");
      setError(null);
    }
  }, [isOpen, balanceAmount]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid payment amount greater than ₹0.");
      return;
    }

    if (numAmount > balanceAmount) {
      setError(`Payment amount cannot exceed the remaining balance of ₹${balanceAmount.toLocaleString("en-IN")}.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          paymentMethod,
          paymentDate,
          referenceNumber: referenceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || "Failed to record payment.");
      }

      toast.success("Payment recorded successfully.");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred while recording payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Record Payment</h3>
            <p className="text-xs text-slate-500">
              For Invoice <span className="font-semibold text-slate-800">{invoiceNumber || "Draft"}</span> • Outstanding:{" "}
              <span className="font-bold text-slate-900">₹{balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Amount (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <IndianRupee className="h-4 w-4" />
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={balanceAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm font-semibold text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="0.00"
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
              <span>Max allowed: ₹{balanceAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              <button
                type="button"
                onClick={() => setAmount(String(balanceAmount))}
                className="text-blue-600 hover:underline font-medium"
              >
                Pay Full Balance
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                max={new Date().toISOString().split("T")[0]}
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transaction / Reference Number (Optional)
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UTR / UPI Ref / Cheque No."
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes / Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional payment notes..."
              className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-slate-900 text-white hover:bg-slate-800">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
