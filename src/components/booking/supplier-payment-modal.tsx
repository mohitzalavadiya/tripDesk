"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { Booking, BookingItem, PaymentMethod } from "@/types";
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
import { X, Truck, IndianRupee, Calendar, Hash } from "lucide-react";

interface SupplierPaymentModalProps {
  booking: Booking;
  preselectedItem?: BookingItem;
  isOpen: boolean;
  onClose: () => void;
}

const supplierPaymentSchema = Yup.object({
  supplierName: Yup.string().required("Supplier is required"),
  amount: Yup.number()
    .required("Amount is required")
    .positive("Amount must be greater than 0"),
  date: Yup.string().required("Date is required"),
  method: Yup.string().required("Payment method is required"),
  transactionId: Yup.string().optional(),
  notes: Yup.string().optional(),
});

export function SupplierPaymentModal({
  booking,
  preselectedItem,
  isOpen,
  onClose,
}: SupplierPaymentModalProps) {
  const { addSupplierPayment } = useBooking();

  const suppliersList = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    booking.items.forEach((item) => {
      if (item.supplierName) {
        map.set(item.supplierId || item.supplierName, {
          id: item.supplierId || `sup_${item.id}`,
          name: item.supplierName,
        });
      }
    });
    return Array.from(map.values());
  }, [booking.items]);

  const formik = useFormik({
    initialValues: {
      supplierId: preselectedItem?.supplierId || suppliersList[0]?.id || "",
      supplierName: preselectedItem?.supplierName || suppliersList[0]?.name || "",
      bookingItemId: preselectedItem?.id || "",
      itemTitle: preselectedItem?.title || "",
      amount: preselectedItem?.supplierCost || 10000,
      date: new Date().toISOString().split("T")[0],
      method: "Bank Transfer" as PaymentMethod,
      transactionId: "",
      notes: "",
    },
    validationSchema: supplierPaymentSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      try {
        addSupplierPayment(booking.id, {
          supplierId: values.supplierId,
          supplierName: values.supplierName,
          bookingItemId: values.bookingItemId || undefined,
          itemTitle: values.itemTitle || undefined,
          amount: Number(values.amount),
          date: values.date,
          method: values.method as PaymentMethod,
          transactionId: values.transactionId.trim() || undefined,
          notes: values.notes.trim() || undefined,
        });

        toast.success(
          `Supplier payment of ${formatCurrency(
            Number(values.amount)
          )} to ${values.supplierName} recorded!`
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center font-bold text-sm">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Record Supplier Payable Payment</h3>
              <p className="text-xs text-slate-500 font-mono">
                {booking.bookingNumber} • Internal Payable
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

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          {/* Supplier Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Supplier Partner / Vendor <span className="text-red-500">*</span>
            </label>
            <Select
              value={formik.values.supplierName}
              onValueChange={(val) => {
                const matched = suppliersList.find((s) => s.name === val);
                formik.setFieldValue("supplierName", val || "");
                formik.setFieldValue("supplierId", matched?.id || "");
              }}
            >
              <SelectTrigger className="h-9.5 text-xs font-medium">
                <SelectValue placeholder="Select Supplier" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                {suppliersList.map((sup) => (
                  <SelectItem key={sup.id} value={sup.name}>
                    {sup.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Amount Paid (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  placeholder="e.g. 15000"
                  {...formik.getFieldProps("amount")}
                  className="pl-9 h-9.5 text-xs font-semibold"
                />
              </div>
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
                  <SelectItem value="Bank Transfer">Bank Transfer (NEFT / RTGS)</SelectItem>
                  <SelectItem value="UPI">UPI Transfer</SelectItem>
                  <SelectItem value="Card">Corporate Card</SelectItem>
                  <SelectItem value="Cash">Cash Voucher</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transaction ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Bank UTR / Ref Number
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="e.g. NEFT/SBIN881923"
                  {...formik.getFieldProps("transactionId")}
                  className="pl-9 h-9.5 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Internal Operational Notes</label>
            <Textarea
              placeholder="e.g. 50% room retention advance or driver fuel allowance"
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-9 px-5 cursor-pointer shadow-xs"
            >
              Record Supplier Payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
