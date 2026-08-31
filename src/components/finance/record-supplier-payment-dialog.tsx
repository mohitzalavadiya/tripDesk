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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentMethod, SupplierPayable, Supplier } from "@prisma/client";
import { financeClient, supplierClient } from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RecordSupplierPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPayableId?: string;
  onSuccess?: () => void;
}

export function RecordSupplierPaymentDialog({
  open,
  onOpenChange,
  defaultPayableId,
  onSuccess,
}: RecordSupplierPaymentDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [payables, setPayables] = React.useState<any[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);

  const [supplierId, setSupplierId] = React.useState("");
  const [payableId, setPayableId] = React.useState(defaultPayableId || "");
  const [amount, setAmount] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [paidBy, setPaidBy] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Load suppliers and pending payables
  React.useEffect(() => {
    if (open) {
      setLoadingData(true);
      Promise.all([
        supplierClient.getSuppliers({ limit: 100 }),
        financeClient.getSupplierPayables(),
      ])
        .then(([supRes, payRes]) => {
          setSuppliers(supRes.data || []);
          const pending = payRes.data || [];
          setPayables(pending);

          if (defaultPayableId) {
            setPayableId(defaultPayableId);
            const found = pending.find((p) => p.id === defaultPayableId);
            if (found) {
              setSupplierId(found.supplierId);
              if (Number(found.outstandingAmount) > 0) {
                setAmount(String(found.outstandingAmount));
              }
            }
          }
        })
        .catch(() => toast.error("Failed to load supplier data."))
        .finally(() => setLoadingData(false));
    }
  }, [open, defaultPayableId]);

  const handlePayableChange = (id: string) => {
    setPayableId(id);
    const found = payables.find((p) => p.id === id);
    if (found) {
      setSupplierId(found.supplierId);
      if (Number(found.outstandingAmount) > 0) {
        setAmount(String(found.outstandingAmount));
      }
    }
  };

  const selectedPayable = payables.find((p) => p.id === payableId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toast.error("Please select a supplier.");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid positive disbursement amount.");
      return;
    }

    setLoading(true);
    try {
      await financeClient.recordSupplierPayment({
        supplierId,
        payableId: payableId || null,
        amount: numAmount,
        currency: "INR",
        paymentMethod,
        paymentDate: new Date(paymentDate).toISOString(),
        referenceNumber: referenceNumber || null,
        paidBy: paidBy || null,
        notes: notes || null,
      });

      toast.success("Supplier disbursement recorded!");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to record disbursement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Record Supplier Disbursement
          </DialogTitle>
          <DialogDescription className="text-xs">
            Log outgoing payment to hotel, fleet operator, activity vendor, or guide.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Payable selection (Optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Link to Payable (Optional)</Label>
            <Select
              value={payableId}
              onValueChange={(val) => {
                if (val) handlePayableChange(val);
              }}
              disabled={loadingData}
            >
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Choose Outstanding Payable (or Direct)">
                  {(val: string | null) => {
                    if (!val || val === "none") return "Direct Supplier Payment (No Payable)";
                    const p = payables.find((item) => item.id === val);
                    return p ? `${p.payableNumber} — ${p.supplier?.name || "Supplier"} (${p.serviceType}, Due: ${formatCurrency(Number(p.outstandingAmount))})` : val;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Direct Supplier Payment (No Payable)</SelectItem>
                {payables.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.payableNumber} — {p.supplier?.name || "Supplier"} ({p.serviceType}, Due: {formatCurrency(Number(p.outstandingAmount))})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Supplier Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Supplier / Vendor *</Label>
            <Select
              value={supplierId}
              onValueChange={(val) => {
                if (val) setSupplierId(val);
              }}
              disabled={loadingData}
            >
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Choose Supplier">
                  {(val: string | null) => {
                    if (!val) return undefined;
                    const s = suppliers.find((item) => item.id === val);
                    return s ? `${s.name} (${s.type || "Vendor"})` : val;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.name} ({s.type || "Vendor"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Payable Info */}
          {selectedPayable && (
            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payable Service:</span>
                <span className="font-semibold">{selectedPayable.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Actual Cost:</span>
                <span className="font-semibold">{formatCurrency(Number(selectedPayable.actualAmount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outstanding Due:</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">
                  {formatCurrency(Number(selectedPayable.outstandingAmount))}
                </span>
              </div>
            </div>
          )}

          {/* Amount & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                placeholder="e.g. 15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Method *</Label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => {
                  if (val) setPaymentMethod(val as PaymentMethod);
                }}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMethod.BANK_TRANSFER}>Bank Transfer (NEFT/RTGS/IMPS)</SelectItem>
                  <SelectItem value={PaymentMethod.UPI}>UPI / QR</SelectItem>
                  <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                  <SelectItem value={PaymentMethod.CHEQUE}>Cheque</SelectItem>
                  <SelectItem value={PaymentMethod.OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Date *</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Bank UTR / Ref #</Label>
              <Input
                placeholder="e.g. UTR123456789"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Paid By & Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Disbursed By (Staff / Account)</Label>
            <Input
              placeholder="e.g. Finance Admin"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notes / Remarks</Label>
            <Textarea
              placeholder="Add disbursement remarks or voucher notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[60px]"
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
            <Button type="submit" size="sm" className="text-xs" disabled={loading}>
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Disbursement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
