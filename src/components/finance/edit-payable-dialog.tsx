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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SupplierPayableStatus } from "@prisma/client";
import { financeClient } from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import { getErrorMessage } from "@/lib/utils";
import { Loader2, Info } from "lucide-react";
import { toast } from "sonner";

interface EditPayableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payableId?: string | null;
  payable?: any | null;
  onSuccess?: () => void;
}

export function EditPayableDialog({
  open,
  onOpenChange,
  payableId,
  payable: initialPayable,
  onSuccess,
}: EditPayableDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [currentPayable, setCurrentPayable] = React.useState<any | null>(initialPayable);
  const [payeeName, setPayeeName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [actualAmount, setActualAmount] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [status, setStatus] = React.useState<SupplierPayableStatus>(SupplierPayableStatus.PENDING);
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      if (initialPayable) {
        setCurrentPayable(initialPayable);
        populateFields(initialPayable);
      } else if (payableId) {
        financeClient.getSupplierPayableById(payableId)
          .then((res) => {
            if (res.data) {
              setCurrentPayable(res.data);
              populateFields(res.data);
            }
          })
          .catch(() => toast.error("Failed to load payable details."));
      }
    }
  }, [open, payableId, initialPayable]);

  const populateFields = (p: any) => {
    setPayeeName(p.payeeName || p.supplier?.name || "");
    setDescription(p.description || "");
    setActualAmount(String(p.actualAmount || 0));
    setDueDate(p.dueDate ? new Date(p.dueDate).toISOString().slice(0, 10) : "");
    setStatus(p.status || SupplierPayableStatus.PENDING);
    setNotes(p.notes || "");
  };

  if (!currentPayable) return null;

  const planned = Number(currentPayable.plannedAmount || 0);
  const currentActual = parseFloat(actualAmount) || 0;
  const paid = Number(currentPayable.paidAmount || 0);
  const isDiff = Math.abs(currentActual - planned) > 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.error("Please enter a description.");
      return;
    }
    const numAmount = parseFloat(actualAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0.");
      return;
    }
    if (numAmount < paid - 0.001) {
      toast.error(`Payable amount cannot be less than the amount already paid of ${formatCurrency(paid)}.`);
      return;
    }

    setLoading(true);
    try {
      await financeClient.updateSupplierPayable(currentPayable.id, {
        payeeName: payeeName.trim() || undefined,
        description: description.trim(),
        actualAmount: numAmount,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        status,
        notes: notes ? notes.trim() : null,
      });

      toast.success("Payable updated successfully!");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to update payable."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Edit Payable Obligation
          </DialogTitle>
          <DialogDescription className="text-xs">
            Modify current payable amount, payee details, or payment schedule.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Metadata banner */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between items-center text-slate-500">
              <span>Payable #: <strong className="text-slate-900">{currentPayable.payableNumber}</strong></span>
              <span>Origin: <strong className="text-indigo-600 uppercase">{currentPayable.origin || "AUTOMATIC"}</strong></span>
            </div>
            <div className="flex justify-between items-center text-slate-500 pt-0.5">
              <span>Original Generated: <strong>{formatCurrency(planned)}</strong></span>
              <span>Paid so far: <strong className="text-emerald-700">{formatCurrency(paid)}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payee Name */}
            <div className="space-y-1.5">
              <Label htmlFor="editPayeeName" className="text-xs">
                Payee Name *
              </Label>
              <Input
                id="editPayeeName"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                className="h-9 text-xs font-medium"
                required
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="editStatus" className="text-xs">
                Payable Status
              </Label>
              <Select value={status} onValueChange={(val) => setStatus(val as SupplierPayableStatus)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SupplierPayableStatus.PENDING} className="text-xs">Pending / Open</SelectItem>
                  <SelectItem value={SupplierPayableStatus.PARTIALLY_PAID} className="text-xs">Partially Paid</SelectItem>
                  <SelectItem value={SupplierPayableStatus.PAID} className="text-xs">Paid in Full</SelectItem>
                  <SelectItem value={SupplierPayableStatus.CANCELLED} className="text-xs">Cancelled / Voided</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="editDescription" className="text-xs">
              Description *
            </Label>
            <Input
              id="editDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Current Payable Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="editAmount" className="text-xs">
                Current Payable Amount (₹) *
              </Label>
              <Input
                id="editAmount"
                type="number"
                step="0.01"
                min="0"
                value={actualAmount}
                onChange={(e) => setActualAmount(e.target.value)}
                className="h-9 text-xs font-bold text-slate-900"
                required
              />
              {isDiff && (
                <p className="text-[11px] text-amber-700 flex items-center gap-1 mt-0.5">
                  <Info className="h-3 w-3 inline" />
                  Adjusted from {formatCurrency(planned)} (Diff: {formatCurrency(currentActual - planned)})
                </p>
              )}
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label htmlFor="editDueDate" className="text-xs">
                Payment Due Date
              </Label>
              <Input
                id="editDueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="editNotes" className="text-xs">
              Internal Remarks (Optional)
            </Label>
            <Textarea
              id="editNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs resize-none"
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs w-full sm:w-auto"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
