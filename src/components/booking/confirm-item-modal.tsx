"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { BookingItem, BookingItemStatus } from "@/types";
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
import { toast } from "sonner";
import { X, CheckCircle2, Hotel, Car, Ticket, Calendar, Hash, Phone, User } from "lucide-react";

interface ConfirmItemModalProps {
  bookingId: string;
  item: BookingItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const itemConfirmSchema = Yup.object({
  status: Yup.string().required("Status is required"),
  confirmationNumber: Yup.string().optional(),
  confirmationDate: Yup.string().optional(),
  driverName: Yup.string().optional(),
  driverPhone: Yup.string().optional(),
  notes: Yup.string().optional(),
});

export function ConfirmItemModal({
  bookingId,
  item,
  isOpen,
  onClose,
}: ConfirmItemModalProps) {
  const { updateBookingItem } = useBooking();

  const formik = useFormik({
    initialValues: {
      status: item?.status || ("Confirmed" as BookingItemStatus),
      confirmationNumber: item?.confirmationNumber || "",
      confirmationDate: item?.confirmationDate || new Date().toISOString().split("T")[0],
      driverName: item?.driverName || "",
      driverPhone: item?.driverPhone || "",
      notes: item?.notes || "",
    },
    validationSchema: itemConfirmSchema,
    enableReinitialize: true,
    onSubmit: (values) => {
      if (!item) return;

      try {
        updateBookingItem(bookingId, item.id, {
          status: values.status as BookingItemStatus,
          confirmationNumber: values.confirmationNumber.trim() || undefined,
          confirmationDate: values.confirmationDate || undefined,
          driverName: values.driverName.trim() || undefined,
          driverPhone: values.driverPhone.trim() || undefined,
          notes: values.notes.trim() || undefined,
        });

        toast.success(
          `${item.title} updated to ${values.status}!`
        );
        onClose();
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update item"
        );
      }
    },
  });

  if (!isOpen || !item) return null;

  const IconComponent =
    item.type === "Hotel" ? Hotel : item.type === "Vehicle" ? Car : Ticket;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center font-bold text-sm">
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Manage Service Confirmation</h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[280px]">
                {item.title} ({item.type})
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

        {/* Item Summary Details */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400 font-semibold">Service:</span>
            <span className="font-bold text-slate-800">{item.title}</span>
          </div>
          {item.subtitle && (
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Details:</span>
              <span className="text-slate-600 font-medium">{item.subtitle}</span>
            </div>
          )}
          {item.supplierName && (
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Supplier Partner:</span>
              <span className="font-bold text-indigo-600">{item.supplierName}</span>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          {/* Status Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Booking Item Status <span className="text-red-500">*</span>
            </label>
            <Select
              value={formik.values.status}
              onValueChange={(val) => formik.setFieldValue("status", val)}
            >
              <SelectTrigger className="h-9.5 text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200">
                <SelectItem value="Confirmed">✓ Confirmed (Supplier has blocked & confirmed)</SelectItem>
                <SelectItem value="Requested">⏳ Requested (Sent to supplier, awaiting confirmation)</SelectItem>
                <SelectItem value="Pending">⚠️ Pending (Not yet sent to supplier)</SelectItem>
                <SelectItem value="Cancelled">✕ Cancelled / Released</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Confirmation Number & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Supplier Confirmation ID / Ref #
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={
                    item.type === "Hotel"
                      ? "e.g. HTL-458921"
                      : item.type === "Vehicle"
                      ? "e.g. CAB-9981"
                      : "e.g. ACT-2201"
                  }
                  {...formik.getFieldProps("confirmationNumber")}
                  className="pl-9 h-9.5 text-xs font-mono font-bold uppercase"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Confirmation Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  {...formik.getFieldProps("confirmationDate")}
                  className="pl-9 h-9.5 text-xs font-medium"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Specific: Driver Details */}
          {item.type === "Vehicle" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 border-t border-slate-100 pt-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Assigned Driver Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="e.g. Rajesh Kumar"
                    {...formik.getFieldProps("driverName")}
                    className="pl-9 h-9.5 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Driver Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="e.g. +91 94471 22334"
                    {...formik.getFieldProps("driverPhone")}
                    className="pl-9 h-9.5 text-xs font-mono font-medium"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Confirmation Notes / Remarks</label>
            <Textarea
              placeholder="e.g. Interconnecting rooms confirmed on ground floor or driver reporting at terminal 1"
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
              Save Confirmation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
