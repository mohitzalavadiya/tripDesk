"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { financeClient, PaymentWithRelations } from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface RefundPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentWithRelations | null;
  onSuccess?: () => void;
}

export function RefundPaymentDialog({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: RefundPaymentDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const originalAmount = payment ? Number(payment.amount) : 0;
  const alreadyRefunded = payment ? Number(payment.refundedAmount || 0) : 0;
  const maxRefundable = Math.max(0, originalAmount - alreadyRefunded);

  React.useEffect(() => {
    if (payment) {
      setAmount(String(maxRefundable));
      setReason("");
      setReferenceNumber("");
      setNotes("");
    }
  }, [payment, maxRefundable]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid positive refund amount.");
      return;
    }
    if (numAmount > maxRefundable + 0.01) {
      toast.error(`Refund cannot exceed eligible balance of ${formatCurrency(maxRefundable)}.`);
      return;
    }
    if (!reason.trim()) {
      toast.error("Refund reason is required.");
      return;
    }

    setLoading(true);
    try {
      await financeClient.refundCustomerPayment(payment.id, {
        amount: numAmount,
        reason,
        referenceNumber: referenceNumber || null,
        notes: notes || null,
      });

      toast.success("Refund processed successfully!");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to process refund.");
    } finally {
      setLoading(false);
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Process Payment Refund
          </DialogTitle>
          <DialogDescription className="text-xs">
            Refund payment {payment.paymentNumber} for customer {payment.customer?.name || "Customer"}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Payment Context Box */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Payment:</span>
              <span className="font-semibold">{formatCurrency(originalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Already Refunded:</span>
              <span className="text-destructive font-semibold">{formatCurrency(alreadyRefunded)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Eligible Refund:</span>
              <span className="text-foreground font-bold">{formatCurrency(maxRefundable)}</span>
            </div>
          </div>

          {/* Refund Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Refund Amount (₹) *</Label>
            <Input
              type="number"
              step="0.01"
              max={maxRefundable}
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Refund Reason *</Label>
            <Input
              placeholder="e.g. Tour cancellation / Hotel downgrade refund"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          {/* UTR / Ref */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Refund Bank Ref / UTR #</Label>
            <Input
              placeholder="e.g. REF-UTR998877"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Internal Notes</Label>
            <Textarea
              placeholder="Additional audit details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[50px]"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" size="sm" className="text-xs" disabled={loading}>
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Process Refund
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
