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
      <DialogContent className="w-[calc(100%-1rem)] max-w-lg p-3 sm:p-5 gap-2.5 sm:gap-4 max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
        <DialogHeader className="gap-0.5 pb-0">
          <DialogTitle className="text-sm sm:text-base font-semibold">
            Create Manual Payable
          </DialogTitle>
          <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">
            Log an operational financial obligation owed to a vendor or provider.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3 pt-1">
          {/* Link Type Selector */}
          {!defaultTripId && !defaultBookingId && (
            <div className="space-y-1">
              <Label className="text-[11px] font-medium leading-none">Attach To *</Label>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setLinkType("TRIP")}
                  className={`py-1.5 px-1.5 sm:px-2 text-[11px] sm:text-xs font-semibold rounded-lg border text-center truncate transition-all ${
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
                  className={`py-1.5 px-1.5 sm:px-2 text-[11px] sm:text-xs font-semibold rounded-lg border text-center truncate transition-all ${
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
            <div className="space-y-1">
              <Label className="text-[11px] font-medium leading-none">Select Trip *</Label>
              <Select value={tripId} onValueChange={(val) => setTripId(val || "")}>
                <SelectTrigger className="h-8 text-xs px-2.5">
                  <SelectValue placeholder="Choose a trip...">
                    {(val: string | null) => {
                      if (!val) return "Choose a trip...";
                      const t = trips.find((item) => item.id === val);
                      return t
                        ? `${t.tripNumber || "TRIP"} — ${t.title || "Untitled"} (${t.customer?.name || "Client"})`
                        : "Choose a trip...";
                    }}
                  </SelectValue>
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
            <div className="space-y-1">
              <Label className="text-[11px] font-medium leading-none">Select Booking *</Label>
              <Select value={bookingId} onValueChange={(val) => setBookingId(val || "")}>
                <SelectTrigger className="h-8 text-xs px-2.5">
                  <SelectValue placeholder="Choose a confirmed booking...">
                    {(val: string | null) => {
                      if (!val) return "Choose a confirmed booking...";
                      const b = bookings.find((item) => item.id === val);
                      return b
                        ? `#${b.bookingNumber} — ${b.customer?.name || "Client"} (${b.trip?.title || "Trip"})`
                        : "Choose a confirmed booking...";
                    }}
                  </SelectValue>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            {/* Payee Name */}
            <div className="space-y-1 min-w-0">
              <Label htmlFor="payeeName" className="text-[11px] font-medium leading-none truncate block">
                Payee / Vendor *
              </Label>
              <Input
                id="payeeName"
                placeholder="e.g. Heritage Hotel"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                className="h-8 text-xs px-2 min-w-0"
                required
              />
            </div>

            {/* Service Type */}
            <div className="space-y-1 min-w-0">
              <Label htmlFor="serviceType" className="text-[11px] font-medium leading-none truncate block">
                Category
              </Label>
              <Select value={serviceType} onValueChange={(val) => setServiceType(val || "MANUAL")}>
                <SelectTrigger className="h-8 text-xs px-2 min-w-0">
                  <SelectValue>
                    {(val: string | null) => {
                      switch (val) {
                        case "MANUAL":
                          return "General Provider";
                        case "HOTEL":
                          return "Hotel / Stay";
                        case "VEHICLE":
                          return "Vehicle / Fleet";
                        case "GUIDE":
                          return "Local Guide";
                        case "OTHER":
                          return "Other Operational";
                        default:
                          return val || "General Provider";
                      }
                    }}
                  </SelectValue>
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
          <div className="space-y-1 min-w-0">
            <Label htmlFor="description" className="text-[11px] font-medium leading-none truncate block">
              Obligation Description *
            </Label>
            <Input
              id="description"
              placeholder="e.g. 2 Days local sightseeing guide in Udaipur"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-8 text-xs px-2 min-w-0"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
            {/* Amount */}
            <div className="space-y-1 min-w-0">
              <Label htmlFor="amount" className="text-[11px] font-medium leading-none truncate block">
                Amount (₹) *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-8 text-xs px-2 min-w-0 font-medium"
                required
              />
            </div>

            {/* Due Date */}
            <div className="space-y-1 min-w-0">
              <Label htmlFor="dueDate" className="text-[11px] font-medium leading-none truncate block">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 text-xs px-2 min-w-0"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1 min-w-0">
            <Label htmlFor="notes" className="text-[11px] font-medium leading-none truncate block">
              Internal Remarks (Optional)
            </Label>
            <Input
              id="notes"
              placeholder="Bank details, terms, or contact person..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-xs px-2 min-w-0"
            />
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
              disabled={loading || loadingContext}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs h-8 flex-1"
            >
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
