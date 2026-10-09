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
import { financeClient, tripClient, bookingClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isValidDecimal } from "@/lib/validation/field-validators";

interface RecordPayableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTripId?: string;
  defaultBookingId?: string;
  onSuccess?: () => void;
}

export function RecordPayableDialog({
  open,
  onOpenChange,
  defaultTripId,
  defaultBookingId,
  onSuccess,
}: RecordPayableDialogProps) {
  const [loading, setLoading] = React.useState(false);
  const [trips, setTrips] = React.useState<any[]>([]);
  const [bookings, setBookings] = React.useState<any[]>([]);
  const [loadingContext, setLoadingContext] = React.useState(false);

  const [linkType, setLinkType] = React.useState<"TRIP" | "BOOKING">(
    defaultBookingId ? "BOOKING" : "TRIP"
  );
  const [tripId, setTripId] = React.useState(defaultTripId || "");
  const [bookingId, setBookingId] = React.useState(defaultBookingId || "");
  const [payeeName, setPayeeName] = React.useState("");
  const [serviceType, setServiceType] = React.useState("MANUAL");
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      if (defaultBookingId) {
        setLinkType("BOOKING");
        setBookingId(defaultBookingId);
      } else if (defaultTripId) {
        setLinkType("TRIP");
        setTripId(defaultTripId);
      }

      setLoadingContext(true);
      Promise.all([
        tripClient.getTrips({ limit: 100 }),
        bookingClient.getBookings({ limit: 100 }),
      ])
        .then(([tRes, bRes]) => {
          setTrips(tRes.data || []);
          setBookings(bRes.data || []);
        })
        .catch(() => {})
        .finally(() => setLoadingContext(false));
    }
  }, [open, defaultTripId, defaultBookingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!payeeName.trim()) {
      toast.error("Please enter a Payee Name.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description for this obligation.");
      return;
    }
    if (!isValidDecimal(amount, { min: 0.01 })) {
      toast.error("Please enter a valid positive payable amount.");
      return;
    }
    const numAmount = Number(amount);

    if (linkType === "TRIP" && !tripId && !defaultTripId) {
      toast.error("Please select an associated Trip.");
      return;
    }
    if (linkType === "BOOKING" && !bookingId && !defaultBookingId) {
      toast.error("Please select an associated Booking.");
      return;
    }

    setLoading(true);
    try {
      const selectedBooking = bookings.find((b) => b.id === (bookingId || defaultBookingId));
      const targetTripId =
        linkType === "TRIP"
          ? tripId || defaultTripId || null
          : selectedBooking?.tripId || tripId || defaultTripId || null;

      await financeClient.createSupplierPayable({
        payeeName: payeeName.trim(),
        origin: "MANUAL",
        serviceType: serviceType || "MANUAL",
        description: description.trim(),
        currency: "INR",
        plannedAmount: numAmount,
        actualAmount: numAmount,
        tripId: targetTripId,
        bookingId: linkType === "BOOKING" ? bookingId || defaultBookingId || null : null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        notes: notes ? notes.trim() : null,
      });

      toast.success("Payable obligation created successfully!");
      onOpenChange(false);
      // Reset form
      setPayeeName("");
      setDescription("");
      setAmount("");
      setDueDate("");
      setNotes("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(getErrorMessage(err, "Failed to create payable."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Create Manual Payable
          </DialogTitle>
          <DialogDescription className="text-xs">
            Log an operational financial obligation owed to a hotel, vendor, guide, or service provider.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Link Type Selector */}
          {!defaultTripId && !defaultBookingId && (
            <div className="space-y-1.5">
              <Label className="text-xs">Attach To *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLinkType("TRIP")}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                    linkType === "TRIP"
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700 ring-2 ring-indigo-500/10"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Trip Level
                </button>
                <button
                  type="button"
                  onClick={() => setLinkType("BOOKING")}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                    linkType === "BOOKING"
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700 ring-2 ring-indigo-500/10"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Booking Level
                </button>
              </div>
            </div>
          )}

          {/* Context Selector */}
          {linkType === "TRIP" && !defaultTripId && (
            <div className="space-y-1.5">
              <Label className="text-xs">Select Trip *</Label>
              <Select value={tripId} onValueChange={(val) => setTripId(val || "")}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose a trip..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {trips.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.tripNumber} — {t.title} ({t.customer?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {linkType === "BOOKING" && !defaultBookingId && (
            <div className="space-y-1.5">
              <Label className="text-xs">Select Booking *</Label>
              <Select value={bookingId} onValueChange={(val) => setBookingId(val || "")}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose a confirmed booking..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {bookings.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      #{b.bookingNumber} — {b.customer?.name} ({b.trip?.title})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Payee Name */}
            <div className="space-y-1.5">
              <Label htmlFor="payeeName" className="text-xs">
                Payee / Vendor Name *
              </Label>
              <Input
                id="payeeName"
                placeholder="e.g. Rajesh Kumar, Heritage Hotel"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Service Type */}
            <div className="space-y-1.5">
              <Label htmlFor="serviceType" className="text-xs">
                Service Category
              </Label>
              <Select value={serviceType} onValueChange={(val) => setServiceType(val || "MANUAL")}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL" className="text-xs">General Provider</SelectItem>
                  <SelectItem value="HOTEL" className="text-xs">Hotel / Stay</SelectItem>
                  <SelectItem value="VEHICLE" className="text-xs">Vehicle / Fleet</SelectItem>
                  <SelectItem value="GUIDE" className="text-xs">Local Guide</SelectItem>
                  <SelectItem value="OTHER" className="text-xs">Other Operational</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">
              Obligation Description *
            </Label>
            <Input
              id="description"
              placeholder="e.g. 2 Days local sightseeing guide in Udaipur"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs">
                Payable Amount (₹) *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9 text-xs font-medium"
                required
              />
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label htmlFor="dueDate" className="text-xs">
                Payment Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">
              Internal Remarks (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Bank details, payment terms, or contact person details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs resize-none"
              rows={2}
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
            <Button
              type="submit"
              size="sm"
              disabled={loading || loadingContext}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Create Payable
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
