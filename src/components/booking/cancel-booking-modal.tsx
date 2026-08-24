"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Booking } from "@/types";
import { useBooking } from "@/context/booking-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";
import { X, AlertOctagon, IndianRupee, RotateCcw } from "lucide-react";

interface CancelBookingModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
}

const cancelSchema = Yup.object({
  reason: Yup.string().required("Cancellation reason is required"),
  cancellationCharges: Yup.number()
    .min(0, "Charges cannot be negative")
    .required("Charges required"),
  notes: Yup.string().optional(),
});

export function CancelBookingModal({
  booking,
  isOpen,
  onClose,
}: CancelBookingModalProps) {
  const { cancelBooking } = useBooking();

  const formik = useFormik({
    initialValues: {
      reason: "Customer requested trip cancellation",
      cancellationCharges: 0,
      notes: "",
    },
    validationSchema: cancelSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      try {
        cancelBooking(
          booking.id,
          values.reason.trim(),
          Number(values.cancellationCharges),
          values.notes.trim() || undefined
        );

        toast.success(
          `Booking ${booking.bookingNumber} has been marked as Cancelled.`
        );
        onClose();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Failed to cancel booking"
        );
      }
    },
  });

  if (!isOpen) return null;

  const charges = Number(formik.values.cancellationCharges) || 0;
  const calculatedRefund = Math.max(0, booking.paidAmount - charges);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center font-bold text-sm">
              <AlertOctagon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Cancel Booking?</h3>
              <p className="text-xs text-slate-500 font-mono">
                {booking.bookingNumber} • {booking.customerSnapshot.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Financial Refund Breakdown Card */}
        <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3.5 space-y-2.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-semibold">Total Amount Collected:</span>
            <span className="font-bold text-emerald-700">{formatCurrency(booking.paidAmount)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-600 font-semibold">Cancellation Retention Charges:</span>
            <span className="font-bold text-rose-600">- {formatCurrency(charges)}</span>
          </div>
          <div className="border-t border-rose-200/60 pt-2 flex justify-between text-xs font-bold">
            <span className="text-slate-800 flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5 text-indigo-600" />
              Calculated Customer Refund:
            </span>
            <span className="text-indigo-700 text-sm font-black">
              {formatCurrency(calculatedRefund)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Customer cancelled trip due to emergency"
              {...formik.getFieldProps("reason")}
              className="h-9.5 text-xs font-medium"
            />
          </div>

          {/* Cancellation Charges */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Cancellation Fee / Non-refundable Deductions (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="number"
                placeholder="0"
                {...formik.getFieldProps("cancellationCharges")}
                className="pl-9 h-9.5 text-xs font-semibold"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Enter hotel/supplier retention fees to be deducted from customer payments.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Audit Notes</label>
            <Textarea
              placeholder="e.g. Flight cancelled, DMC agreed to 50% waiver"
              rows={2}
              {...formik.getFieldProps("notes")}
              className="text-xs min-h-[60px]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              Back
            </Button>
            <Button
              type="submit"
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9 px-5 cursor-pointer shadow-xs"
            >
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
