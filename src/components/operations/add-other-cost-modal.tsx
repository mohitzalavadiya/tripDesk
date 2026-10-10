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
import { financeClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/utils";
import { Loader2, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";

interface AddOtherCostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripOperationId?: string;
  bookingId?: string | null;
  onSuccess?: () => void;
}

export function AddOtherCostModal({
  open,
  onOpenChange,
  tripId,
  tripOperationId,
  bookingId,
  onSuccess,
}: AddOtherCostModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [payeeName, setPayeeName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const resetForm = () => {
    setPayeeName("");
    setDescription("");
    setAmount("");
    setDueDate("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!payeeName.trim()) {
      toast.error("Please enter a payee or vendor name.");
      return;
    }

    if (!description.trim()) {
      toast.error("Please enter a cost description.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0.");
      return;
    }

    setLoading(true);
    try {
      await financeClient.createSupplierPayable({
        tripId,
        tripOperationId: tripOperationId || undefined,
        bookingId: bookingId || undefined,
        payeeName: payeeName.trim(),
        description: description.trim(),
        actualAmount: numAmount,
        plannedAmount: numAmount,
        currency: "INR",
        origin: "MANUAL",
        serviceType: "MANUAL",
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        notes: notes ? notes.trim() : undefined,
      });

      toast.success("Other cost added successfully!");
      resetForm();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to add other cost."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Receipt className="h-4 w-4 text-indigo-600" />
            Add Other Cost
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Record a service obligation or expense for this tour (e.g. Local Guide, Permits, Tolls, Monument Entries).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="payeeName" className="text-xs font-semibold">
              Payee / Service Vendor <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="payeeName"
              placeholder="e.g. Ramesh Guide, Forest Entry Office"
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold">
              Description <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="description"
              placeholder="e.g. City Palace Guide & Tolls"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-semibold">
                Amount (₹) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                placeholder="₹ 0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dueDate" className="text-xs font-semibold">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold">
              Internal Remarks (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g. Direct cash payment after tour completion"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs resize-none h-18"
            />
          </div>

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs cursor-pointer w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Cost
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
