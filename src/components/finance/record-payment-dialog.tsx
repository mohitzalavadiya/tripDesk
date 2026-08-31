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
import { PaymentMethod, PaymentType } from "@prisma/client";
import { financeClient, bookingClient, BookingWithRelations } from "@/lib/api-client";
import { formatCurrency } from "@/lib/costing-engine";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBookingId?: string;
  onSuccess?: () => void;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  defaultBookingId,
  onSuccess,
}: RecordPaymentDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [bookings, setBookings] = React.useState<BookingWithRelations[]>([]);
  const [loadingBookings, setLoadingBookings] = React.useState(false);

  const [bookingId, setBookingId] = React.useState(defaultBookingId || "");
  const [amount, setAmount] = React.useState("");
  const [paymentType, setPaymentType] = React.useState<PaymentType>(PaymentType.PARTIAL);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>(PaymentMethod.UPI);
  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [receiptNumber, setReceiptNumber] = React.useState("");
  const [receivedBy, setReceivedBy] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Fetch active bookings for dropdown
  React.useEffect(() => {
    if (open) {
      setLoadingBookings(true);
      bookingClient
        .getBookings({ limit: 100 })
        .then((res) => {
          setBookings(res.data || []);
          if (defaultBookingId) {
            setBookingId(defaultBookingId);
            const found = res.data?.find((b) => b.id === defaultBookingId);
            if (found && Number(found.balanceAmount) > 0) {
              setAmount(String(found.balanceAmount));
            }
          }
        })
        .catch((err) => toast.error("Failed to load bookings"))
        .finally(() => setLoadingBookings(false));
    }
  }, [open, defaultBookingId]);

  const selectedBooking = bookings.find((b) => b.id === bookingId);

  const handleBookingChange = (id: string) => {
    setBookingId(id);
    const b = bookings.find((item) => item.id === id);
    if (b && Number(b.balanceAmount) > 0) {
      setAmount(String(b.balanceAmount));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) {
      toast.error("Please select a booking.");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid positive payment amount.");
      return;
    }

    setLoading(true);
    try {
      await financeClient.recordCustomerPayment({
        bookingId,
        amount: numAmount,
        paymentType,
        paymentMethod,
        paymentDate: new Date(paymentDate).toISOString(),
        referenceNumber: referenceNumber || null,
        receiptNumber: receiptNumber || null,
        receivedBy: receivedBy || null,
        notes: notes || null,
      });

      toast.success("Payment recorded successfully!");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Record Customer Payment
          </DialogTitle>
          <DialogDescription className="text-xs">
            Log an incoming traveler payment with automated booking balance calculation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Select Booking */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Select Booking *</Label>
            <Select
              value={bookingId}
              onValueChange={(val) => {
                if (val) handleBookingChange(val);
              }}
              disabled={loadingBookings}
            >
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder={loadingBookings ? "Loading bookings..." : "Choose Booking"}>
                  {(val: string | null) => {
                    if (!val) return undefined;
                    const b = bookings.find((item) => item.id === val);
                    return b ? `${b.bookingNumber} — ${b.customer?.name || "Customer"} (Bal: ${formatCurrency(Number(b.balanceAmount))})` : val;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {bookings.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">
                    {b.bookingNumber} — {b.customer?.name || "Customer"} (Bal: {formatCurrency(Number(b.balanceAmount))})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Booking Info Box */}
          {selectedBooking && (
            <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Value:</span>
                <span className="font-semibold">{formatCurrency(Number(selectedBooking.totalAmount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already Paid:</span>
                <span className="text-emerald-600 font-semibold">{formatCurrency(Number(selectedBooking.paidAmount))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining Balance:</span>
                <span className="text-amber-600 font-bold">{formatCurrency(Number(selectedBooking.balanceAmount))}</span>
              </div>
            </div>
          )}

          {/* Amount & Payment Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Amount (₹) *</Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                placeholder="e.g. 25000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Payment Type *</Label>
              <Select
                value={paymentType}
                onValueChange={(val) => {
                  if (val) setPaymentType(val as PaymentType);
                }}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PaymentType.ADVANCE}>Advance Payment</SelectItem>
                  <SelectItem value={PaymentType.PARTIAL}>Partial Installment</SelectItem>
                  <SelectItem value={PaymentType.FINAL}>Final Settlement</SelectItem>
                  <SelectItem value={PaymentType.ADJUSTMENT}>Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-3">
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
                  <SelectItem value={PaymentMethod.UPI}>UPI / QR</SelectItem>
                  <SelectItem value={PaymentMethod.BANK_TRANSFER}>Bank Transfer (NEFT/IMPS)</SelectItem>
                  <SelectItem value={PaymentMethod.CASH}>Cash</SelectItem>
                  <SelectItem value={PaymentMethod.CARD}>Credit / Debit Card</SelectItem>
                  <SelectItem value={PaymentMethod.CHEQUE}>Cheque</SelectItem>
                  <SelectItem value={PaymentMethod.OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
          </div>

          {/* Reference & Received By */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reference / UTR #</Label>
              <Input
                placeholder="e.g. UPI/1234567890"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Received By (Staff)</Label>
              <Input
                placeholder="e.g. Mohit Zalavadiya"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notes / Remarks</Label>
            <Textarea
              placeholder="Add payment notes or receipts comments..."
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
              Save Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
