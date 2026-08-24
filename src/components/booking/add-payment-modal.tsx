"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Booking, PaymentMethod } from "@/types";
import { useBooking } from "@/context/booking-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/costing-engine";
import { toast } from "sonner";
import { X, IndianRupee, CreditCard, Calendar, Hash, FileText } from "lucide-react";

interface AddPaymentModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
}

const paymentValidationSchema = Yup.object({
  amount: Yup.number()
    .required("Amount is required")
    .positive("Amount must be greater than 0"),
  date: Yup.string().required("Date is required"),
  method: Yup.string().required("Payment method is required"),
  transactionId: Yup.string().optional(),
  notes: Yup.string().optional(),
});

export function AddPaymentModal({
  booking,
  isOpen,
  onClose,
}: AddPaymentModalProps) {
  const { addCustomerPayment } = useBooking();

  const formik = useFormik({
    initialValues: {
      amount: booking.pendingAmount > 0 ? booking.pendingAmount : 10000,
      date: new Date().toISOString().split("T")[0],
      method: "UPI" as PaymentMethod,
      transactionId: "",
      notes: "",
    },
    validationSchema: paymentValidationSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      try {
        addCustomerPayment(booking.id, {
          amount: Number(values.amount),
          date: values.date,
          method: values.method as PaymentMethod,
          transactionId: values.transactionId.trim() || undefined,
          notes: values.notes.trim() || undefined,
        });

        toast.success(
          `Payment of ${formatCurrency(
            Number(values.amount)
          )} recorded successfully!`
        );
        onClose();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Failed to record payment"
        );
      }
    },
  });

  if (!isOpen) return null;

  const fieldError = (field: keyof typeof formik.values) => {
    return formik.touched[field] && formik.errors[field]
      ? formik.errors[field]
      : undefined;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center font-bold text-sm">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Record Customer Payment</h3>
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

        {/* Current Balances Header */}
        <div className="grid grid-cols-3 gap-2.5 bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Package</span>
            <span className="text-xs font-bold text-slate-900">{formatCurrency(booking.totalAmount)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Already Paid</span>
            <span className="text-xs font-bold text-emerald-600">{formatCurrency(booking.paidAmount)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Outstanding</span>
            <span className="text-xs font-bold text-amber-600">{formatCurrency(booking.pendingAmount)}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  placeholder="e.g. 20000"
                  {...formik.getFieldProps("amount")}
                  className={`pl-9 h-9.5 text-xs font-semibold ${
                    fieldError("amount") ? "border-rose-500" : ""
                  }`}
                />
              </div>
              {fieldError("amount") && (
                <p className="text-[11px] text-rose-500 font-medium">{fieldError("amount")}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  {...formik.getFieldProps("date")}
                  className="pl-9 h-9.5 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <Select
                value={formik.values.method}
                onValueChange={(val) => formik.setFieldValue("method", val)}
              >
                <SelectTrigger className="h-9.5 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  <SelectItem value="UPI">UPI (GPay / PhonePe / Paytm)</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer (NEFT / IMPS / RTGS)</SelectItem>
                  <SelectItem value="Card">Debit / Credit Card</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Other">Other Mode</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Reference / UTR / Txn ID
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="e.g. UPI/2026/8812903"
                  {...formik.getFieldProps("transactionId")}
                  className="pl-9 h-9.5 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Notes / Remarks</label>
            <Textarea
              placeholder="e.g. Advance deposit for flight & hotel confirmation"
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
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 px-5 cursor-pointer shadow-xs"
            >
              Record Payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
