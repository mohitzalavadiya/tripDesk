"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaymentMethod, Supplier } from "@prisma/client";
import { financeClient, supplierClient } from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import { getErrorMessage } from "@/lib/utils";
import { Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { isValidDecimal } from "@/lib/validation/field-validators";

interface RecordSupplierPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPayableId?: string;
  payable?: any | null;
  isPayableLocked?: boolean;
  onSuccess?: () => void;
}

export function RecordSupplierPaymentDialog({
  open,
  onOpenChange,
  defaultPayableId,
  payable: initialPayable,
  isPayableLocked = false,
  onSuccess,
}: RecordSupplierPaymentDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [payables, setPayables] = React.useState<any[]>([]);
  const [loadingData, setLoadingData] = React.useState(false);

  const [supplierId, setSupplierId] = React.useState("");
  const [payeeName, setPayeeName] = React.useState("");
  const [payableId, setPayableId] = React.useState(defaultPayableId || initialPayable?.id || "");
  const [amount, setAmount] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [paidBy, setPaidBy] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Initialize form state whenever dialog opens or bound payable changes
  React.useEffect(() => {
    if (open) {
      if (initialPayable) {
        setPayableId(initialPayable.id);
        setSupplierId(initialPayable.supplierId || "");
        setPayeeName(initialPayable.payeeName || initialPayable.supplier?.name || "");
        if (Number(initialPayable.outstandingAmount) > 0) {
          setAmount(String(initialPayable.outstandingAmount));
        } else {
          setAmount("");
        }
      } else if (defaultPayableId) {
        setPayableId(defaultPayableId);
      } else {
        setPayableId("");
        setSupplierId("");
        setPayeeName("");
        setAmount("");
      }

      setPaymentDate(new Date().toISOString().slice(0, 10));
      setReferenceNumber("");
      setPaidBy("");
      setNotes("");

      // Only fetch all agency payables/suppliers when not context-locked
      if (!isPayableLocked) {
        setLoadingData(true);
        Promise.all([
          supplierClient.getSuppliers({ limit: 100 }),
          financeClient.getSupplierPayables(),
        ])
          .then(([supRes, payRes]) => {
            setSuppliers(supRes.data || []);
            const pending = payRes.data || [];
            setPayables(pending);

            if (defaultPayableId && !initialPayable) {
              const found = pending.find((p) => p.id === defaultPayableId);
              if (found) {
                setSupplierId(found.supplierId || "");
                setPayeeName(found.payeeName || (found as any).supplier?.name || "");
                if (Number(found.outstandingAmount) > 0) {
                  setAmount(String(found.outstandingAmount));
                }
              }
            }
          })
          .catch(() => toast.error("Failed to load supplier data."))
          .finally(() => setLoadingData(false));
      }
    }
  }, [open, defaultPayableId, initialPayable, isPayableLocked]);

  const handlePayableChange = (id: string) => {
    setPayableId(id === "none" ? "" : id);
    const found = payables.find((p) => p.id === id);
    if (found) {
      setSupplierId(found.supplierId || "");
      setPayeeName(found.payeeName || (found as any).supplier?.name || "");
      if (Number(found.outstandingAmount) > 0) {
        setAmount(String(found.outstandingAmount));
      }
    }
  };

  // Determine authoritative active payable
  const activePayable = isPayableLocked
    ? initialPayable || (defaultPayableId ? payables.find((p) => p.id === defaultPayableId) : null)
    : payables.find((p) => p.id === payableId);

  const isLocked = Boolean(isPayableLocked && activePayable);
  const isSettled = isLocked && Number(activePayable?.outstandingAmount || 0) <= 0;
  const isCancelled = isLocked && activePayable?.status === "CANCELLED";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSettled) {
      toast.error("Cannot record disbursement: this payable is already fully settled.");
      return;
    }

    if (isCancelled) {
      toast.error("Cannot record disbursement: this payable has been cancelled.");
      return;
    }

    const effectivePayee =
      payeeName.trim() ||
      activePayable?.payeeName ||
      (suppliers.find((s) => s.id === supplierId)?.name || "");

    if (!supplierId && !effectivePayee) {
      toast.error("Please select a supplier or enter a payee name.");
      return;
    }

    if (!isValidDecimal(amount, { min: 0.01 })) {
      toast.error("Please enter a valid positive disbursement amount.");
      return;
    }

    const numAmount = Number(amount);
    if (activePayable) {
      const currentOutstanding = Number(activePayable.outstandingAmount);
      if (numAmount > currentOutstanding + 0.001) {
        toast.error(
          `Payment amount cannot exceed the outstanding payable of ${formatCurrency(
            currentOutstanding
          )}.`
        );
        return;
      }
    }

    setLoading(true);
    try {
      await financeClient.recordSupplierPayment({
        supplierId: supplierId || activePayable?.supplierId || null,
        payeeName: effectivePayee || null,
        payableId: payableId || activePayable?.id || null,
        amount: numAmount,
        currency: "INR",
        paymentMethod,
        paymentDate: new Date(paymentDate).toISOString(),
        referenceNumber: referenceNumber || null,
        paidBy: paidBy || null,
        notes: notes || null,
      });

      toast.success("Payable disbursement recorded!");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to record disbursement."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-lg p-3 sm:p-5 gap-2.5 sm:gap-4 max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
        <DialogHeader className="gap-0.5 pb-0">
          <DialogTitle className="text-sm sm:text-base font-semibold">
            Record Payable Disbursement
          </DialogTitle>
          <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">
            {isLocked
              ? `Log payment against ${activePayable?.payableNumber || "selected payable"}.`
              : "Log outgoing payment to hotel, fleet operator, or vendor."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3 pt-1">
          {/* Context-Locked Payable Summary */}
          {isLocked && activePayable ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-medium leading-none">
                <span className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1">
                  <Lock className="h-3 w-3 text-slate-500" />
                  Linked Payable
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                  {activePayable.serviceType || "SERVICE"}
                </span>
              </div>
              <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/90 text-xs space-y-1">
                <div className="flex flex-wrap sm:flex-nowrap items-baseline justify-between gap-1 sm:gap-2">
                  <span className="font-bold text-slate-900 truncate">
                    {activePayable.payableNumber || "PAYABLE"} • {activePayable.payeeName || (activePayable as any).supplier?.name || "Vendor"}
                  </span>
                  <span className="shrink-0 font-bold text-emerald-700 dark:text-emerald-400">
                    Due: {formatCurrency(Number(activePayable.outstandingAmount || 0))}
                  </span>
                </div>
                {activePayable.description && (
                  <p className="text-[11px] text-slate-500 truncate">
                    {activePayable.description}
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Open Payable selection (Global Payments/Finance Flow) */
            <div className="space-y-1">
              <Label className="text-[11px] font-medium leading-none">Link to Payable (Optional)</Label>
              <Select
                value={payableId || "none"}
                onValueChange={(val) => handlePayableChange(val || "")}
                disabled={loadingData}
              >
                <SelectTrigger className="text-xs h-8 px-2.5">
                  <SelectValue placeholder="Choose Payable (or Direct)">
                    {(val: string | null) => {
                      if (!val || val === "none") return "Direct Payment (No Payable Selected)";
                      const p = payables.find((item) => item.id === val);
                      const name = p?.payeeName || (p as any)?.supplier?.name || "Vendor";
                      return p
                        ? `${p.payableNumber} — ${name} (${p.serviceType}, Due: ${formatCurrency(
                            Number(p.outstandingAmount)
                          )})`
                        : val;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Direct Payment (No Payable Selected)</SelectItem>
                  {payables.map((p) => {
                    const name = p.payeeName || (p as any).supplier?.name || "Vendor";
                    return (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.payableNumber} — {name} ({p.serviceType}, Due: {formatCurrency(
                          Number(p.outstandingAmount)
                        )})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Stale / Settled / Cancelled Warning Banners */}
          {isSettled && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-[11px] text-emerald-900">Payable Fully Settled</p>
                <p className="text-[10.5px] text-emerald-700 leading-tight">
                  This payable has ₹0.00 outstanding and is completely settled. No further disbursements are required.
                </p>
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-[11px] text-rose-900">Payable Cancelled</p>
                <p className="text-[10.5px] text-rose-700 leading-tight">
                  This payable was cancelled and cannot accept disbursements.
                </p>
              </div>
            </div>
          )}

          {/* Supplier / Payee Selection (Only rendered in Global non-locked mode) */}
          {!isLocked && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div className="space-y-1 min-w-0">
                <Label className="text-[11px] font-medium leading-none truncate block">Catalogue Supplier</Label>
                <Select
                  value={supplierId || "none"}
                  onValueChange={(val) => {
                    const sId = !val || val === "none" ? "" : val;
                    setSupplierId(sId);
                    if (sId) {
                      const sup = suppliers.find((s) => s.id === sId);
                      if (sup) setPayeeName(sup.name);
                    }
                  }}
                  disabled={loadingData}
                >
                  <SelectTrigger className="text-xs h-8 px-2 min-w-0">
                    <SelectValue placeholder="Optional">
                      {(val: string | null) => {
                        if (!val || val === "none") return "No Supplier";
                        const s = suppliers.find((item) => item.id === val);
                        return s ? s.name : val;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Catalogue Supplier</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {s.name} ({s.type || "Vendor"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 min-w-0">
                <Label className="text-[11px] font-medium leading-none truncate block">Payee Name *</Label>
                <Input
                  placeholder="e.g. ABC Hotel"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  className="text-xs h-8 px-2 min-w-0"
                  required={!supplierId}
                />
              </div>
            </div>
          )}

          {/* Amount & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] font-medium leading-none truncate block">
                Amount (₹) *
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSettled || isCancelled}
                className="text-xs h-8 px-2 min-w-0 font-medium"
                required
              />
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] font-medium leading-none truncate block">Payment Method *</Label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => {
                  if (val) setPaymentMethod(val as PaymentMethod);
                }}
                disabled={isSettled || isCancelled}
              >
                <SelectTrigger className="text-xs h-8 px-2 min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentMethod.BANK_TRANSFER}>Bank Transfer</SelectItem>
                  <SelectItem value={PaymentMethod.UPI}>UPI / QR</SelectItem>
                  <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                  <SelectItem value={PaymentMethod.CHEQUE}>Cheque</SelectItem>
                  <SelectItem value={PaymentMethod.OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] font-medium leading-none truncate block">Payment Date *</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={isSettled || isCancelled}
                className="text-xs h-8 px-2 min-w-0"
                required
              />
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] font-medium leading-none truncate block">Bank UTR / Ref</Label>
              <Input
                placeholder="UTR / Ref #"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                disabled={isSettled || isCancelled}
                className="text-xs h-8 px-2 min-w-0"
              />
            </div>
          </div>

          {/* Paid By & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] font-medium leading-none truncate block">Disbursed By</Label>
              <Input
                placeholder="Staff / Account"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                disabled={isSettled || isCancelled}
                className="text-xs h-8 px-2 min-w-0"
              />
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-[11px] font-medium leading-none truncate block">Remarks (Optional)</Label>
              <Input
                placeholder="Notes / Voucher #"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSettled || isCancelled}
                className="text-xs h-8 px-2 min-w-0"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 flex flex-row gap-2 border-t mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs h-8 flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs h-8 flex-1"
              disabled={loading || isSettled || isCancelled}
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isSettled ? "Settled" : isCancelled ? "Cancelled" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
