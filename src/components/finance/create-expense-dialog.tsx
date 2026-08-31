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
import { ExpenseCategory } from "@prisma/client";
import { financeClient, bookingClient, BookingWithRelations } from "@/lib/api-client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBookingId?: string;
  onSuccess?: () => void;
}

export function CreateExpenseDialog({
  open,
  onOpenChange,
  defaultBookingId,
  onSuccess,
}: CreateExpenseDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [bookings, setBookings] = React.useState<BookingWithRelations[]>([]);
  const [loadingBookings, setLoadingBookings] = React.useState(false);

  const [bookingId, setBookingId] = React.useState(defaultBookingId || "");
  const [category, setCategory] = React.useState<ExpenseCategory>(ExpenseCategory.FUEL);
  const [amount, setAmount] = React.useState("");
  const [expenseDate, setExpenseDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = React.useState("");
  const [receiptNumber, setReceiptNumber] = React.useState("");
  const [paidBy, setPaidBy] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setLoadingBookings(true);
      bookingClient
        .getBookings({ limit: 100 })
        .then((res) => {
          setBookings(res.data || []);
          if (defaultBookingId) setBookingId(defaultBookingId);
        })
        .catch(() => toast.error("Failed to load bookings."))
        .finally(() => setLoadingBookings(false));
    }
  }, [open, defaultBookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid positive expense amount.");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required.");
      return;
    }

    setLoading(true);
    try {
      const selectedB = bookings.find((b) => b.id === bookingId);
      await financeClient.createExpense({
        bookingId: bookingId || null,
        tripId: selectedB?.tripId || null,
        category,
        amount: numAmount,
        currency: "INR",
        expenseDate: new Date(expenseDate).toISOString(),
        description,
        receiptNumber: receiptNumber || null,
        paidBy: paidBy || null,
      });

      toast.success("Operational expense logged!");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to log expense.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Log Operational Expense
          </DialogTitle>
          <DialogDescription className="text-xs">
            Record on-tour operational costs (fuel, toll, parking, meals, driver allowances).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Link to Booking (Optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Link to Booking / Tour (Optional)</Label>
            <Select
              value={bookingId}
              onValueChange={(val) => {
                if (val) setBookingId(val);
              }}
              disabled={loadingBookings}
            >
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="General Operations (No Booking)">
                  {(val: string | null) => {
                    if (!val || val === "general") return "General Operations / Overhead";
                    const b = bookings.find((item) => item.id === val);
                    return b ? `${b.bookingNumber} — ${b.trip?.title || "Tour"} (${b.customer?.name || "Customer"})` : val;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Operations / Overhead</SelectItem>
                {bookings.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {b.bookingNumber} — {b.trip?.title || "Tour"} ({b.customer?.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category & Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Category *</Label>
              <Select
                value={category}
                onValueChange={(val) => {
                  if (val) setCategory(val as ExpenseCategory);
                }}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ExpenseCategory.FUEL}>Fuel / Petrol / Diesel</SelectItem>
                  <SelectItem value={ExpenseCategory.TOLL}>Toll Tax</SelectItem>
                  <SelectItem value={ExpenseCategory.PARKING}>Parking Charges</SelectItem>
                  <SelectItem value={ExpenseCategory.DRIVER_ALLOWANCE}>Driver Allowance / Batta</SelectItem>
                  <SelectItem value={ExpenseCategory.MEALS}>Meals / Refreshments</SelectItem>
                  <SelectItem value={ExpenseCategory.EMERGENCY}>Emergency / Repairs</SelectItem>
                  <SelectItem value={ExpenseCategory.ACTIVITY}>Entry Tickets / Guide</SelectItem>
                  <SelectItem value={ExpenseCategory.MISCELLANEOUS}>Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                placeholder="e.g. 2400"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>
          </div>

          {/* Date & Receipt */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Expense Date *</Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Receipt / Bill #</Label>
              <Input
                placeholder="e.g. BILL-9988"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description *</Label>
            <Input
              placeholder="e.g. Diesel refill at Manali Highway IOCL pump"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          {/* Paid By */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Paid By (Driver / Coordinator)</Label>
            <Input
              placeholder="e.g. Chauffeur Ramesh Kumar"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="text-xs h-9"
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
              Save Expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
