"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { ConfirmationStatus } from "@prisma/client";
import { operationsClient, HotelConfirmationWithDetails } from "@/lib/api-client";
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
import {
  X,
  Hotel,
  CheckCircle2,
  AlertTriangle,
  CalendarClock,
  Send,
  Loader2,
  Calendar,
  Building,
  Tag,
  FileText,
} from "lucide-react";

export type HotelDialogMode = "REQUEST" | "CONFIRM" | "AMEND" | "CANCEL";

interface HotelConfirmationDialogProps {
  operationId: string;
  hotelConfirmation: HotelConfirmationWithDetails | null;
  mode: HotelDialogMode;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function HotelConfirmationDialog({
  operationId,
  hotelConfirmation,
  mode,
  isOpen,
  onClose,
  onSuccess,
}: HotelConfirmationDialogProps) {
  const [loading, setLoading] = React.useState(false);

  const hotelName =
    hotelConfirmation?.tripHotel?.hotel?.name ||
    "Hotel Accommodation";
  const destination =
    hotelConfirmation?.tripHotel?.hotel?.city ||
    "Destination";
  const plannedRoom =
    hotelConfirmation?.tripHotel?.roomType || "Standard Room";
  const plannedMeal =
    hotelConfirmation?.tripHotel?.mealPlan || "EPAI";

  const formik = useFormik({
    initialValues: {
      confirmationNumber: hotelConfirmation?.confirmationNumber || "",
      roomDetails: hotelConfirmation?.roomDetails || plannedRoom,
      mealPlan: hotelConfirmation?.mealPlan || plannedMeal,
      supplierNotes:
        hotelConfirmation?.supplierNotes ||
        (mode === "REQUEST"
          ? "Booking confirmation request sent to reservations desk."
          : mode === "AMEND"
          ? "Amended room requirements / schedule requested with hotel."
          : mode === "CANCEL"
          ? "Booking cancelled per customer / operations request."
          : ""),
      confirmedAt: new Date().toISOString().split("T")[0],
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (mode === "CONFIRM" && !values.confirmationNumber?.trim()) {
        errors.confirmationNumber = "Confirmation / Voucher number is required";
      }
      if (mode === "CANCEL" && !values.supplierNotes?.trim()) {
        errors.supplierNotes = "Please provide a reason for cancellation";
      }
      return errors;
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!hotelConfirmation || !operationId) return;

      try {
        setLoading(true);

        let targetStatus: ConfirmationStatus = hotelConfirmation.status;
        let successMessage = "Hotel confirmation updated.";

        if (mode === "REQUEST") {
          targetStatus = ConfirmationStatus.REQUESTED;
          successMessage = `Confirmation requested for ${hotelName}. Status updated to REQUESTED.`;
        } else if (mode === "CONFIRM") {
          targetStatus = ConfirmationStatus.CONFIRMED;
          successMessage = `Hotel ${hotelName} confirmed! Voucher #${values.confirmationNumber}`;
        } else if (mode === "AMEND") {
          targetStatus = ConfirmationStatus.AMENDED;
          successMessage = `Hotel ${hotelName} marked as AMENDED with revised details.`;
        } else if (mode === "CANCEL") {
          targetStatus = ConfirmationStatus.CANCELLED;
          successMessage = `Hotel booking for ${hotelName} cancelled.`;
        }

        await operationsClient.updateHotelConfirmation(
          operationId,
          hotelConfirmation.id,
          {
            confirmationNumber: values.confirmationNumber.trim() || undefined,
            status: targetStatus,
            roomDetails: values.roomDetails?.trim() || undefined,
            mealPlan: values.mealPlan?.trim() || undefined,
            supplierNotes: values.supplierNotes?.trim() || undefined,
            confirmedAt:
              targetStatus === ConfirmationStatus.CONFIRMED
                ? new Date(values.confirmedAt)
                : undefined,
          }
        );

        toast.success(successMessage);
        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        toast.error(err.message || "Failed to update hotel confirmation.");
      } finally {
        setLoading(false);
      }
    },
  });

  if (!isOpen || !hotelConfirmation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-9 w-9 rounded-xl border flex items-center justify-center font-bold text-sm ${
                mode === "CONFIRM"
                  ? "bg-emerald-50 border-emerald-200/80 text-emerald-600"
                  : mode === "REQUEST"
                  ? "bg-blue-50 border-blue-200/80 text-blue-600"
                  : mode === "AMEND"
                  ? "bg-amber-50 border-amber-200/80 text-amber-600"
                  : "bg-rose-50 border-rose-200/80 text-rose-600"
              }`}
            >
              {mode === "CONFIRM" && <CheckCircle2 className="h-5 w-5" />}
              {mode === "REQUEST" && <Send className="h-5 w-5" />}
              {mode === "AMEND" && <CalendarClock className="h-5 w-5" />}
              {mode === "CANCEL" && <AlertTriangle className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {mode === "REQUEST" && "Request Supplier Confirmation"}
                {mode === "CONFIRM" && "Confirm Hotel Booking"}
                {mode === "AMEND" && "Amend Hotel Details"}
                {mode === "CANCEL" && "Cancel Hotel Booking"}
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-[280px]">
                {hotelName} • {destination}
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

        {/* Schedule & Stay Summary */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-500">Dates:</span>
            <span className="font-bold text-slate-800">
              {hotelConfirmation.checkIn
                ? new Date(hotelConfirmation.checkIn).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "TBD"}{" "}
              →{" "}
              {hotelConfirmation.checkOut
                ? new Date(hotelConfirmation.checkOut).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "TBD"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-500">Planned Room & Meal:</span>
            <span className="font-bold text-slate-800">
              {plannedRoom} ({plannedMeal})
            </span>
          </div>

          {hotelConfirmation.supplier && (
            <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
              <span className="font-semibold text-slate-500">Supplier:</span>
              <span className="font-semibold text-indigo-600">
                {hotelConfirmation.supplier.name}
              </span>
            </div>
          )}
        </div>

        {/* Cancellation Alert Warning */}
        {mode === "CANCEL" && (
          <div className="bg-rose-50 border border-rose-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">
                Are you sure you want to cancel this hotel booking?
              </span>
              <p className="text-rose-700 text-[11px] mt-0.5">
                The status will change to <strong>CANCELLED</strong>. The record and history will remain in the operations timeline for full auditing.
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={formik.handleSubmit} className="space-y-4">
          {/* Confirmation Number / Voucher */}
          {(mode === "CONFIRM" || mode === "AMEND") && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Hotel Confirmation / Voucher # {mode === "CONFIRM" && <span className="text-red-500">*</span>}
              </label>
              <Input
                placeholder="e.g. HTL-CONF-98124 / TAJ-RES-8821"
                {...formik.getFieldProps("confirmationNumber")}
                className="h-9.5 text-xs font-mono font-bold uppercase tracking-wider"
              />
              {formik.touched.confirmationNumber && formik.errors.confirmationNumber && (
                <p className="text-[11px] text-red-500">{formik.errors.confirmationNumber}</p>
              )}
            </div>
          )}

          {/* Room Details & Meal Plan in Edit / Amend Modes */}
          {(mode === "CONFIRM" || mode === "AMEND") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Room Details / Category</label>
                <Input
                  placeholder="e.g. Deluxe Lake View Room (1 Room)"
                  {...formik.getFieldProps("roomDetails")}
                  className="h-9.5 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Meal Plan</label>
                <Input
                  placeholder="e.g. CP (Breakfast) / MAP (Breakfast + Dinner)"
                  {...formik.getFieldProps("mealPlan")}
                  className="h-9.5 text-xs"
                />
              </div>
            </div>
          )}

          {/* Supplier Notes / Instructions */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              {mode === "CANCEL" ? (
                <>Cancellation Reason & Notes <span className="text-red-500">*</span></>
              ) : (
                "Supplier Notes & Reservation Remarks"
              )}
            </label>
            <Textarea
              rows={3}
              placeholder={
                mode === "REQUEST"
                  ? "Enter booking request instructions for the reservations team..."
                  : mode === "CANCEL"
                  ? "State the reason for cancelling this accommodation..."
                  : "Add any special requests, early check-in notes, or voucher details..."
              }
              {...formik.getFieldProps("supplierNotes")}
              className="text-xs min-h-[75px]"
            />
            {formik.touched.supplierNotes && formik.errors.supplierNotes && (
              <p className="text-[11px] text-red-500">{formik.errors.supplierNotes}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              Back / Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
              className={`text-white text-xs font-bold h-9 px-5 cursor-pointer shadow-xs ${
                mode === "CONFIRM"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : mode === "REQUEST"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : mode === "AMEND"
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : mode === "CONFIRM" ? (
                "Save & Confirm Hotel"
              ) : mode === "REQUEST" ? (
                "Mark as Requested"
              ) : mode === "AMEND" ? (
                "Save Amendments"
              ) : (
                "Confirm Cancellation"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
